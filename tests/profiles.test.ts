import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { deriveProfileName, normalizeSiteUrl, ProfileStore } from '../src/core/profiles.js';
import { FileSecretStore } from '../src/core/secrets.js';

async function testEnv(): Promise<NodeJS.ProcessEnv> {
	return { WCPAY_HOME: await mkdtemp( join( tmpdir(), 'wcpay-cli-' ) ) } as NodeJS.ProcessEnv;
}

describe( 'normalizeSiteUrl', () => {
	it( 'normalizes trailing slashes', () => {
		expect( normalizeSiteUrl( 'https://example.com/' ) ).toBe( 'https://example.com' );
	} );

	it( 'allows local http sites', () => {
		expect( normalizeSiteUrl( 'http://localhost:8082/' ) ).toBe( 'http://localhost:8082' );
	} );

	it( 'rejects remote http sites', () => {
		expect( () => normalizeSiteUrl( 'http://example.com' ) ).toThrow( 'Refusing to store credentials' );
	} );
} );

describe( 'deriveProfileName', () => {
	it( 'derives a profile name from the hostname', () => {
		expect( deriveProfileName( 'https://store.example/path' ) ).toBe( 'store.example' );
	} );
} );

describe( 'ProfileStore', () => {
	it( 'stores profiles and default profile', async () => {
		const env = await testEnv();
		const store = new ProfileStore( env );
		const profile = await store.upsert( { name: 'local', siteUrl: 'http://localhost:8082' } );

		expect( profile.name ).toBe( 'local' );
		expect( await store.list() ).toHaveLength( 1 );
		expect( ( await store.setDefault( 'local' ) ).siteUrl ).toBe( 'http://localhost:8082' );
		expect( ( await store.get() ).name ).toBe( 'local' );
	} );
} );

describe( 'FileSecretStore', () => {
	it( 'stores and removes credentials', async () => {
		const env = await testEnv();
		const store = new FileSecretStore( env );
		await store.set( 'profile:local', {
			consumerKey: 'ck_test',
			consumerSecret: 'cs_test',
		} );

		expect( await store.get( 'profile:local' ) ).toEqual( {
			consumerKey: 'ck_test',
			consumerSecret: 'cs_test',
		} );

		await store.delete( 'profile:local' );
		expect( await store.get( 'profile:local' ) ).toBeUndefined();
	} );
} );
