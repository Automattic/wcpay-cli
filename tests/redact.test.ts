import { describe, expect, it } from 'vitest';
import { redactHeaders, redactUrl, redactValue } from '../src/core/redact.js';

describe( 'redactUrl', () => {
	it( 'redacts auth query parameters', () => {
		const redacted = redactUrl(
			'https://example.com/wp-json/wc/v3/orders?oauth_consumer_key=ck_123&oauth_signature=sig&page=1'
		);
		expect( redacted ).toContain( 'oauth_consumer_key=%5Bredacted%5D' );
		expect( redacted ).toContain( 'oauth_signature=%5Bredacted%5D' );
		expect( redacted ).toContain( 'page=1' );
	} );
} );

describe( 'redactHeaders', () => {
	it( 'redacts authorization headers', () => {
		expect( redactHeaders( { Authorization: 'Basic abc', Accept: 'application/json' } ) ).toEqual( {
			Authorization: '[redacted]',
			Accept: 'application/json',
		} );
	} );
} );

describe( 'redactValue', () => {
	it( 'redacts nested sensitive keys', () => {
		expect( redactValue( { nested: { consumer_secret: 'cs_123' }, ok: true } ) ).toEqual( {
			nested: { consumer_secret: '[redacted]' },
			ok: true,
		} );
	} );
} );
