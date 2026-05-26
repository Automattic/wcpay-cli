import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { ENV_KEYRING, getConfigDir } from './config.js';
import { CliError } from './errors.js';
import { readJsonFile, writeJsonFile } from './fs.js';
const execFileAsync = promisify(execFile);
const SERVICE_NAME = 'wcpay-cli';
const DEFAULT_AUTH_FILE = { version: 1, credentials: {} };
const defaultRunner = async (command, args, options = {}) => execFileAsync(command, args, {
    ...(options.input !== undefined ? { input: options.input } : {}),
    encoding: 'utf8',
});
export class FileSecretStore {
    env;
    constructor(env = process.env) {
        this.env = env;
    }
    async get(ref) {
        const file = await this.readAuthFile();
        return file.credentials[ref];
    }
    async set(ref, credentials) {
        validateCredentials(credentials);
        const file = await this.readAuthFile();
        file.credentials[ref] = credentials;
        await this.writeAuthFile(file);
    }
    async delete(ref) {
        const file = await this.readAuthFile();
        delete file.credentials[ref];
        await this.writeAuthFile(file);
    }
    getPath() {
        return join(getConfigDir(this.env), 'auth.json');
    }
    async readAuthFile() {
        return readJsonFile(this.getPath(), DEFAULT_AUTH_FILE);
    }
    async writeAuthFile(file) {
        await writeJsonFile(this.getPath(), file, 0o600);
    }
}
export class MacOSKeychainSecretStore {
    runner;
    constructor(runner = defaultRunner) {
        this.runner = runner;
    }
    async get(ref) {
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
        }
        catch (error) {
            if (isNotFoundError(error)) {
                return undefined;
            }
            throw error;
        }
    }
    async set(ref, credentials) {
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
    async delete(ref) {
        try {
            await this.runner('security', [
                'delete-generic-password',
                '-a',
                ref,
                '-s',
                SERVICE_NAME,
            ]);
        }
        catch (error) {
            if (!isNotFoundError(error)) {
                throw error;
            }
        }
    }
}
export class SecretToolSecretStore {
    runner;
    constructor(runner = defaultRunner) {
        this.runner = runner;
    }
    async get(ref) {
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
        }
        catch (error) {
            if (isNotFoundError(error)) {
                return undefined;
            }
            throw error;
        }
    }
    async set(ref, credentials) {
        validateCredentials(credentials);
        await this.runner('secret-tool', ['store', '--label', 'WooPayments CLI', 'service', SERVICE_NAME, 'account', ref], { input: JSON.stringify(credentials) });
    }
    async delete(ref) {
        try {
            await this.runner('secret-tool', ['clear', 'service', SERVICE_NAME, 'account', ref]);
        }
        catch (error) {
            if (!isNotFoundError(error)) {
                throw error;
            }
        }
    }
}
export class UnsupportedKeychainSecretStore {
    async get(_ref) {
        throw new Error('No supported OS keychain integration is available on this platform.');
    }
    async set(_ref, _credentials) {
        throw new Error('No supported OS keychain integration is available on this platform.');
    }
    async delete(_ref) {
        throw new Error('No supported OS keychain integration is available on this platform.');
    }
}
export class HelpfulKeychainSecretStore {
    keychain;
    constructor(keychain) {
        this.keychain = keychain;
    }
    async get(ref) {
        try {
            return await this.keychain.get(ref);
        }
        catch (error) {
            throw keychainUnavailableError(error);
        }
    }
    async set(ref, credentials) {
        try {
            await this.keychain.set(ref, credentials);
        }
        catch (error) {
            throw keychainUnavailableError(error);
        }
    }
    async delete(ref) {
        try {
            await this.keychain.delete(ref);
        }
        catch (error) {
            throw keychainUnavailableError(error);
        }
    }
}
export function createSecretStore(env = process.env, platform = process.platform) {
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
export function describeSecretStorage(env = process.env, platform = process.platform) {
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
export function validateCredentials(credentials) {
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
function parseCredentialsJson(json) {
    if (!json) {
        return undefined;
    }
    const parsed = JSON.parse(json);
    validateCredentials(parsed);
    return parsed;
}
function isKeyringDisabled(env) {
    return env[ENV_KEYRING] === '0' || env[ENV_KEYRING] === 'false';
}
function keychainUnavailableError(cause) {
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
function isNotFoundError(error) {
    if (!error || typeof error !== 'object') {
        return false;
    }
    const maybeError = error;
    return (maybeError.code === 'ENOENT' ||
        maybeError.code === 44 ||
        maybeError.status === 44 ||
        (typeof maybeError.stderr === 'string' &&
            /could not be found|No such secret|not found/i.test(maybeError.stderr)));
}
//# sourceMappingURL=secrets.js.map