import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { ENV_KEYRING, getConfigDir } from './config.js';
import { CliError } from './errors.js';
import { readJsonFile, writeJsonFile } from './fs.js';

const execFileAsync = promisify(execFile);
const SERVICE_NAME = 'wcpay-cli';

export interface WooCommerceApiCredentials {
	consumerKey: string;
	consumerSecret: string;
}

export interface SecretStore {
	get(ref: string): Promise<WooCommerceApiCredentials | undefined>;
	set(ref: string, credentials: WooCommerceApiCredentials): Promise<void>;
	delete(ref: string): Promise<void>;
}

export interface CommandRunner {
	(
		command: string,
		args: string[],
		options?: { input?: string }
	): Promise<{ stdout: string; stderr: string }>;
}

interface AuthFile {
	version: 1;
	credentials: Record<string, WooCommerceApiCredentials>;
}

const DEFAULT_AUTH_FILE: AuthFile = { version: 1, credentials: {} };

const defaultRunner: CommandRunner = async (command, args, options = {}) =>
	execFileAsync(command, args, {
		...(options.input !== undefined ? { input: options.input } : {}),
		encoding: 'utf8',
	});

export class FileSecretStore implements SecretStore {
	private readonly env: NodeJS.ProcessEnv;

	public constructor(env: NodeJS.ProcessEnv = process.env) {
		this.env = env;
	}

	public async get(ref: string): Promise<WooCommerceApiCredentials | undefined> {
		const file = await this.readAuthFile();
		return file.credentials[ref];
	}

	public async set(ref: string, credentials: WooCommerceApiCredentials): Promise<void> {
		validateCredentials(credentials);
		const file = await this.readAuthFile();
		file.credentials[ref] = credentials;
		await this.writeAuthFile(file);
	}

	public async delete(ref: string): Promise<void> {
		const file = await this.readAuthFile();
		delete file.credentials[ref];
		await this.writeAuthFile(file);
	}

	private getPath(): string {
		return join(getConfigDir(this.env), 'auth.json');
	}

	private async readAuthFile(): Promise<AuthFile> {
		return readJsonFile<AuthFile>(this.getPath(), DEFAULT_AUTH_FILE);
	}

	private async writeAuthFile(file: AuthFile): Promise<void> {
		await writeJsonFile(this.getPath(), file, 0o600);
	}
}

export class MacOSKeychainSecretStore implements SecretStore {
	public constructor(private readonly runner: CommandRunner = defaultRunner) {}

	public async get(ref: string): Promise<WooCommerceApiCredentials | undefined> {
		try {
			const result = await this.runner('security', [
				'find-generic-password',
				'-a',
				ref,
				'-s',
				SERVICE_NAME,
				'-w',
			]);
			return parseCredentialsJson(result.stdout.trim());
		} catch (error) {
			if (isNotFoundError(error)) {
				return undefined;
			}
			throw error;
		}
	}

	public async set(ref: string, credentials: WooCommerceApiCredentials): Promise<void> {
		validateCredentials(credentials);
		await this.runner('security', [
			'add-generic-password',
			'-a',
			ref,
			'-s',
			SERVICE_NAME,
			'-w',
			JSON.stringify(credentials),
			'-U',
		]);
	}

	public async delete(ref: string): Promise<void> {
		try {
			await this.runner('security', [
				'delete-generic-password',
				'-a',
				ref,
				'-s',
				SERVICE_NAME,
			]);
		} catch (error) {
			if (!isNotFoundError(error)) {
				throw error;
			}
		}
	}
}

export class SecretToolSecretStore implements SecretStore {
	public constructor(private readonly runner: CommandRunner = defaultRunner) {}

	public async get(ref: string): Promise<WooCommerceApiCredentials | undefined> {
		try {
			const result = await this.runner('secret-tool', [
				'lookup',
				'service',
				SERVICE_NAME,
				'account',
				ref,
			]);
			const value = result.stdout.trim();
			return value ? parseCredentialsJson(value) : undefined;
		} catch (error) {
			if (isNotFoundError(error)) {
				return undefined;
			}
			throw error;
		}
	}

	public async set(ref: string, credentials: WooCommerceApiCredentials): Promise<void> {
		validateCredentials(credentials);
		await this.runner(
			'secret-tool',
			['store', '--label', 'WooPayments CLI', 'service', SERVICE_NAME, 'account', ref],
			{ input: JSON.stringify(credentials) }
		);
	}

