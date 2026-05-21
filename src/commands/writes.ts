import { Command } from 'commander';
import { createContext } from '../core/context.js';
import { CliError } from '../core/errors.js';
import { ModeService } from '../core/mode.js';
import { printError, printSuccess } from '../core/output.js';

interface RefundCreateOptions {
	order?: string;
	charge?: string;
	amount?: string;
	reason?: string;
	dryRun?: boolean;
	yes?: boolean;
	json?: boolean;
}

interface AuthorizationOptions {
	order?: string;
	intent?: string;
	dryRun?: boolean;
	yes?: boolean;
	json?: boolean;
}

export function registerWriteCommands( program: Command ): void {
	const refunds = program.command( 'refunds' ).description( 'Create and inspect refunds.' );
	refunds
		.command( 'create' )
		.description( 'Create a test/dev-mode refund.' )
		.option( '--order <order-id>', 'WooCommerce order ID.' )
		.option( '--charge <charge-id>', 'WooPayments/Stripe charge ID.' )
		.requiredOption( '--amount <minor-units>', 'Refund amount in minor currency units.' )
		.option( '--reason <reason>', 'Refund reason.', 'Requested by WooPayments CLI.' )
		.option( '--dry-run', 'Print the request without sending it.' )
		.option( '--yes', 'Confirm the test/dev-mode write.' )
		.option( '--json', 'Emit JSON output.' )
		.action( async ( options: RefundCreateOptions ) => {
			const json = isJson( program, options );
			await runWriteAction( { json }, async () => {
				if ( ! options.order && ! options.charge ) {
					throw new CliError( {
						code: 'missing_refund_target',
						message: 'Pass either --order <order-id> or --charge <charge-id>.',
						status: 2,
					} );
				}
				await sendGuardedWrite( program, {
					path: '/wc/v3/payments/refund',
					body: {
						...( options.order ? { order_id: options.order } : {} ),
						...( options.charge ? { charge_id: options.charge } : {} ),
						amount: Number.parseInt( options.amount!, 10 ),
						reason: options.reason,
					},
					dryRun: Boolean( options.dryRun || ( program.opts() as { dryRun?: boolean } ).dryRun ),
					yes: Boolean( options.yes || ( program.opts() as { yes?: boolean } ).yes ),
					json,
				} );
			} );
		} );

	const authorizations = program.command( 'authorizations' ).description( 'Capture or cancel test/dev-mode authorizations.' );
	registerAuthorizationCommand( program, authorizations, 'capture', 'capture_authorization' );
	registerAuthorizationCommand( program, authorizations, 'cancel', 'cancel_authorization' );
}

function registerAuthorizationCommand(
	program: Command,
	authorizations: Command,
	name: 'capture' | 'cancel',
	endpointAction: 'capture_authorization' | 'cancel_authorization'
): void {
	authorizations
		.command( name )
		.description( `${ name === 'capture' ? 'Capture' : 'Cancel' } a test/dev-mode authorization.` )
		.requiredOption( '--order <order-id>', 'WooCommerce order ID.' )
		.requiredOption( '--intent <payment-intent-id>', 'Payment intent ID.' )
		.option( '--dry-run', 'Print the request without sending it.' )
		.option( '--yes', 'Confirm the test/dev-mode write.' )
		.option( '--json', 'Emit JSON output.' )
		.action( async ( options: AuthorizationOptions ) => {
			const json = isJson( program, options );
			await runWriteAction( { json }, async () => {
				await sendGuardedWrite( program, {
					path: `/wc/v3/payments/orders/${ encodeURIComponent( options.order! ) }/${ endpointAction }`,
					body: { payment_intent_id: options.intent },
					dryRun: Boolean( options.dryRun || ( program.opts() as { dryRun?: boolean } ).dryRun ),
					yes: Boolean( options.yes || ( program.opts() as { yes?: boolean } ).yes ),
					json,
				} );
			} );
		} );
}

async function sendGuardedWrite(
	program: Command,
	input: { path: string; body: Record<string, unknown>; dryRun: boolean; yes: boolean; json: boolean }
): Promise<void> {
	if ( ! input.dryRun && ! input.yes ) {
		throw new CliError( {
			code: 'confirmation_required',
			message: 'Write commands require --yes or --dry-run.',
			status: 2,
		} );
	}

	const context = await createContext( { profile: ( program.opts() as { profile?: string } ).profile } );
	const modeService = new ModeService( context.client );
	await modeService.assertWriteAllowed( 'POST', input.path );

	const request = { method: 'POST' as const, path: input.path, body: input.body };
	if ( input.dryRun ) {
		const resolved = context.client.resolve( request );
		const headers = { ...resolved.headers };
		if ( headers.Authorization ) {
			headers.Authorization = 'Basic [redacted]';
		}
		printSuccess( {
			method: resolved.method,
			url: redactOAuthSignature( resolved.url ),
			headers,
			body: input.body,
		}, { json: input.json, human: `${ resolved.method } ${ redactOAuthSignature( resolved.url ) }` } );
		return;
	}

	const data = await context.client.request( request );
	printSuccess( data, { json: input.json } );
}

function isJson( program: Command, options: { json?: boolean } ): boolean {
	return Boolean( options.json || ( program.opts() as { json?: boolean } ).json );
}

function redactOAuthSignature( urlString: string ): string {
	const url = new URL( urlString );
	if ( url.searchParams.has( 'oauth_signature' ) ) {
		url.searchParams.set( 'oauth_signature', '[redacted]' );
	}
	return url.toString();
}

async function runWriteAction( options: { json?: boolean }, action: () => Promise<void> ): Promise<void> {
	try {
		await action();
	} catch ( error ) {
		printError( error, { json: options.json } );
		process.exitCode = 1;
	}
}
