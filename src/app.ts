import { Command } from 'commander';
import { registerApiCommand } from './commands/api.js';
import { registerAuthorizationCommands } from './commands/authorizations.js';
import {
	registerAuthCommands,
	registerLoginCommand,
	registerProfileCommands,
	registerWhoamiCommand,
} from './commands/auth.js';
import { registerCompletionsCommand } from './commands/completions.js';
import { registerMcpCommand } from './commands/mcp.js';
import { registerOrderCommands } from './commands/orders.js';
import { registerReadCommands } from './commands/read.js';
import { registerResourceCommands } from './commands/resources.js';
import { registerToolsCommands } from './commands/tools.js';
import { registerWriteCommands } from './commands/writes.js';
import { ENV_DEBUG, ENV_TIMEOUT } from './core/config.js';
import { printSuccess } from './core/output.js';
import type { GlobalOptions } from './core/types.js';
import { printWelcome } from './core/ux.js';
import { VERSION } from './core/version.js';

export function buildProgram(): Command {
	const program = new Command();

	program
		.name('wcpay')
		.description('Standalone WooPayments CLI for developers, agents, and test-mode workflows.')
		.version(VERSION)
		.option('--profile <name>', 'Use a specific site profile.')
		.option('--json', 'Emit JSON output.')
		.option('--dry-run', 'Resolve and validate without sending write requests.')
		.option('--yes', 'Skip interactive confirmation prompts where supported.')
		.option('--verbose', 'Print request/response debug logs to stderr.')
		.option('--timeout <seconds>', 'HTTP request timeout in seconds.')
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

	program.hook('preAction', () => {
		const options = program.opts() as GlobalOptions;
		if (options.verbose) {
			process.env[ENV_DEBUG] = '1';
		}
		if (options.timeout) {
			process.env[ENV_TIMEOUT] = options.timeout;
		}
	});

	registerLoginCommand(program);
	registerAuthCommands(program);
	registerProfileCommands(program);
	registerWhoamiCommand(program);
	registerApiCommand(program);
	registerReadCommands(program);
	registerResourceCommands(program);
	registerAuthorizationCommands(program);
	registerOrderCommands(program);
	registerWriteCommands(program);
	registerMcpCommand(program);
	registerCompletionsCommand(program);
	registerToolsCommands(program);

	return program;
}
