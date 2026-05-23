import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { spawn } from 'node:child_process';
import { CliError } from './errors.js';
import { buildRestUrl } from './api.js';
import type { WooCommerceApiCredentials } from './secrets.js';

export const BROWSER_AUTH_ENDPOINT = '/wc/v3/payments/cli/authorize';
export const BROWSER_AUTH_TOKEN_ENDPOINT = '/wc/v3/payments/cli/token';

export interface BrowserAuthOptions {
	siteUrl: string;
	profileName?: string;
	openBrowser?: (url: string) => Promise<void>;
	fetch?: typeof fetch;
	timeoutMs?: number;
}

export interface BrowserAuthResult {
	credentials: WooCommerceApiCredentials;
	keyId?: string;
}

interface BrowserAuthInitResponse {
	authorize_url?: unknown;
	expires_at?: unknown;
}

type CallbackResult =
	| {
			code: string;
	  }
	| {
			consumerKey: string;
			consumerSecret: string;
			keyId?: string;
	  };

export async function runBrowserAuth(options: BrowserAuthOptions): Promise<BrowserAuthResult> {
	const state = randomBytes(24).toString('hex');
	const callback = await createCallbackListener(state, options.timeoutMs ?? 5 * 60 * 1000);

	try {
		const init = await requestBrowserAuth({
			siteUrl: options.siteUrl,
			callbackUrl: callback.url,
			state,
			profileName: options.profileName,
			fetchImpl: options.fetch ?? fetch,
		});

		await (options.openBrowser ?? openUrl)(init.authorizeUrl);
		const result = await callback.result;
		const credentials =
			'code' in result
				? await exchangeBrowserAuthCode({
						siteUrl: options.siteUrl,
						code: result.code,
						state,
						fetchImpl: options.fetch ?? fetch,
					})
				: result;
		return {
			credentials: {
				consumerKey: credentials.consumerKey,
				consumerSecret: credentials.consumerSecret,
			},
			keyId: credentials.keyId,
		};
	} finally {
		await callback.close();
	}
}

async function requestBrowserAuth(options: {
	siteUrl: string;
	callbackUrl: string;
	state: string;
	profileName?: string;
	fetchImpl: typeof fetch;
}): Promise<{ authorizeUrl: string }> {
	const url = buildRestUrl(options.siteUrl, BROWSER_AUTH_ENDPOINT);
	let response: Response;
	try {
		response = await options.fetchImpl(url, {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json; charset=utf-8',
				'User-Agent': 'wcpay-cli/0.0.0',
			},
			body: JSON.stringify({
				app_name: 'WooPayments CLI',
				scope: 'read_write',
				state: options.state,
				callback_url: options.callbackUrl,
				profile_name: options.profileName,
			}),
		});
	} catch (error) {
		throw new CliError({
			code: 'browser_auth_unavailable',
			message: 'Browser login is not available for this store yet.',
			status: 2,
			details: { cause: error instanceof Error ? error.message : String(error) },
		});
	}

	if (response.status === 404 || response.status === 405) {
		throw new CliError({
			code: 'browser_auth_unavailable',
			message: 'Browser login is not available for this store yet.',
			status: response.status,
		});
	}

	const text = await response.text();
	const data = parseJson(text) as BrowserAuthInitResponse;
	if (!response.ok) {
		throw new CliError({
			code: 'browser_auth_start_failed',
			message:
				getErrorMessage(data) ??
				`Could not start browser login. Status ${response.status}.`,
			status: response.status,
			details: data,
		});
	}

	if (!data || typeof data.authorize_url !== 'string') {
		throw new CliError({
			code: 'browser_auth_invalid_response',
			message: 'The store returned an invalid browser login response.',
			status: 2,
			details: data,
		});
	}

	return { authorizeUrl: data.authorize_url };
}

async function exchangeBrowserAuthCode(options: {
	siteUrl: string;
	code: string;
	state: string;
	fetchImpl: typeof fetch;
}): Promise<{ consumerKey: string; consumerSecret: string; keyId?: string }> {
	const url = buildRestUrl(options.siteUrl, BROWSER_AUTH_TOKEN_ENDPOINT);
	const response = await options.fetchImpl(url, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json; charset=utf-8',
			'User-Agent': 'wcpay-cli/0.0.0',
		},
		body: JSON.stringify({ code: options.code, state: options.state }),
	});

	const text = await response.text();
	const data = parseJson(text);
	if (!response.ok) {
		throw new CliError({
			code: 'browser_auth_token_exchange_failed',
			message:
				getErrorMessage(data) ??
				`Could not finish browser login. Status ${response.status}.`,
			status: response.status,
			details: data,
		});
	}

	if (!isCredentialResponse(data)) {
		throw new CliError({
			code: 'browser_auth_invalid_token_response',
			message: 'The store returned an invalid browser login token response.',
			status: 2,
			details: data,
		});
	}

	return {
		consumerKey: data.consumer_key,
		consumerSecret: data.consumer_secret,
		keyId: typeof data.key_id === 'string' ? data.key_id : undefined,
	};
}

