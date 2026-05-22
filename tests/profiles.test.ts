import { mkdtemp, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { deriveProfileName, normalizeSiteUrl, ProfileStore } from '../src/core/profiles.js';
import {
	createSecretStore,
	describeSecretStorage,
	FileSecretStore,
	HelpfulKeychainSecretStore,
	MacOSKeychainSecretStore,
	type CommandRunner,
	type SecretStore,
	SecretToolSecretStore,
} from '../src/core/secrets.js';

async function testEnv(): Promise<NodeJS.ProcessEnv> {
	return { WCPAY_HOME: await mkdtemp(join(tmpdir(), 'wcpay-cli-')) } as NodeJS.ProcessEnv;
}

describe('normalizeSiteUrl', () => {
	it('normalizes trailing slashes', () => {
		expect(normalizeSiteUrl('https://example.com/')).toBe('https://example.com');
	});

	it('allows local http sites', () => {
		expect(normalizeSiteUrl('http://localhost:8082/')).toBe('http://localhost:8082');
	});

	it('rejects remote http sites', () => {
		expect(() => normalizeSiteUrl('http://example.com')).toThrow(
			'Refusing to store credentials'
		);
	});

	it('rejects remote http sites even with local opt-in', () => {
		expect(() => normalizeSiteUrl('http://example.com', { allowInsecureLocal: true })).toThrow(
			'Refusing to store credentials'
		);
	});

	it('requires explicit opt-in for http .local development stores', () => {
		expect(() => normalizeSiteUrl('http://store.local')).toThrow('--allow-insecure-local');
		expect(normalizeSiteUrl('http://store.local', { allowInsecureLocal: true })).toBe(
			'http://store.local'
		);
	});
});

describe('deriveProfileName', () => {
	it('derives a profile name from the hostname', () => {
		expect(deriveProfileName('https://store.example/path')).toBe('store.example');
	});
});

describe('ProfileStore', () => {
	it('stores profiles and default profile', async () => {
		const env = await testEnv();
		const store = new ProfileStore(env);
		const profile = await store.upsert({ name: 'local', siteUrl: 'http://localhost:8082' });

		expect(profile.name).toBe('local');
		expect(await store.list()).toHaveLength(1);
		expect((await store.setDefault('local')).siteUrl).toBe('http://localhost:8082');
		expect((await store.get()).name).toBe('local');
	});
});

describe('FileSecretStore', () => {
	it('stores and removes credentials', async () => {
		const env = await testEnv();
		const store = new FileSecretStore(env);
		await store.set('profile:local', {
			consumerKey: 'ck_test',
			consumerSecret: 'cs_test',
		});

		expect(await store.get('profile:local')).toEqual({
			consumerKey: 'ck_test',
			consumerSecret: 'cs_test',
		});

		await store.delete('profile:local');
		expect(await store.get('profile:local')).toBeUndefined();
	});

	it('does not share missing-file fallback state across config dirs', async () => {
		const firstEnv = await testEnv();
		const secondEnv = await testEnv();
		await new FileSecretStore(firstEnv).set('profile:first', {
			consumerKey: 'ck_test',
			consumerSecret: 'cs_test',
		});

		expect(await new FileSecretStore(secondEnv).get('profile:first')).toBeUndefined();
	});

	it('writes the auth file with user-only permissions', async () => {
		const env = await testEnv();
		await new FileSecretStore(env).set('profile:local', {
			consumerKey: 'ck_test',
			consumerSecret: 'cs_test',
		});

		const fileStat = await stat(join(env.WCPAY_HOME!, 'auth.json'));
		expect(fileStat.mode & 0o777).toBe(0o600);
	});
});

describe('MacOSKeychainSecretStore', () => {
	it('stores credentials using the security CLI', async () => {
		const calls: Array<{ command: string; args: string[] }> = [];
		const runner: CommandRunner = async (command, args) => {
			calls.push({ command, args });
			return { stdout: '', stderr: '' };
		};
		const store = new MacOSKeychainSecretStore(runner);

		await store.set('profile:local', { consumerKey: 'ck_test', consumerSecret: 'cs_test' });

		expect(calls[0].command).toBe('security');
		expect(calls[0].args).toContain('add-generic-password');
		expect(calls[0].args).toContain('profile:local');
	});

	it('reads credentials from the security CLI', async () => {
		const runner: CommandRunner = async () => ({
			stdout: JSON.stringify({ consumerKey: 'ck_test', consumerSecret: 'cs_test' }),
			stderr: '',
		});
		const store = new MacOSKeychainSecretStore(runner);

		expect(await store.get('profile:local')).toEqual({
			consumerKey: 'ck_test',
			consumerSecret: 'cs_test',
		});
	});
});

describe('SecretToolSecretStore', () => {
	it('stores credentials using secret-tool stdin', async () => {
		let input = '';
		const runner: CommandRunner = async (_command, _args, options) => {
			input = options?.input ?? '';
			return { stdout: '', stderr: '' };
		};
		const store = new SecretToolSecretStore(runner);

		await store.set('profile:local', { consumerKey: 'ck_test', consumerSecret: 'cs_test' });

		expect(JSON.parse(input)).toEqual({ consumerKey: 'ck_test', consumerSecret: 'cs_test' });
	});
});

describe('HelpfulKeychainSecretStore', () => {
	it('does not silently fall back when the keychain fails', async () => {
		const primary: SecretStore = {
			get: async () => {
				throw new Error('no keychain');
			},
			set: async () => {
				throw new Error('no keychain');
			},
			delete: async () => undefined,
		};
		const store = new HelpfulKeychainSecretStore(primary);

		await expect(
			store.set('profile:local', { consumerKey: 'ck_test', consumerSecret: 'cs_test' })
		).rejects.toMatchObject({ code: 'keychain_unavailable' });
	});

	it('does not include raw keychain error messages in JSON details', async () => {
		const primary: SecretStore = {
			get: async () => undefined,
			set: async () => {
				throw new Error('failed to save cs_test');
			},
			delete: async () => undefined,
		};
		const store = new HelpfulKeychainSecretStore(primary);

		try {
			await store.set('profile:local', { consumerKey: 'ck_test', consumerSecret: 'cs_test' });
			throw new Error('Expected set to fail');
		} catch (error) {
			expect(JSON.stringify(error)).not.toContain('cs_test');
		}
	});
});

describe('describeSecretStorage', () => {
	it('describes keychain and explicit file storage', () => {
		expect(describeSecretStorage({ WCPAY_KEYRING: '0' } as NodeJS.ProcessEnv, 'darwin')).toBe(
			'file storage'
		);
		expect(describeSecretStorage({} as NodeJS.ProcessEnv, 'darwin')).toBe('macOS Keychain');
		expect(describeSecretStorage({} as NodeJS.ProcessEnv, 'linux')).toBe(
			'Secret Service keyring'
		);
	});
});

describe('createSecretStore', () => {
	it('uses the file store when keyring is disabled', () => {
		expect(
			createSecretStore({ WCPAY_KEYRING: '0' } as NodeJS.ProcessEnv, 'darwin')
		).toBeInstanceOf(FileSecretStore);
	});

	it('does not silently fall back to file storage on unsupported platforms', async () => {
		const store = createSecretStore({} as NodeJS.ProcessEnv, 'win32');
		await expect(store.get('profile:local')).rejects.toMatchObject({
			code: 'keychain_unavailable',
		});
	});
});
