import { Command } from 'commander';
import { createContext } from '../core/context.js';
import { classifyMode, ModeService } from '../core/mode.js';
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
				printSuccess( data, { json } );
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
				printSuccess( data, { json } );
			} );
		} );
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
