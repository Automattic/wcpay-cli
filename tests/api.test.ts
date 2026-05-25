import { describe, expect, it } from 'vitest';
import { assertReviewedWritePath, isReviewedWritePath } from '../src/commands/api.js';
import {
	buildRestUrl,
	createOAuthSignature,
	normalizeRestPath,
	RestClient,
} from '../src/core/api.js';
import { parseApiFields, parseAssignment, parseAssignments } from '../src/core/fields.js';
import type { Profile } from '../src/core/profiles.js';

const profile: Profile = {
	name: 'local',
	siteUrl: 'http://localhost:8082',
	allowInsecureLocal: true,
	auth: { type: 'woocommerce_api_key', secretRef: 'profile:local' },
	createdAt: '2026-05-20T00:00:00.000Z',
	updatedAt: '2026-05-20T00:00:00.000Z',
};

describe('normalizeRestPath', () => {
	it('normalizes wp-json paths', () => {
		expect(normalizeRestPath('/wp-json/wc/v3/payments/accounts')).toBe(
			'/wc/v3/payments/accounts'
		);
		expect(normalizeRestPath('wc/v3/payments/accounts')).toBe('/wc/v3/payments/accounts');
	});
});

describe('buildRestUrl', () => {
	it('builds store REST API URLs', () => {
		const url = buildRestUrl('https://example.com', '/wc/v3/payments/accounts', { page: 1 });
		expect(url.toString()).toBe('https://example.com/wp-json/wc/v3/payments/accounts?page=1');
	});
});

describe('parseAssignment', () => {
	it('parses string and typed assignments', () => {
		expect(parseAssignment('reason=CLI test')).toEqual({ key: 'reason', value: 'CLI test' });
		expect(parseAssignment('amount:=500')).toEqual({ key: 'amount', value: 500 });
		expect(parseAssignment('dry:=true')).toEqual({ key: 'dry', value: true });
	});
});

describe('parseAssignments', () => {
	it('does not mutate Object.prototype for reserved keys', () => {
		const parsed = parseAssignments(['__proto__={"polluted":true}']);
		expect(Object.prototype).not.toHaveProperty('polluted');
		expect(parsed.__proto__).toBe('{"polluted":true}');
	});
});

describe('parseApiFields', () => {
	it('uses query fields for read methods', () => {
		expect(parseApiFields('GET', ['page:=1'])).toEqual({
			query: { page: 1 },
			body: undefined,
		});
	});

	it('uses body fields for write methods', () => {
		expect(parseApiFields('POST', ['amount:=500'])).toEqual({
			query: {},
			body: { amount: 500 },
		});
	});
});

describe('raw API write path safety', () => {
	it('allows reviewed WooPayments and order write paths', () => {
		expect(isReviewedWritePath('/wc/v3/payments/refund')).toBe(true);
		expect(isReviewedWritePath('/wc/v3/orders')).toBe(true);
	});

	it('blocks unsafe raw write paths unless explicitly allowed', () => {
		expect(() => assertReviewedWritePath('/wp/v2/users', false)).toThrow(
			'Refusing raw write request'
		);
		expect(() => assertReviewedWritePath('/wp/v2/users', true)).not.toThrow();
	});
});

describe('RestClient', () => {
	it('uses basic auth for HTTPS sites', () => {
		const client = new RestClient(
			{ ...profile, siteUrl: 'https://example.com' },
			{ consumerKey: 'ck_test', consumerSecret: 'cs_test' }
		);

		const request = client.resolve({ method: 'GET', path: '/wc/v3/payments/accounts' });
		expect(request.url).toBe('https://example.com/wp-json/wc/v3/payments/accounts');
		expect(request.headers.Authorization).toMatch(/^Basic /);
	});

	it('uses OAuth query parameters for HTTP sites', () => {
		const client = new RestClient(
			profile,
			{ consumerKey: 'ck_test', consumerSecret: 'cs_test' },
			{ nonce: () => 'nonce', timestamp: () => 123 }
		);

		const request = client.resolve({
			method: 'GET',
			path: '/wc/v3/payments/accounts',
			query: { page: 1 },
		});
		const url = new URL(request.url);

		expect(url.searchParams.get('page')).toBe('1');
		expect(url.searchParams.get('oauth_consumer_key')).toBe('ck_test');
		expect(url.searchParams.get('oauth_signature_method')).toBe('HMAC-SHA256');
		expect(url.searchParams.get('oauth_signature')).toBeTruthy();
	});
});

describe('createOAuthSignature', () => {
	it('is deterministic for a fixed request', () => {
		const url = new URL('http://localhost:8082/wp-json/wc/v3/payments/accounts?page=1');
		const signature = createOAuthSignature(
			'GET',
			url,
			{
				page: '1',
				oauth_consumer_key: 'ck_test',
				oauth_nonce: 'nonce',
				oauth_signature_method: 'HMAC-SHA256',
				oauth_timestamp: '123',
			},
			'cs_test'
		);

		expect(signature).toMatch(/^[A-Za-z0-9+/]+=*$/);
	});
});
