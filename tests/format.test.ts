import { describe, expect, it } from 'vitest';
import { extractItems, formatKeyValue, formatList } from '../src/core/format.js';

describe( 'formatKeyValue', () => {
	it( 'formats key value rows', () => {
		expect( formatKeyValue( { Mode: 'test', Enabled: true } ) ).toContain( 'Mode' );
		expect( formatKeyValue( { Mode: 'test', Empty: undefined } ) ).not.toContain( 'Empty' );
	} );
} );

describe( 'extractItems', () => {
	it( 'extracts arrays from common response wrappers', () => {
		expect( extractItems( { data: [ { id: '1' } ] } ) ).toEqual( [ { id: '1' } ] );
		expect( extractItems( [ { id: '2' } ] ) ).toEqual( [ { id: '2' } ] );
	} );
} );

describe( 'formatList', () => {
	it( 'formats tabular data', () => {
		const table = formatList( { data: [ { id: 'tr_1', amount: 100 } ] }, [ 'id', 'amount' ] );
		expect( table ).toContain( 'tr_1' );
		expect( table ).toContain( 'amount' );
	} );
} );
