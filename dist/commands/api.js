import { isReadMethod, normalizeMethod, normalizeRestPath } from '../core/api.js';
import { createContext } from '../core/context.js';
import { CliError } from '../core/errors.js';
import { ModeService } from '../core/mode.js';
import { printError, printSuccess } from '../core/output.js';
import { parseApiFields } from '../core/fields.js';
import { redactHeaders, redactUrl } from '../core/redact.js';
export function registerApiCommand(program) {
    program
        .command('api <method> <path> [fields...]')
        .description('Make an authenticated store REST API request.')
        .option('--json', 'Emit JSON output.')
        .option('--dry-run', 'Print the request without sending it.')
        .option('--allow-unsafe-path', 'Allow raw write requests outside reviewed WooPayments/WooCommerce paths.')
        .action(async (methodInput, path, rawFields, localOptions) => {
        const parsed = extractTrailingFlags(rawFields);
        const globalOptions = program.opts();
        const options = {
            json: Boolean(localOptions.json || globalOptions.json || parsed.json),
            dryRun: Boolean(localOptions.dryRun || globalOptions.dryRun || parsed.dryRun),
            allowUnsafePath: Boolean(localOptions.allowUnsafePath || parsed.allowUnsafePath),
            profile: globalOptions.profile,
        };
        try {
            const method = normalizeMethod(methodInput);
            const fields = parseApiFields(method, parsed.fields);
            const context = await createContext({ profile: options.profile });
            const modeService = new ModeService(context.client);
            if (!isReadMethod(method)) {
                assertReviewedWritePath(path, options.allowUnsafePath);
                await modeService.assertWriteAllowed(method, path);
            }
            const request = {
                method,
                path,
                query: fields.query,
                body: fields.body,
            };
            if (options.dryRun) {
                const resolved = context.client.resolve(request);
                printSuccess({
                    method: resolved.method,
                    url: redactUrl(resolved.url),
                    headers: redactHeaders(resolved.headers),
                    body: resolved.body ? JSON.parse(resolved.body) : undefined,
                }, {
                    json: options.json,
                    human: `${resolved.method} ${redactUrl(resolved.url)}`,
                });
                return;
            }
            const data = await context.client.request(request);
            printSuccess(data, { json: options.json });
        }
        catch (error) {
            printError(error, { json: options.json });
            process.exitCode = 1;
        }
    });
}
function extractTrailingFlags(fields) {
    let json = false;
    let dryRun = false;
    let allowUnsafePath = false;
    const remaining = [];
    for (const field of fields) {
        if (field === '--json') {
            json = true;
            continue;
        }
        if (field === '--dry-run') {
            dryRun = true;
            continue;
        }
        if (field === '--allow-unsafe-path') {
            allowUnsafePath = true;
            continue;
        }
        remaining.push(field);
    }
    return { fields: remaining, json, dryRun, allowUnsafePath };
}
export function assertReviewedWritePath(path, allowUnsafePath) {
    const normalized = normalizeRestPath(path);
    if (isReviewedWritePath(normalized) || allowUnsafePath) {
        return;
    }
    throw new CliError({
        code: 'unsafe_api_write_path',
        message: `Refusing raw write request to ${normalized}. Raw writes are limited to reviewed WooPayments paths and /wc/v3/orders. Pass --allow-unsafe-path only if you understand the risk.`,
        status: 2,
    });
}
export function isReviewedWritePath(path) {
    return (path.startsWith('/wc/v3/payments/') ||
        path === '/wc/v3/payments' ||
        path.startsWith('/wc/v3/orders'));
}
//# sourceMappingURL=api.js.map