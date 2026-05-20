import type { CliErrorShape } from './types.js';

export class CliError extends Error {
	public readonly code: string;
	public readonly status?: number;
	public readonly details?: unknown;

	public constructor( error: CliErrorShape ) {
		super( error.message );
		this.name = 'CliError';
		this.code = error.code;
		this.status = error.status;
		this.details = error.details;
	}

	public toJSON(): CliErrorShape {
		return {
			code: this.code,
			message: this.message,
			...( this.status ? { status: this.status } : {} ),
			...( this.details !== undefined ? { details: this.details } : {} ),
		};
	}
}

export const notImplemented = ( command: string ): CliError =>
	new CliError( {
		code: 'not_implemented',
		message: `The \`${ command }\` command is scaffolded but not implemented yet.`,
		status: 501,
	} );
