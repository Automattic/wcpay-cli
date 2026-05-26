import { runMcpServer } from '../mcp/server.js';
import { printError } from '../core/output.js';
export function registerMcpCommand(program) {
    program
        .command('mcp')
        .description('Run the WooPayments CLI MCP server over stdio.')
        .action(async () => {
        try {
            await runMcpServer();
        }
        catch (error) {
            printError(error, { json: false });
            process.exitCode = 1;
        }
    });
}
//# sourceMappingURL=mcp.js.map