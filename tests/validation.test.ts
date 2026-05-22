import { describe, expect, it } from 'vitest';
import { parseOptionalPositiveInteger, parsePositiveInteger } from '../src/core/validation.js';

describe( 'parsePositiveInteger', () => {
	it( 'parses positive integers', () => {
		expect( parsePositiveInteger( '123', '--amount' ) ).toBe( 123 );
	} );

	it( 'rejects zero, negative, decimal, and non-numeric values', () => {
		for ( const value of [ '0', '-1', '1.5', 'abc', '' ] ) {
			expect( () => parsePositiveInteger( value, '--amount' ) ).toThrow( '--amount' );
		}
	} );
} );

describe( 'parseOptionalPositiveInteger', () => {
	it( 'returns undefined for absent values', () => {
		expect( parseOptionalPositiveInteger( undefined, '--page' ) ).toBeUndefined();
	} );
} );
