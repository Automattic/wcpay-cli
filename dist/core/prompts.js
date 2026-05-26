import { confirm, input, password } from '@inquirer/prompts';
import { CliError } from './errors.js';
export async function promptText(label) {
    ensureInteractive();
    return (await input({ message: stripTrailingColon(label) })).trim();
}
export async function promptSecret(label) {
    ensureInteractive();
    return (await password({ message: stripTrailingColon(label), mask: '*' })).trim();
}
export async function promptConfirm(label, defaultValue = false) {
    ensureInteractive();
    return confirm({ message: stripTrailingColon(label), default: defaultValue });
}
function ensureInteractive() {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
        throw new CliError({
            code: 'interactive_auth_required',
            message: 'No-browser auth needs credentials. Pass --consumer-key/--consumer-secret or set WCPAY_CONSUMER_KEY/WCPAY_CONSUMER_SECRET.',
            status: 2,
        });
    }
}
function stripTrailingColon(label) {
    return label.replace(/:\s*$/, '');
}
//# sourceMappingURL=prompts.js.map