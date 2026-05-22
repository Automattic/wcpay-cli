import { describe, expect, it, vi } from 'vitest';
import { RestClient } from '../src/core/api.js';
import { classifyMode, ModeService } from '../src/core/mode.js';
import type { Profile } from '../src/core/profiles.js';

const profile: Profile = {
	name: 'test',
	siteUrl: 'https://example.com',
	allowInsecureLocal: false,
	auth: { type: 'woocommerce_api_key', secretRef: 'profile:test' },
	createdAt: '2026-05-20T00:00:00.000Z',
	updatedAt: '2026-05-20T00:00:00.000Z',
};

function jsonResponse( data: unknown, status = 200 ): Response {
	return new Response( JSON.stringify( data ), { status } );
}

describe( 'classifyMode', () => {
	it( 'classifies dev, test, and live modes', () => {
		expect( classifyMode( { is_dev_mode_enabled: true } ) ).toBe( 'dev' );
		expect( classifyMode( { is_test_mode_enabled: true } ) ).toBe( 'test' );
		expect( classifyMode( { is_test_mode_onboarding: true } ) ).toBe( 'test' );
		expect( classifyMode( {} ) ).toBe( 'live' );
	} );
} );

describe( 'ModeService', () => {
	it( 'allows read methods without fetching mode', async () => {
		const fetchMock = vi.fn<typeof fetch>();
		const service = new ModeService(
			new RestClient( profile, { consumerKey: 'ck_test', consumerSecret: 'cs_test' }, { fetch: fetchMock } )
		);

		await expect( service.assertWriteAllowed( 'GET', '/wc/v3/payments/accounts' ) ).resolves.toBeUndefined();
		expect( fetchMock ).not.toHaveBeenCalled();
	} );

	it( 'blocks write methods in live mode', async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue( jsonResponse( {} ) );
		const service = new ModeService(
			new RestClient( profile, { consumerKey: 'ck_test', consumerSecret: 'cs_test' }, { fetch: fetchMock } )
		);

		await expect( service.assertWriteAllowed( 'POST', '/wc/v3/payments/refund' ) ).rejects.toMatchObject( {
			code: 'live_mode_write_blocked',
		} );
	} );

	it( 'allows write methods in test mode', async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue( jsonResponse( { is_test_mode_enabled: true } ) );
		const service = new ModeService(
			new RestClient( profile, { consumerKey: 'ck_test', consumerSecret: 'cs_test' }, { fetch: fetchMock } )
		);

		await expect( service.assertWriteAllowed( 'POST', '/wc/v3/payments/refund' ) ).resolves.toBeUndefined();
	} );
} );
