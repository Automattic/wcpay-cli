import { CliError } from './errors.js';

export function parsePositiveInteger(value: string | undefined, name: string): number {
	if ( value === undefined || value.trim() === '' ) {
		throw new CliError( {
			code: 'invalid_positive_integer',
			message: `${ name } is required and must be a positive integer.`,
			status: 2,
		} );
	}

	if ( ! /^\d+$/.test( value ) ) {
		throw new CliError( {
			code: 'invalid_positive_integer',
			message: `${ name } must be a positive integer.`,
			status: 2,
		} );
	}

	const parsed = Number.parseInt( value, 10 );
	if ( ! Number.isSafeInteger( parsed ) || parsed <= 0 ) {
		throw new CliError( {
			code: 'invalid_positive_integer',
			message: `${ name } must be a positive integer.`,
			status: 2,
		} );
	}

	return parsed;
}

export function parseOptionalPositiveInteger(value: string | undefined, name: string): number | undefined {
	return value === undefined ? undefined : parsePositiveInteger( value, name );
}