async function createCallbackListener(
	state: string,
	timeoutMs: number
): Promise<{
	url: string;
	result: Promise<CallbackResult>;
	close: () => Promise<void>;
}> {
	let resolveResult!: (value: CallbackResult) => void;
	let rejectResult!: (reason: unknown) => void;
	let completed = false;
	const result = new Promise<CallbackResult>((resolve, reject) => {
		resolveResult = resolve;
		rejectResult = reject;
	});

	const server = createServer((request, response) => {
		void handleCallback(request, response, state)
			.then((callbackResult) => {
				if (!completed) {
					completed = true;
					resolveResult(callbackResult);
				}
			})
			.catch((error) => {
				if (!completed) {
					completed = true;
					rejectResult(error);
				}
			});
	});

	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', () => resolve());
	});

	const address = server.address();
	if (!address || typeof address === 'string') {
		await closeServer(server);
		throw new CliError({
			code: 'browser_auth_callback_failed',
			message: 'Could not start local browser login callback server.',
			status: 2,
		});
	}

	const timeout = setTimeout(() => {
		if (!completed) {
			completed = true;
			rejectResult(
				new CliError({
					code: 'browser_auth_timeout',
					message: 'Timed out waiting for browser login to complete.',
					status: 2,
				})
			);
		}
	}, timeoutMs);
	timeout.unref();

	return {
		url: `http://127.0.0.1:${address.port}/callback`,
		result,
		close: async () => {
			clearTimeout(timeout);
			await closeServer(server);
		},
	};
}

async function handleCallback(
	request: IncomingMessage,
	response: ServerResponse,
	expectedState: string
): Promise<CallbackResult> {
	const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
	if (requestUrl.pathname !== '/callback') {
		response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
		response.end('Not found');
		throw new CliError({
			code: 'browser_auth_callback_not_found',
			message: 'Invalid browser login callback.',
			status: 404,
		});
	}

	const state = requestUrl.searchParams.get('state') ?? '';
	if (!safeEqual(state, expectedState)) {
		response.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
		response.end(
			'<h1>WooPayments CLI login failed</h1><p>Invalid login state. Return to the terminal and try again.</p>'
		);
		throw new CliError({
			code: 'browser_auth_state_mismatch',
			message: 'Browser login state did not match.',
			status: 2,
		});
	}

	if (requestUrl.searchParams.get('success') === '0' || requestUrl.searchParams.get('error')) {
		const message =
			requestUrl.searchParams.get('error_description') ??
			requestUrl.searchParams.get('error') ??
			'Browser login was denied.';
		response.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
		response.end(`<h1>WooPayments CLI login failed</h1><p>${escapeHtml(message)}</p>`);
		throw new CliError({ code: 'browser_auth_denied', message, status: 2 });
	}

	const code = requestUrl.searchParams.get('code');
	const consumerKey = requestUrl.searchParams.get('consumer_key');
	const consumerSecret = requestUrl.searchParams.get('consumer_secret');
	if (!code && (!consumerKey || !consumerSecret)) {
		response.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
		response.end(
			'<h1>WooPayments CLI login failed</h1><p>The store did not return a login code.</p>'
		);
		throw new CliError({
			code: 'browser_auth_missing_code',
			message: 'The browser login callback did not include a login code.',
			status: 2,
		});
	}

	response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
	response.end(
		'<h1>WooPayments CLI connected</h1><p>You can close this tab and return to your terminal.</p>'
	);

	if (code) {
		return { code };
	}

	return {
		consumerKey: consumerKey as string,
		consumerSecret: consumerSecret as string,
		keyId: requestUrl.searchParams.get('key_id') ?? undefined,
	};
}

async function openUrl(url: string): Promise<void> {
	const command =
		process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
	const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
	const child = spawn(command, args, { detached: true, stdio: 'ignore' });
	child.unref();
}

function closeServer(server: ReturnType<typeof createServer>): Promise<void> {
	return new Promise((resolve, reject) => {
		server.close((error) => (error ? reject(error) : resolve()));
	});
}

function parseJson(text: string): unknown {
	if (!text) {
		return null;
	}
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

function getErrorMessage(data: unknown): string | undefined {
	if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
		return data.message;
	}
	return undefined;
}

function isCredentialResponse(data: unknown): data is {
	consumer_key: string;
	consumer_secret: string;
	key_id?: unknown;
} {
	return (
		data !== null &&
		typeof data === 'object' &&
		'consumer_key' in data &&
		typeof data.consumer_key === 'string' &&
		'consumer_secret' in data &&
		typeof data.consumer_secret === 'string'
	);
}

function safeEqual(actual: string, expected: string): boolean {
	const actualBuffer = Buffer.from(actual);
	const expectedBuffer = Buffer.from(expected);
	return (
		actualBuffer.length === expectedBuffer.length &&
		timingSafeEqual(actualBuffer, expectedBuffer)
	);
}

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (char) => {
		const entities: Record<string, string> = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;',
		};
		return entities[char] ?? char;
	});
}
