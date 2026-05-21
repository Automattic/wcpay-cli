import { Writable } from 'node:stream';
import readline from 'node:readline';
import { CliError } from './errors.js';

export async function promptText( label: string ): Promise<string> {
	ensureInteractive();
	return question( label, false );
}

export async function promptSecret( label: string ): Promise<string> {
	ensureInteractive();
	return question( label, true );
}

function ensureInteractive(): void {
	if ( ! process.stdin.isTTY || ! process.stdout.isTTY ) {
		throw new CliError( {
			code: 'interactive_auth_required',
			message: 'No-browser auth needs credentials. Pass --consumer-key/--consumer-secret or set WCPAY_CONSUMER_KEY/WCPAY_CONSUMER_SECRET.',
			status: 2,
		} );
	}
}

function question( label: string, secret: boolean ): Promise<string> {
	let muted = false;
	const output = secret
		? new Writable( {
				write( chunk, _encoding, callback ) {
					if ( ! muted ) {
						process.stdout.write( chunk );
					}
					callback();
				},
			} )
		: process.stdout;

	const rl = readline.createInterface( {
		input: process.stdin,
		output,
		terminal: true,
	} );

	return new Promise( ( resolve ) => {
		if ( secret ) {
			process.stdout.write( label );
			muted = true;
		}
		rl.question( secret ? '' : label, ( answer ) => {
			muted = false;
			rl.close();
			if ( secret ) {
				process.stdout.write( '\n' );
			}
			resolve( answer.trim() );
		} );
	} );
}
