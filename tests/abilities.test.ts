import { describe, expect, it } from 'vitest';
import { RestClient } from '../src/core/api.js';
import {
	isReadOnlyAbility,
	listAbilities,
	normalizeAbilityCollection,
	runReadAbilityWithRestFallback,
	WCPAY_ABILITIES,
} from '../src/core/abilities.js';
import type { Profile } from '../src/core/profiles.js';

const profile: Profile = {
	name: 'test',
	siteUrl: 'https://example.com',
	allowInsecureLocal: false,
	auth: { type: 'woocommerce_api_key', secretRef: 'profile:test' },
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('WooPayments abilities helpers', () => {
	it('discovers WooPayments abilities from the REST list endpoint', async () => {
		const client = new RestClient(
			profile,
			{ consumerKey: 'ck_test', consumerSecret: 'cs_test' },
			{
				fetch: async (url) => {
					expect(String(url)).toContain('/wp-json/wp-abilities/v1/abilities');
					return new Response(
						JSON.stringify([
							{ name: 'woocommerce-payments/get-account' },
							{ name: 'woocommerce/products-query' },
						]),
						{ status: 200 }
					);
				},
			}
		);

		expect(await listAbilities(client)).toEqual([{ name: 'woocommerce-payments/get-account' }]);
	});

	it('treats unavailable ability discovery as no abilities', async () => {
		const client = new RestClient(
			profile,
			{ consumerKey: 'ck_test', consumerSecret: 'cs_test' },
			{
				fetch: async () =>
					new Response(JSON.stringify({ code: 'rest_forbidden', message: 'Forbidden.' }), {
						status: 401,
					}),
			}
		);

		expect(await listAbilities(client)).toEqual([]);
	});

	it('detects read-only ability metadata', () => {
		expect(
			isReadOnlyAbility({
				name: 'woocommerce-payments/get-account',
				meta: { annotations: { readonly: true, destructive: false } },
			})
		).toBe(true);
		expect(
			isReadOnlyAbility({
				name: 'woocommerce-payments/create-refund',
				meta: { annotations: { readonly: false, destructive: true } },
			})
		).toBe(false);
	});
	it('uses a WooPayments ability when available', async () => {
		const seen: string[] = [];
		const client = new RestClient(
			profile,
			{ consumerKey: 'ck_test', consumerSecret: 'cs_test' },
			{
				fetch: async (url, init) => {
					seen.push(`${init?.method} ${url}`);
					expect(JSON.parse(String(init?.body))).toEqual({ input: { page: 2 } });
					return new Response(JSON.stringify({ from: 'ability' }), { status: 200 });
				},
			}
		);

		const result = await runReadAbilityWithRestFallback(
			client,
			WCPAY_ABILITIES.getTransactions,
			{ page: 2 },
			async () => ({ from: 'rest' })
		);

		expect(result).toEqual({ from: 'ability' });
		expect(seen[0]).toContain(
			'/wp-json/wp-abilities/v1/abilities/woocommerce-payments/get-transactions/run'
		);
	});

	it('normalizes ability collection responses to the REST list shape', () => {
		expect(normalizeAbilityCollection({ transactions: [{ id: 'txn_1' }] }, 'transactions')).toEqual({
			data: [{ id: 'txn_1' }],
		});
	});

	it('falls back to REST when an ability is unavailable', async () => {
		const client = new RestClient(
			profile,
			{ consumerKey: 'ck_test', consumerSecret: 'cs_test' },
			{
				fetch: async () =>
					new Response(JSON.stringify({ code: 'rest_no_route', message: 'No route.' }), {
						status: 404,
					}),
			}
		);

		const result = await runReadAbilityWithRestFallback(
			client,
			WCPAY_ABILITIES.getAccount,
			{},
			async () => ({ from: 'rest' })
		);

		expect(result).toEqual({ from: 'rest' });
	});

	it('falls back to REST when an ability endpoint errors server-side', async () => {
		const client = new RestClient(
			profile,
			{ consumerKey: 'ck_test', consumerSecret: 'cs_test' },
			{
				fetch: async () =>
					new Response(JSON.stringify({ code: 'wcpay_bad_request', message: 'Broken ability.' }), {
						status: 500,
					}),
			}
		);

		const result = await runReadAbilityWithRestFallback(
			client,
			WCPAY_ABILITIES.getDeposits,
			{ per_page: 2 },
			async () => ({ from: 'rest' })
		);

		expect(result).toEqual({ from: 'rest' });
	});

	it('does not fall back on ability permission errors', async () => {
		const client = new RestClient(
			profile,
			{ consumerKey: 'ck_test', consumerSecret: 'cs_test' },
			{
				fetch: async () =>
					new Response(
						JSON.stringify({ code: 'rest_forbidden', message: 'Forbidden.' }),
						{
							status: 403,
						}
					),
			}
		);

		await expect(
			runReadAbilityWithRestFallback(client, WCPAY_ABILITIES.getAccount, {}, async () => ({
				from: 'rest',
			}))
		).rejects.toMatchObject({ code: 'rest_forbidden' });
	});
});
