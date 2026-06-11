import { describe, expect, it } from 'vitest';
import { clientOptionsFromEnv, resolveCredentials } from '../src/core/context.js';
import type { Profile } from '../src/core/profiles.js';
import type { SecretStore } from '../src/core/secrets.js';

const profile: Profile = {
	name: 'local',
	siteUrl: 'https://example.com',
	allowInsecureLocal: false,
	auth: { type: 'woocommerce_api_key', secretRef: 'profile:local' },
	createdAt: '2026-05-20T00:00:00.000Z',
	updatedAt: '2026-05-20T00:00:00.000Z',
};

const emptyStore: SecretStore = {
	get: async () => undefined,
	set: async () => undefined,
	delete: async () => undefined,
};

describe('resolveCredentials', () => {
	it('validates credentials from environment variables', async () => {
		await expect(
			resolveCredentials(profile, emptyStore, {
				WCPAY_CONSUMER_KEY: 'not-a-key',
				WCPAY_CONSUMER_SECRET: 'cs_test',
			} as NodeJS.ProcessEnv)
		).rejects.toMatchObject({ code: 'invalid_consumer_key' });
	});

	it('returns credentials from environment variables before reading the secret store', async () => {
		await expect(
			resolveCredentials(profile, emptyStore, {
				WCPAY_CONSUMER_KEY: 'ck_test',
				WCPAY_CONSUMER_SECRET: 'cs_test',
			} as NodeJS.ProcessEnv)
		).resolves.toEqual({ consumerKey: 'ck_test', consumerSecret: 'cs_test' });
	});
});

describe('clientOptionsFromEnv', () => {
	it('reads WCPAY_TIMEOUT in seconds', () => {
		expect(clientOptionsFromEnv({ WCPAY_TIMEOUT: '60' } as NodeJS.ProcessEnv).timeoutMs).toBe(
			60000
		);
	});

	it('defaults to no override', () => {
		expect(clientOptionsFromEnv({} as NodeJS.ProcessEnv).timeoutMs).toBeUndefined();
	});

	it('rejects a non-numeric WCPAY_TIMEOUT', () => {
		expect(() => clientOptionsFromEnv({ WCPAY_TIMEOUT: 'soon' } as NodeJS.ProcessEnv)).toThrow(
			'WCPAY_TIMEOUT'
		);
	});

	it('enables the debug logger with WCPAY_DEBUG', () => {
		expect(clientOptionsFromEnv({ WCPAY_DEBUG: '1' } as NodeJS.ProcessEnv).logger).toBeTypeOf(
			'function'
		);
		expect(clientOptionsFromEnv({} as NodeJS.ProcessEnv).logger).toBeUndefined();
	});
});
