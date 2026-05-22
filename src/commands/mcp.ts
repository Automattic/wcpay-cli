import { Command } from 'commander';
import { runMcpServer } from '../mcp/server.js';
import { printError } from '../core/output.js';

export function registerMcpCommand( program: Command ): void {
	program
		.command( 'mcp' )
		.description( 'Run the WooPayments CLI MCP server over stdio.' )
		.action( async () => {
			try {
				await runMcpServer();
			} catch ( error ) {
				printError( error, { json: false } );
				process.exitCode = 1;
			}
		} );
}
