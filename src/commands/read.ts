import { Command } from 'commander';
import { createContext } from '../core/context.js';
import { classifyMode, ModeService } from '../core/mode.js';
import { formatKeyValue } from '../core/format.js';
import { printError, printSuccess } from '../core/output.js';

export function registerReadCommands( program: Command ): void {
	program
		.command( 'mode' )
		.description( 'Show WooPayments mode for the selected profile.' )
		.option( '--json', 'Emit JSON output.' )
		.action( async ( options: { json?: boolean } ) => {
			const json = isJson( program, options );
			await runReadAction( { json }, async () => {
				const context = await createContext( { profile: program.opts().profile } );
				const modeService = new ModeService( context.client );
				const settings = await modeService.getSettings();
				const mode = classifyMode( settings );
				printSuccess( { mode, settings }, {
					json,
					human: mode,
				} );
			} );
		} );

	program
		.command( 'doctor' )
		.description( 'Run WooPayments diagnostics.' )
		.option( '--json', 'Emit JSON output.' )
		.option( '--redact', 'Redact sensitive values.', true )
		.action( async ( options: { json?: boolean } ) => {
			const json = isJson( program, options );
			await runReadAction( { json }, async () => {
				const context = await createContext( { profile: program.opts().profile } );
				const checks = [];
				checks.push( { name: 'profile', status: 'pass', message: context.profile.name } );
				checks.push( { name: 'site_url', status: 'pass', message: context.profile.siteUrl } );

				const settings = await context.client.request( {
					method: 'GET',
					path: '/wc/v3/payments/settings',
				} );
				const mode = classifyMode( settings as Record<string, unknown> );
				checks.push( { name: 'auth', status: 'pass', message: 'Credentials accepted.' } );
				checks.push( { name: 'mode', status: 'pass', message: mode } );

				printSuccess( { profile: context.profile.name, mode, checks }, {
					json,
					human: checks.map( ( check ) => `${ check.status }\t${ check.name }\t${ check.message }` ).join( '\n' ),
				} );
			} );
		} );

	const account = program.command( 'account' ).description( 'Inspect WooPayments account information.' );
	account
		.command( 'status' )
		.description( 'Show account status.' )
		.option( '--json', 'Emit JSON output.' )
		.action( async ( options: { json?: boolean } ) => {
			const json = isJson( program, options );
			await runReadAction( { json }, async () => {
				const context = await createContext( { profile: program.opts().profile } );
				const data = await context.client.request( { method: 'GET', path: '/wc/v3/payments/accounts' } );
				printSuccess( data, { json, human: formatAccountStatus( data, context.profile.siteUrl ) } );
			} );
		} );

	const settings = program.command( 'settings' ).description( 'Inspect WooPayments settings.' );
	settings
		.command( 'get' )
		.description( 'Show settings.' )
		.option( '--json', 'Emit JSON output.' )
		.action( async ( options: { json?: boolean } ) => {
			const json = isJson( program, options );
			await runReadAction( { json }, async () => {
				const context = await createContext( { profile: program.opts().profile } );
				const data = await context.client.request( { method: 'GET', path: '/wc/v3/payments/settings' } );
				printSuccess( data, { json, human: formatSettings( data, context.profile.siteUrl ) } );
			} );
		} );
}

function formatAccountStatus( data: unknown, site: string ): string {
	if ( data === false ) {
		return formatKeyValue( { Site: site, Account: 'not connected or unavailable' } );
	}
	if ( data && typeof data === 'object' ) {
		const account = data as Record<string, unknown>;
		return formatKeyValue( {
			Site: site,
			Status: account.status,
			Country: account.country,
			'Test mode': account.test_mode,
			'Test onboarding': account.test_mode_onboarding,
			Currency: getNested( account, [ 'store_currencies', 'default' ] ),
		} );
	}
	return String( data );
}

function formatSettings( data: unknown, site: string ): string {
	if ( data && typeof data === 'object' ) {
		const settings = data as Record<string, unknown>;
		return formatKeyValue( {
			Site: site,
			Mode: settings.is_dev_mode_enabled ? 'dev' : settings.is_test_mode_enabled ? 'test' : 'live',
			Enabled: settings.is_wcpay_enabled,
			'Test mode': settings.is_test_mode_enabled,
			'Dev mode': settings.is_dev_mode_enabled,
			Country: settings.account_country,
			Currency: settings.account_domestic_currency,
			Deposits: settings.deposit_status,
		} );
	}
	return String( data );
}

function getNested( object: Record<string, unknown>, path: string[] ): unknown {
	let current: unknown = object;
	for ( const key of path ) {
		if ( ! current || typeof current !== 'object' || ! ( key in current ) ) {
			return undefined;
		}
		current = ( current as Record<string, unknown> )[ key ];
	}
	return current;
}

function isJson( program: Command, options: { json?: boolean } ): boolean {
	return Boolean( options.json || ( program.opts() as { json?: boolean } ).json );
}

async function runReadAction( options: { json?: boolean }, action: () => Promise<void> ): Promise<void> {
	try {
		await action();
	} catch ( error ) {
		printError( error, { json: options.json } );
		process.exitCode = 1;
	}
}
