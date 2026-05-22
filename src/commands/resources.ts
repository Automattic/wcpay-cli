import { Command } from 'commander';
import { createContext } from '../core/context.js';
import { formatList } from '../core/format.js';
import { printError, printSuccess } from '../core/output.js';
import { parseOptionalPositiveInteger } from '../core/validation.js';

interface ListOptions {
	json?: boolean;
	page?: string;
	limit?: string;
	since?: string;
	until?: string;
	status?: string;
	currency?: string;
}

export function registerResourceCommands( program: Command ): void {
	registerListGetResource( program, {
		name: 'deposits',
		description: 'Inspect WooPayments deposits.',
		basePath: '/wc/v3/payments/deposits',
		idName: 'deposit',
	} );

	registerListGetResource( program, {
		name: 'disputes',
		description: 'Inspect WooPayments disputes.',
		basePath: '/wc/v3/payments/disputes',
		idName: 'dispute',
	} );

	const transactions = program.command( 'transactions' ).description( 'Inspect WooPayments transactions.' );
	transactions
		.command( 'list' )
		.description( 'List transactions.' )
		.option( '--json', 'Emit JSON output.' )
		.option( '--page <page>', 'Page number.' )
		.option( '--limit <limit>', 'Page size.' )
		.option( '--since <date>', 'Filter after this date.' )
		.option( '--until <date>', 'Filter before this date.' )
		.option( '--currency <code>', 'Filter store currency.' )
		.action( async ( options: ListOptions ) => {
			await runResourceAction( { json: isJson( program, options ) }, async () => {
				const context = await createContext( { profile: program.opts().profile } );
				const data = await context.client.request( {
					method: 'GET',
					path: '/wc/v3/payments/transactions',
					query: buildListQuery( options, { currencyParam: 'store_currency_is' } ),
				} );
				printSuccess( data, {
					json: isJson( program, options ),
					human: formatList( data, [ 'id', 'date', 'type', 'amount', 'currency' ] ),
				} );
			} );
		} );

	transactions
		.command( 'get <id>' )
		.description( 'Get a transaction by ID if the store endpoint supports it.' )
		.option( '--json', 'Emit JSON output.' )
		.action( async ( id: string, options: { json?: boolean } ) => {
			await runResourceAction( { json: isJson( program, options ) }, async () => {
				// WooPayments currently exposes transaction list and summaries, but not a stable
				// single-transaction REST route. Keep the command explicit rather than guessing.
				printSuccess( {
					id,
					implemented: false,
					reason: 'No reviewed single-transaction WooPayments REST endpoint is allowlisted yet.',
				}, { json: isJson( program, options ), human: 'No allowlisted single-transaction endpoint yet.' } );
			} );
		} );

	const charges = program.command( 'charges' ).description( 'Inspect WooPayments charges.' );
	charges
		.command( 'get <id>' )
		.description( 'Get a charge.' )
		.option( '--json', 'Emit JSON output.' )
		.action( async ( id: string, options: { json?: boolean } ) => {
			await runResourceAction( { json: isJson( program, options ) }, async () => {
				const context = await createContext( { profile: program.opts().profile } );
				const data = await context.client.request( { method: 'GET', path: `/wc/v3/payments/charges/${ encodeURIComponent( id ) }` } );
				printSuccess( data, { json: isJson( program, options ) } );
			} );
		} );
}

function registerListGetResource(
	program: Command,
	resource: { name: string; description: string; basePath: string; idName: string }
): void {
	const command = program.command( resource.name ).description( resource.description );

	command
		.command( 'list' )
		.description( `List ${ resource.name }.` )
		.option( '--json', 'Emit JSON output.' )
		.option( '--page <page>', 'Page number.' )
		.option( '--limit <limit>', 'Page size.' )
		.option( '--since <date>', 'Filter after this date.' )
		.option( '--until <date>', 'Filter before this date.' )
		.option( '--status <status>', 'Filter status.' )
		.action( async ( options: ListOptions ) => {
			await runResourceAction( { json: isJson( program, options ) }, async () => {
				const context = await createContext( { profile: program.opts().profile } );
				const data = await context.client.request( {
					method: 'GET',
					path: resource.basePath,
					query: buildListQuery( options ),
				} );
				printSuccess( data, {
					json: isJson( program, options ),
					human: formatList( data, columnsForResource( resource.name ) ),
				} );
			} );
		} );

	command
		.command( 'get <id>' )
		.description( `Get a ${ resource.idName }.` )
		.option( '--json', 'Emit JSON output.' )
		.action( async ( id: string, options: { json?: boolean } ) => {
			await runResourceAction( { json: isJson( program, options ) }, async () => {
				const context = await createContext( { profile: program.opts().profile } );
				const data = await context.client.request( {
					method: 'GET',
					path: `${ resource.basePath }/${ encodeURIComponent( id ) }`,
				} );
				printSuccess( data, { json: isJson( program, options ) } );
			} );
		} );
}

function columnsForResource( resourceName: string ): string[] {
	if ( resourceName === 'deposits' ) {
		return [ 'id', 'date', 'amount', 'currency', 'status' ];
	}
	if ( resourceName === 'disputes' ) {
		return [ 'id', 'created', 'amount', 'currency', 'status' ];
	}
	return [ 'id' ];
}

function buildListQuery(
	options: ListOptions,
	config: { currencyParam?: string } = {}
): Record<string, string | number> {
	const query: Record<string, string | number> = {};
	const page = parseOptionalPositiveInteger( options.page, '--page' );
	const limit = parseOptionalPositiveInteger( options.limit, '--limit' );
	if ( page ) {
		query.page = page;
	}
	if ( limit ) {
		query.pagesize = limit;
	}
	if ( options.since ) {
		query.date_after = options.since;
	}
	if ( options.until ) {
		query.date_before = options.until;
	}
	if ( options.status ) {
		query.status_is = options.status;
	}
	if ( options.currency && config.currencyParam ) {
		query[ config.currencyParam ] = options.currency.toLowerCase();
	}
	return query;
}

function isJson( program: Command, options: { json?: boolean } ): boolean {
	return Boolean( options.json || ( program.opts() as { json?: boolean } ).json );
}

async function runResourceAction( options: { json?: boolean }, action: () => Promise<void> ): Promise<void> {
	try {
		await action();
	} catch ( error ) {
		printError( error, { json: options.json } );
		process.exitCode = 1;
	}
}
