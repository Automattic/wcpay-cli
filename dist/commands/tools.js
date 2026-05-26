import { getToolRegistry } from '../tools/registry.js';
import { printSuccess } from '../core/output.js';
export function registerToolsCommands(program) {
    const tools = program.command('tools').description('Inspect agent/tool metadata.');
    tools
        .command('describe')
        .description('Print machine-readable command/tool descriptions.')
        .option('--json', 'Emit JSON output.', true)
        .action((options) => {
        const data = { tools: getToolRegistry() };
        printSuccess(data, {
            json: options.json !== false,
            human: getToolRegistry().map((tool) => `${tool.name}\t${tool.command}`).join('\n'),
        });
    });
    tools
        .command('schema')
        .description('Print JSON schemas for standard CLI envelopes.')
        .option('--json', 'Emit JSON output.', true)
        .action((options) => {
        const data = {
            schemas: {
                envelope: {
                    type: 'object',
                    required: ['ok'],
                    properties: {
                        ok: { type: 'boolean' },
                        data: {},
                        error: {
                            type: 'object',
                            required: ['code', 'message'],
                            properties: {
                                code: { type: 'string' },
                                message: { type: 'string' },
                                status: { type: 'number' },
                                details: {},
                            },
                        },
                        meta: { type: 'object' },
                    },
                },
            },
        };
        printSuccess(data, {
            json: options.json !== false,
            human: JSON.stringify(data, null, 2),
        });
    });
}
//# sourceMappingURL=tools.js.map