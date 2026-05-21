import { Command } from 'commander';
import { notImplemented } from '../core/errors.js';
import { printError } from '../core/output.js';

function stubAction( command: string, options: { json?: boolean } = {} ): void {
	printError( notImplemented( command ), { json: options.json } );
	process.exitCode = 1;
}

export function registerStubCommands( program: Command ): void {
	const test = program.command( 'test' ).description( 'Run test/dev-mode WooPayments workflows.' );
	const testOrder = test.command( 'order' ).description( 'Test order workflows.' );
	testOrder.command( 'create' ).description( 'Create a test order.' ).option( '--json', 'Emit JSON output.' ).action( ( options ) => stubAction( 'test order create', options ) );
	const testPayment = test.command( 'payment' ).description( 'Test payment workflows.' );
	testPayment.command( 'create' ).description( 'Create a test payment.' ).option( '--json', 'Emit JSON output.' ).action( ( options ) => stubAction( 'test payment create', options ) );
}
