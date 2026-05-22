import { Command } from 'commander';
import { isReadMethod, normalizeMethod } from '../core/api.js';
import { createContext } from '../core/context.js';
import { ModeService } from '../core/mode.js';
import { printError, printSuccess } from '../core/output.js';
import { parseApiFields } from '../core/fields.js';
import { redactHeaders, redactUrl } from '../core/redact.js';

interface ApiOptions {
	json?: boolean;
	dryRun?: boolean;
}

export function registerApiCommand( program: Command ): void {
	program
		.command( 'api <method> <path> [fields...]' )
		.description( 'Make an authenticated store REST API request.' )
		.option( '--json', 'Emit JSON output.' )
		.option( '--dry-run', 'Print the request without sending it.' )
		.action( async ( methodInput: string, path: string, rawFields: string[], localOptions: ApiOptions ) => {
			const parsed = extractTrailingFlags( rawFields );
			const globalOptions = program.opts() as ApiOptions & { profile?: string };
			const options = {
				json: Boolean( localOptions.json || globalOptions.json || parsed.json ),
				dryRun: Boolean( localOptions.dryRun || globalOptions.dryRun || parsed.dryRun ),
				profile: globalOptions.profile,
			};

			try {
				const method = normalizeMethod( methodInput );
				const fields = parseApiFields( method, parsed.fields );
				const context = await createContext( { profile: options.profile } );
				const modeService = new ModeService( context.client );

				if ( ! isReadMethod( method ) ) {
					await modeService.assertWriteAllowed( method, path );
				}

				const request = {
					method,
					path,
					query: fields.query,
					body: fields.body,
				};

				if ( options.dryRun ) {
					const resolved = context.client.resolve( request );

					printSuccess( {
						method: resolved.method,
						url: redactUrl( resolved.url ),
						headers: redactHeaders( resolved.headers ),
						body: resolved.body ? JSON.parse( resolved.body ) : undefined,
					}, {
						json: options.json,
						human: `${ resolved.method } ${ redactUrl( resolved.url ) }`,
					} );
					return;
				}

				const data = await context.client.request( request );
				printSuccess( data, { json: options.json } );
			} catch ( error ) {
				printError( error, { json: options.json } );
				process.exitCode = 1;
			}
		} );
}

function extractTrailingFlags( fields: string[] ): { fields: string[]; json: boolean; dryRun: boolean } {
	let json = false;
	let dryRun = false;
	const remaining: string[] = [];

	for ( const field of fields ) {
		if ( field === '--json' ) {
			json = true;
			continue;
		}
		if ( field === '--dry-run' ) {
			dryRun = true;
			continue;
		}
		remaining.push( field );
	}

	return { fields: remaining, json, dryRun };
}

