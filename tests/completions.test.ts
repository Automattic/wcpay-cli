import { describe, expect, it, vi } from 'vitest';
import { buildProgram } from '../src/app.js';

async function runCommand( args: string[] ): Promise< {
	stdout: string;
	stderr: string;
	exitCode: NodeJS.Process[ 'exitCode' ];
} > {
	let stdout = '';
	let stderr = '';
	const previousExitCode = process.exitCode;
	const stdoutSpy = vi.spyOn( process.stdout, 'write' ).mockImplementation( ( chunk: string | Uint8Array ) => {
		stdout += chunk.toString();
		return true;
	} );
	const stderrSpy = vi.spyOn( process.stderr, 'write' ).mockImplementation( ( chunk: string | Uint8Array ) => {
		stderr += chunk.toString();
		return true;
	} );

	process.exitCode = undefined;

	try {
		await buildProgram().parseAsync( [ 'node', 'wcpay', ...args ] );
		return { stdout, stderr, exitCode: process.exitCode };
	} finally {
		stdoutSpy.mockRestore();
		stderrSpy.mockRestore();
		process.exitCode = previousExitCode;
	}
}

describe( 'completions command', () => {
	it( 'reports unsupported shells as a concise human-readable error', async () => {
		const result = await runCommand( [ 'completions', 'fish' ] );

		expect( result.exitCode ).toBe( 1 );
		expect( result.stdout ).toBe( '' );
		expect( result.stderr ).toBe( 'Error: Unsupported shell: fish. Supported shells: bash, zsh.\n' );
		expect( result.stderr ).not.toContain( 'at getCompletionScript' );
	} );

	it( 'reports unsupported shells as structured JSON when requested', async () => {
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
		expect( result.stdout ).not.toContain( 'at getCompletionScript' );
	} );

	it.each( [
		[ 'bash', '_complete_wcpay' ],
		[ 'zsh', 'compdef _wcpay wcpay' ],
	] )( 'prints %s completion scripts', async ( shell, expectedSnippet ) => {
		const result = await runCommand( [ 'completions', shell ] );

		expect( result.exitCode ).toBeUndefined();
		expect( result.stderr ).toBe( '' );
		expect( result.stdout ).toContain( expectedSnippet );
	} );
} );
