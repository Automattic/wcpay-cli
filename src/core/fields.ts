import { CliError } from './errors.js';
import { isReadMethod } from './api.js';

export interface ParsedFields {
	query: Record<string, unknown>;
	body: Record<string, unknown> | undefined;
}

export function parseApiFields( method: string, fields: string[] ): ParsedFields {
	const parsed = parseAssignments( fields );
	if ( isReadMethod( method ) || method.toUpperCase() === 'DELETE' ) {
		return { query: parsed, body: undefined };
	}

	return { query: {}, body: parsed };
}

export function parseAssignments( fields: string[] ): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for ( const field of fields ) {
		const assignment = parseAssignment( field );
		result[ assignment.key ] = assignment.value;
	}
	return result;
}

export function parseAssignment( field: string ): { key: string; value: unknown } {
	const typedIndex = field.indexOf( ':=' );
	if ( typedIndex > 0 ) {
		const key = field.slice( 0, typedIndex );
		const rawValue = field.slice( typedIndex + 2 );
		return { key: validateKey( key ), value: parseJsonValue( rawValue, field ) };
	}

	const stringIndex = field.indexOf( '=' );
	if ( stringIndex > 0 ) {
		const key = field.slice( 0, stringIndex );
		return { key: validateKey( key ), value: field.slice( stringIndex + 1 ) };
	}

	throw new CliError( {
		code: 'invalid_field_assignment',
		message: `Invalid field assignment: ${ field }. Use key=value or key:=json.`,
		status: 2,
	} );
}

function validateKey( key: string ): string {
	if ( ! key ) {
		throw new CliError( {
			code: 'invalid_field_assignment',
			message: 'Field assignment key cannot be empty.',
			status: 2,
		} );
	}
	return key;
}

function parseJsonValue( rawValue: string, field: string ): unknown {
	try {
		return JSON.parse( rawValue );
	} catch {
		throw new CliError( {
			code: 'invalid_json_field_value',
			message: `Invalid JSON value in field assignment: ${ field }`,
			status: 2,
		} );
	}
}
