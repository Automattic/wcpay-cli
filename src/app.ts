import { Command } from 'commander';
import { registerApiCommand } from './commands/api.js';
import {
	registerAuthCommands,
	registerLoginCommand,
	registerProfileCommands,
	registerWhoamiCommand,
} from './commands/auth.js';
import { registerCompletionsCommand } from './commands/completions.js';
import { registerMcpCommand } from './commands/mcp.js';
import { registerReadCommands } from './commands/read.js';
import { registerResourceCommands } from './commands/resources.js';
import { registerToolsCommands } from './commands/tools.js';
import { registerWriteCommands } from './commands/writes.js';
import { printSuccess } from './core/output.js';
import { printWelcome } from './core/ux.js';

export function buildProgram(): Command {
	const program = new Command();

	program
		.name('wcpay')
		.description('Standalone WooPayments CLI for developers, agents, and test-mode workflows.')
		.version('0.0.0')
		.option('--profile <name>', 'Use a specific site profile.')
		.option('--json', 'Emit JSON output.')
		.option('--dry-run', 'Resolve and validate without sending write requests.')
		.option('--yes', 'Skip interactive confirmation prompts where supported.')
		.action(() => {
			if ((program.opts() as { json?: boolean }).json) {
				printSuccess(
					{
						message: 'WooPayments CLI',
						next: [
							'wcpay login --site https://store.example',
							'wcpay doctor',
							'wcpay mode',
						],
					},
					{ json: true }
				);
				return;
			}
			printWelcome();
		});

	registerLoginCommand(program);
	registerAuthCommands(program);
	registerProfileCommands(program);
	registerWhoamiCommand(program);
	registerApiCommand(program);
	registerReadCommands(program);
	registerResourceCommands(program);
	registerWriteCommands(program);
	registerMcpCommand(program);
	registerCompletionsCommand(program);
	registerToolsCommands(program);

	return program;
}
