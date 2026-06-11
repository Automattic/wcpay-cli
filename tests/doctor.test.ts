import { describe, expect, it, vi } from 'vitest';
import { RestClient } from '../src/core/api.js';
import { runDoctorChecks } from '../src/core/doctor.js';
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

describe('runDoctorChecks', () => {
	it('reports mode, settings, and account checks', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(jsonResponse({ is_test_mode_enabled: true }))
			.mockResolvedValueOnce(
				jsonResponse({
					status: 'complete',
					country: 'US',
					is_live: false,
					payments_enabled: true,
				})
			);
		const client = new RestClient(
			profile,
			{ consumerKey: 'ck_test', consumerSecret: 'cs_test' },
			{ fetch: fetchMock }
		);

		const result = await runDoctorChecks({ profile, client });

		expect(result.mode).toBe('test');
		expect(result.summary.fail).toBe(0);
		expect(result.checks.map((check) => check.name)).toEqual([
			'profile',
			'site_url',
			'credentials_storage',
			'auth',
			'mode',
			'payments_enabled',
			'account',
		]);
	});

	it('warns when the store is in live mode', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(jsonResponse({}))
			.mockResolvedValueOnce(jsonResponse({ status: 'complete' }));
		const client = new RestClient(
			profile,
			{ consumerKey: 'ck_test', consumerSecret: 'cs_test' },
			{ fetch: fetchMock }
		);

		const result = await runDoctorChecks({ profile, client });

		expect(result.mode).toBe('live');
		expect(result.checks.find((check) => check.name === 'mode')?.status).toBe('warn');
	});
});
