import { Command } from 'commander';
import { printError } from '../core/output.js';

export function isJsonOutput(program: Command, options: { json?: boolean }): boolean {
	return Boolean(options.json || (program.opts() as { json?: boolean }).json);
}

export async function runCommandAction(
	options: { json?: boolean },
	action: () => Promise<void>
): Promise<void> {
	try {
		await action();
	} catch (error) {
		printError(error, { json: options.json });
	}
}
