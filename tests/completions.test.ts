import { describe, expect, it, vi } from 'vitest';
import { buildProgram } from '../src/app.js';
import { getCompletionScript } from '../src/commands/completions.js';

async function runCommand(args: string[]): Promise<{
	stdout: string;
	stderr: string;
	exitCode: NodeJS.Process['exitCode'];
}> {
	let stdout = '';
	let stderr = '';
	const previousExitCode = process.exitCode;
	const stdoutSpy = vi
		.spyOn(process.stdout, 'write')
		.mockImplementation((chunk: string | Uint8Array) => {
			stdout += chunk.toString();
			return true;
		});
	const stderrSpy = vi
		.spyOn(process.stderr, 'write')
		.mockImplementation((chunk: string | Uint8Array) => {
			stderr += chunk.toString();
			return true;
		});

	process.exitCode = undefined;

	try {
		await buildProgram().parseAsync(['node', 'wcpay', ...args]);
		return { stdout, stderr, exitCode: process.exitCode };
	} finally {
		stdoutSpy.mockRestore();
		stderrSpy.mockRestore();
		process.exitCode = previousExitCode;
	}
}

describe('completions command', () => {
	it('reports unsupported shells as a concise human-readable error', async () => {
		const result = await runCommand(['completions', 'powershell']);

		expect(result.exitCode).toBe(2);
		expect(result.stdout).toBe('');
		expect(result.stderr).toBe(
			'Error: Unsupported shell: powershell. Supported shells: bash, zsh, fish.\n'
		);
		expect(result.stderr).not.toContain('at getCompletionScript');
	});

	it('reports unsupported shells as structured JSON when requested', async () => {
		const result = await runCommand(['completions', 'powershell', '--json']);

		expect(result.exitCode).toBe(2);
		expect(result.stderr).toBe('');
		expect(JSON.parse(result.stdout)).toEqual({
			ok: false,
			error: {
				code: 'unsupported_completion_shell',
				message: 'Unsupported shell: powershell. Supported shells: bash, zsh, fish.',
				status: 2,
			},
		});
		expect(result.stdout).not.toContain('at getCompletionScript');
	});

	it.each([
		['bash', '_complete_wcpay'],
		['zsh', 'compdef _wcpay wcpay'],
		['fish', 'complete -c wcpay'],
	])('prints %s completion scripts', async (shell, expectedSnippet) => {
		const result = await runCommand(['completions', shell]);

		expect(result.exitCode).toBeUndefined();
		expect(result.stderr).toBe('');
		expect(result.stdout).toContain(expectedSnippet);
	});
});

describe('getCompletionScript', () => {
	it('includes every registered top-level command', () => {
		const program = buildProgram();
		const script = getCompletionScript(program, 'bash');
		const names = program.commands
			.map((command) => command.name())
			.filter((name) => name !== 'help');
		for (const name of names) {
			expect(script).toContain(name);
		}
	});

	it('includes subcommands in zsh output', () => {
		const script = getCompletionScript(buildProgram(), 'zsh');
		expect(script).toContain("'list:");
		expect(script).toContain('timeline)');
	});

	it('supports fish', () => {
		const script = getCompletionScript(buildProgram(), 'fish');
		expect(script).toContain('__fish_use_subcommand');
		expect(script).toContain('__fish_seen_subcommand_from transactions');
	});

	it('rejects unsupported shells', () => {
		expect(() => getCompletionScript(buildProgram(), 'powershell')).toThrow(
			'Unsupported shell'
		);
	});
});