	public async delete(ref: string): Promise<void> {
		try {
			await this.runner('secret-tool', ['clear', 'service', SERVICE_NAME, 'account', ref]);
		} catch (error) {
			if (!isNotFoundError(error)) {
				throw error;
			}
		}
	}
}

export class UnsupportedKeychainSecretStore implements SecretStore {
	public async get(_ref: string): Promise<WooCommerceApiCredentials | undefined> {
		throw new Error('No supported OS keychain integration is available on this platform.');
	}

	public async set(_ref: string, _credentials: WooCommerceApiCredentials): Promise<void> {
		throw new Error('No supported OS keychain integration is available on this platform.');
	}

	public async delete(_ref: string): Promise<void> {
		throw new Error('No supported OS keychain integration is available on this platform.');
	}
}

export class HelpfulKeychainSecretStore implements SecretStore {
	public constructor(private readonly keychain: SecretStore) {}

	public async get(ref: string): Promise<WooCommerceApiCredentials | undefined> {
		try {
			return await this.keychain.get(ref);
		} catch (error) {
			throw keychainUnavailableError(error);
		}
	}

	public async set(ref: string, credentials: WooCommerceApiCredentials): Promise<void> {
		try {
			await this.keychain.set(ref, credentials);
		} catch (error) {
			throw keychainUnavailableError(error);
		}
	}

	public async delete(ref: string): Promise<void> {
		try {
			await this.keychain.delete(ref);
		} catch (error) {
			throw keychainUnavailableError(error);
		}
	}
}

export function createSecretStore(
	env: NodeJS.ProcessEnv = process.env,
	platform: NodeJS.Platform = process.platform
): SecretStore {
	if (isKeyringDisabled(env)) {
		return new FileSecretStore(env);
	}

	if (platform === 'darwin') {
		return new HelpfulKeychainSecretStore(new MacOSKeychainSecretStore());
	}

	if (platform === 'linux') {
		return new HelpfulKeychainSecretStore(new SecretToolSecretStore());
	}

	return new HelpfulKeychainSecretStore(new UnsupportedKeychainSecretStore());
}

export function describeSecretStorage(
	env: NodeJS.ProcessEnv = process.env,
	platform: NodeJS.Platform = process.platform
): string {
	if (isKeyringDisabled(env)) {
		return 'file storage';
	}
	if (platform === 'darwin') {
		return 'macOS Keychain';
	}
	if (platform === 'linux') {
		return 'Secret Service keyring';
	}
	return 'OS keychain';
}

export function validateCredentials(credentials: WooCommerceApiCredentials): void {
	if (!credentials.consumerKey.startsWith('ck_')) {
		throw new CliError({
			code: 'invalid_consumer_key',
			message: 'WooCommerce consumer keys should start with `ck_`.',
			status: 2,
		});
	}

	if (!credentials.consumerSecret.startsWith('cs_')) {
		throw new CliError({
			code: 'invalid_consumer_secret',
			message: 'WooCommerce consumer secrets should start with `cs_`.',
			status: 2,
		});
	}
}

function parseCredentialsJson(json: string): WooCommerceApiCredentials | undefined {
	if (!json) {
		return undefined;
	}
	const parsed = JSON.parse(json) as WooCommerceApiCredentials;
	validateCredentials(parsed);
	return parsed;
}

function isKeyringDisabled(env: NodeJS.ProcessEnv): boolean {
	return env[ENV_KEYRING] === '0' || env[ENV_KEYRING] === 'false';
}

function keychainUnavailableError(cause: unknown): CliError {
	return new CliError({
		code: 'keychain_unavailable',
		message: [
			'Could not access the OS keychain for WooPayments CLI credentials.',
			'To store credentials in ~/.config/wcpay/auth.json instead, rerun with WCPAY_KEYRING=0.',
			'That file will contain WooCommerce API credentials. Treat it like a secret.',
		].join(' '),
		status: 2,
		details: cause instanceof Error ? cause.name : 'unknown_error',
	});
}

function isNotFoundError(error: unknown): boolean {
	if (!error || typeof error !== 'object') {
		return false;
	}
	const maybeError = error as { code?: unknown; status?: unknown; stderr?: unknown };
	return (
		maybeError.code === 'ENOENT' ||
		maybeError.code === 44 ||
		maybeError.status === 44 ||
		(typeof maybeError.stderr === 'string' &&
			/could not be found|No such secret|not found/i.test(maybeError.stderr))
	);
}
