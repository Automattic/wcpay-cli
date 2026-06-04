import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildProgram } from '../src/app.js';

async function runCommand( args: string[] ): Promise<{ stdout: string; stderr: string; exitCode: string | number | undefined }> {
	let stdout = '';
	let stderr = '';

	vi.spyOn( process.stdout, 'write' ).mockImplementation( ( chunk: string | Uint8Array ) => {
		stdout += chunk.toString();
		return true;
	} );
	vi.spyOn( process.stderr, 'write' ).mockImplementation( ( chunk: string | Uint8Array ) => {
		stderr += chunk.toString();
		return true;
	} );

	process.exitCode = undefined;
	const program = buildProgram();
	await program.parseAsync( args, { from: 'user' } );

	return { stdout, stderr, exitCode: process.exitCode };
}

afterEach( () => {
	vi.restoreAllMocks();
	process.exitCode = undefined;
} );

describe( 'completions command', () => {
	it( 'prints bash completions', async () => {
		const result = await runCommand( [ 'completions', 'bash' ] );

		expect( result.exitCode ).toBeUndefined();
		expect( result.stderr ).toBe( '' );
		expect( result.stdout ).toContain( 'complete -F _complete_wcpay wcpay' );
	} );

	it( 'prints zsh completions', async () => {
		const result = await runCommand( [ 'completions', 'zsh' ] );

		expect( result.exitCode ).toBeUndefined();
		expect( result.stderr ).toBe( '' );
		expect( result.stdout ).toContain( 'compdef _wcpay wcpay' );
	} );

	it( 'prints a concise error for unsupported shells', async () => {
		const result = await runCommand( [ 'completions', 'fish' ] );

		expect( result.exitCode ).toBe( 1 );
		expect( result.stdout ).toBe( '' );
		expect( result.stderr ).toBe( 'Error: Unsupported shell: fish. Supported shells: bash, zsh.\n' );
		expect( result.stderr ).not.toContain( 'at ' );
	} );

	it( 'prints a structured JSON error for unsupported shells', async () => {
		const result = await runCommand( [ 'completions', 'fish', '--json' ] );

		expect( result.exitCode ).toBe( 1 );
		expect( result.stderr ).toBe( '' );
		expect( JSON.parse( result.stdout ) ).toEqual( {
			ok: false,
			error: {
				code: 'unsupported_shell',
				message: 'Unsupported shell: fish. Supported shells: bash, zsh.',
				status: 1,
			},
		} );
	} );
} );
