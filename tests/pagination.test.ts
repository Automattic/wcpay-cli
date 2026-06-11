import { describe, expect, it, vi } from 'vitest';
import { RestClient } from '../src/core/api.js';
import { fetchAllPages } from '../src/core/pagination.js';
import type { Profile } from '../src/core/profiles.js';

const profile: Profile = {
	name: 'test',
	siteUrl: 'https://example.com',
	allowInsecureLocal: false,
	auth: { type: 'woocommerce_api_key', secretRef: 'profile:test' },
	createdAt: '2026-05-20T00:00:00.000Z',
	updatedAt: '2026-05-20T00:00:00.000Z',
};

function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), { status });
}

function client(fetchMock: typeof fetch): RestClient {
	return new RestClient(
		profile,
		{ consumerKey: 'ck_test', consumerSecret: 'cs_test' },
		{ fetch: fetchMock }
	);
}

describe('fetchAllPages', () => {
	it('merges pages until a short page', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(jsonResponse({ data: [{ id: 'a' }, { id: 'b' }] }))
			.mockResolvedValueOnce(jsonResponse({ data: [{ id: 'c' }] }));

		const result = await fetchAllPages(
			client(fetchMock),
			'/wc/v3/payments/transactions',
			{},
			{ pageSize: 2, maxPages: 5 }
		);

		expect(result.data.map((item) => item.id)).toEqual(['a', 'b', 'c']);
		expect(result.truncated).toBe(false);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('stops at maxPages and reports truncation', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockImplementation(async () => jsonResponse({ data: [{ id: 'x' }, { id: 'y' }] }));

		const result = await fetchAllPages(
			client(fetchMock),
			'/wc/v3/payments/transactions',
			{},
			{ pageSize: 2, maxPages: 3 }
		);

		expect(result.data).toHaveLength(6);
		expect(result.truncated).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});
});
