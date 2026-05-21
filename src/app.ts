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
import { registerStubCommands } from './commands/stubs.js';
import { registerToolsCommands } from './commands/tools.js';
import { registerWriteCommands } from './commands/writes.js';

export function buildProgram(): Command {
	const program = new Command();

	program
		.name( 'wcpay' )
		.description( 'Standalone WooPayments CLI for developers, agents, and test-mode workflows.' )
		.version( '0.0.0' )
		.option( '--profile <name>', 'Use a specific site profile.' )
		.option( '--site <url>', 'Override the site URL for this command.' )
		.option( '--json', 'Emit JSON output.' )
		.option( '--redact', 'Redact sensitive values.' )
		.option( '--no-redact', 'Disable redaction where supported.' )
		.option( '--dry-run', 'Resolve and validate without sending write requests.' )
		.option( '--yes', 'Skip interactive confirmation prompts where supported.' )
		.option( '--verbose', 'Print verbose request/response diagnostics to stderr.' )
		.option( '--debug', 'Print debug diagnostics to stderr.' )
		.option( '--timeout <seconds>', 'HTTP timeout in seconds.' );

	registerLoginCommand( program );
	registerAuthCommands( program );
	registerProfileCommands( program );
	registerWhoamiCommand( program );
	registerApiCommand( program );
	registerReadCommands( program );
	registerResourceCommands( program );
	registerWriteCommands( program );
	registerMcpCommand( program );
	registerCompletionsCommand( program );
	registerStubCommands( program );
	registerToolsCommands( program );

	return program;
}
