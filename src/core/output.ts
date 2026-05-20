import type { CliEnvelope } from './types.js';
import { CliError } from './errors.js';

export function printJson( envelope: CliEnvelope ): void {
	process.stdout.write( `${ JSON.stringify( envelope, null, 2 ) }\n` );
}

export function printHuman( message: string ): void {
	process.stdout.write( `${ message }\n` );
}

export function printSuccess<TData = unknown>( data: TData, options: { json?: boolean; meta?: Record<string, unknown>; human?: string } = {} ): void {
	if ( options.json ) {
		printJson( { ok: true, data, meta: options.meta } );
		return;
	}

	if ( options.human ) {
		printHuman( options.human );
		return;
	}

	printHuman( typeof data === 'string' ? data : JSON.stringify( data, null, 2 ) );
}

export function printError( error: unknown, options: { json?: boolean } = {} ): void {
	const cliError = error instanceof CliError
		? error
		: new CliError( {
			code: 'unexpected_error',
			message: error instanceof Error ? error.message : String( error ),
			status: 1,
		} );

	if ( options.json ) {
		printJson( { ok: false, error: cliError.toJSON() } );
		return;
	}

	process.stderr.write( `Error: ${ cliError.message }\n` );
}
