import { CliError } from './errors.js';
export function printJson(envelope) {
    process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
}
export function printHuman(message) {
    process.stdout.write(`${message}\n`);
}
export function printSuccess(data, options = {}) {
    if (options.json) {
        printJson({ ok: true, data, meta: options.meta });
        return;
    }
    if (options.human) {
        printHuman(options.human);
        return;
    }
    printHuman(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
}
export function printError(error, options = {}) {
    const cliError = error instanceof CliError
        ? error
        : new CliError({
            code: 'unexpected_error',
            message: error instanceof Error ? error.message : String(error),
            status: 1,
        });
    if (options.json) {
        printJson({ ok: false, error: cliError.toJSON() });
        return;
    }
    process.stderr.write(`Error: ${cliError.message}\n`);
}
//# sourceMappingURL=output.js.map