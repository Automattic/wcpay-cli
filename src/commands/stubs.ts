import { Command } from 'commander';
import { notImplemented } from '../core/errors.js';
import { printError } from '../core/output.js';

function stubAction( command: string, options: { json?: boolean } = {} ): void {
	printError( notImplemented( command ), { json: options.json } );
	process.exitCode = 1;
}

export function registerStubCommands( program: Command ): void {
	const transactions = program.command( 'transactions' ).description( 'Inspect WooPayments transactions.' );
	transactions.command( 'list' ).description( 'List transactions.' ).option( '--json', 'Emit JSON output.' ).action( ( options ) => stubAction( 'transactions list', options ) );
	transactions.command( 'get <id>' ).description( 'Get a transaction.' ).option( '--json', 'Emit JSON output.' ).action( ( _id, options ) => stubAction( 'transactions get', options ) );

	const deposits = program.command( 'deposits' ).description( 'Inspect WooPayments deposits.' );
	deposits.command( 'list' ).description( 'List deposits.' ).option( '--json', 'Emit JSON output.' ).action( ( options ) => stubAction( 'deposits list', options ) );
	deposits.command( 'get <id>' ).description( 'Get a deposit.' ).option( '--json', 'Emit JSON output.' ).action( ( _id, options ) => stubAction( 'deposits get', options ) );

	const disputes = program.command( 'disputes' ).description( 'Inspect WooPayments disputes.' );
	disputes.command( 'list' ).description( 'List disputes.' ).option( '--json', 'Emit JSON output.' ).action( ( options ) => stubAction( 'disputes list', options ) );
	disputes.command( 'get <id>' ).description( 'Get a dispute.' ).option( '--json', 'Emit JSON output.' ).action( ( _id, options ) => stubAction( 'disputes get', options ) );

	const refunds = program.command( 'refunds' ).description( 'Create and inspect refunds.' );
	refunds.command( 'create' ).description( 'Create a test-mode refund.' ).option( '--json', 'Emit JSON output.' ).action( ( options ) => stubAction( 'refunds create', options ) );

	const test = program.command( 'test' ).description( 'Run test/dev-mode WooPayments workflows.' );
	const testOrder = test.command( 'order' ).description( 'Test order workflows.' );
	testOrder.command( 'create' ).description( 'Create a test order.' ).option( '--json', 'Emit JSON output.' ).action( ( options ) => stubAction( 'test order create', options ) );
	const testPayment = test.command( 'payment' ).description( 'Test payment workflows.' );
	testPayment.command( 'create' ).description( 'Create a test payment.' ).option( '--json', 'Emit JSON output.' ).action( ( options ) => stubAction( 'test payment create', options ) );

	program.command( 'mcp' ).description( 'Run the WooPayments CLI MCP server over stdio.' ).action( () => stubAction( 'mcp' ) );
}
