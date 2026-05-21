import { describe, expect, it } from 'vitest';
import { getTestPaymentScenario, listTestPaymentScenarios } from '../src/core/test-scenarios.js';

describe( 'test payment scenarios', () => {
	it( 'defines the initial scenario aliases', () => {
		expect( getTestPaymentScenario( 'success' )?.paymentMethod ).toBe( 'pm_card_visa' );
		expect( getTestPaymentScenario( 'decline' ) ).toBeDefined();
		expect( getTestPaymentScenario( '3ds' ) ).toBeDefined();
		expect( getTestPaymentScenario( 'dispute' ) ).toBeDefined();
		expect( getTestPaymentScenario( 'fraudulent' ) ).toBeDefined();
	} );

	it( 'lists scenarios', () => {
		expect( listTestPaymentScenarios().map( ( scenario ) => scenario.alias ) ).toContain( 'success' );
	} );
} );
