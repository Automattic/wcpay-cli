import { describe, expect, it } from 'vitest';
import { runBrowserAuth } from '../src/core/browser-auth.js';
import { CliError } from '../src/core/errors.js';

describe('runBrowserAuth', () => {
	it('starts browser auth, receives callback credentials, and validates state', async () => {
		let callbackUrl = '';
		let state = '';
		let openedUrl = '';

		const result = await runBrowserAuth({
			siteUrl: 'https://example.com',
			fetch: async (url, init) => {
				if (String(url).endsWith('/wp-json/wc/v3/payments/cli/token')) {
					const body = JSON.parse(String(init?.body));
					expect(body).toEqual({ code: 'code_123', state });
					return new Response(
						JSON.stringify({
							consumer_key: 'ck_browser',
							consumer_secret: 'cs_browser',
							key_id: '123',
						}),
						{ status: 200, headers: { 'Content-Type': 'application/json' } }
					);
				}

				const body = JSON.parse(String(init?.body));
				callbackUrl = body.callback_url;
				state = body.state;
				return new Response(
					JSON.stringify({ authorize_url: 'https://example.com/authorize' }),
					{
						status: 200,
						headers: { 'Content-Type': 'application/json' },
					}
				);
			},
			openBrowser: async (url) => {
				openedUrl = url;
				const callback = new URL(callbackUrl);
				callback.searchParams.set('success', '1');
				callback.searchParams.set('state', state);
				callback.searchParams.set('code', 'code_123');
				await fetch(callback);
			},
		});

		expect(openedUrl).toBe('https://example.com/authorize');
		expect(result).toEqual({
			credentials: { consumerKey: 'ck_browser', consumerSecret: 'cs_browser' },
			keyId: '123',
		});
	});

	it('reports browser auth as unavailable when the store lacks the endpoint', async () => {
		await expect(
			runBrowserAuth({
				siteUrl: 'https://example.com',
				fetch: async () => new Response('', { status: 404 }),
				openBrowser: async () => undefined,
			})
		).rejects.toMatchObject({ code: 'browser_auth_unavailable' } satisfies Partial<CliError>);
	});
});
