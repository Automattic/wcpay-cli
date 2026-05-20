import { Command } from 'commander';
import { notImplemented } from '../core/errors.js';
import { printError, printSuccess } from '../core/output.js';

function stubAction( command: string, options: { json?: boolean } = {} ): void {
	printError( notImplemented( command ), { json: options.json } );
	process.exitCode = 1;
}

export function registerStubCommands( program: Command ): void {
	program
		.command( 'doctor' )
		.description( 'Run WooPayments diagnostics.' )
		.option( '--json', 'Emit JSON output.' )
		.option( '--redact', 'Redact sensitive values.', true )
		.action( ( options: { json?: boolean } ) => stubAction( 'doctor', options ) );

	program
		.command( 'mode' )
		.description( 'Show WooPayments mode for the selected profile.' )
		.option( '--json', 'Emit JSON output.' )
		.action( ( options: { json?: boolean } ) => stubAction( 'mode', options ) );

	const auth = program.command( 'auth' ).description( 'Manage WooCommerce REST API credentials.' );
	auth.command( 'add' ).description( 'Add a site profile.' ).action( () => stubAction( 'auth add' ) );
	auth.command( 'list' ).description( 'List site profiles.' ).action( () => stubAction( 'auth list' ) );
	auth.command( 'remove <profile>' ).description( 'Remove a site profile.' ).action( () => stubAction( 'auth remove' ) );
	auth.command( 'test [profile]' ).description( 'Validate credentials for a profile.' ).action( () => stubAction( 'auth test' ) );

	const profile = program.command( 'profile' ).description( 'Manage the active site profile.' );
	profile.command( 'use <profile>' ).description( 'Set the default profile.' ).action( () => stubAction( 'profile use' ) );

	program.command( 'whoami' ).description( 'Show authenticated site/user context.' ).action( () => stubAction( 'whoami' ) );

	program
		.command( 'api <method> <path> [fields...]' )
		.description( 'Make an authenticated store REST API request.' )
		.option( '--json', 'Emit JSON output.' )
		.option( '--dry-run', 'Print the request without sending it.' )
		.action( ( method: string, path: string, rawFields: string[], localOptions: { json?: boolean; dryRun?: boolean } ) => {
			// Commander variadic args consume trailing flags, but `wcpay api get /path --dry-run --json`
			// is an important UX. Recognize the global flags manually until the API parser is built.
			const jsonFromFields = rawFields.includes( '--json' );
			const dryRunFromFields = rawFields.includes( '--dry-run' );
			const fields = rawFields.filter( ( field ) => field !== '--json' && field !== '--dry-run' );
			const globalOptions = program.opts() as { json?: boolean; dryRun?: boolean };
			const json = Boolean( localOptions.json || globalOptions.json || jsonFromFields );
			const dryRun = Boolean( localOptions.dryRun || globalOptions.dryRun || dryRunFromFields );

			if ( dryRun ) {
				printSuccess(
					{ method: method.toUpperCase(), path, fields },
					{ json, human: `${ method.toUpperCase() } ${ path }\n${ fields.join( '\n' ) }` }
				);
				return;
			}
			stubAction( 'api', { json } );
		} );

	const account = program.command( 'account' ).description( 'Inspect WooPayments account information.' );
	account.command( 'status' ).description( 'Show account status.' ).option( '--json', 'Emit JSON output.' ).action( ( options ) => stubAction( 'account status', options ) );

	const settings = program.command( 'settings' ).description( 'Inspect WooPayments settings.' );
	settings.command( 'get' ).description( 'Show settings.' ).option( '--json', 'Emit JSON output.' ).action( ( options ) => stubAction( 'settings get', options ) );

	program.command( 'mcp' ).description( 'Run the WooPayments CLI MCP server over stdio.' ).action( () => stubAction( 'mcp' ) );
}
