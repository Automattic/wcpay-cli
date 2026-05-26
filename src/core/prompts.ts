import { confirm, input, password } from '@inquirer/prompts';
import { CliError } from './errors.js';

export async function promptText(label: string): Promise<string> {
	ensureInteractive();
	return (await input({ message: stripTrailingColon(label) })).trim();
}

export async function promptSecret(label: string): Promise<string> {
	ensureInteractive();
	return (await password({ message: stripTrailingColon(label), mask: '*' })).trim();
}

export async function promptConfirm(label: string, defaultValue = false): Promise<boolean> {
	ensureInteractive();
	return confirm({ message: stripTrailingColon(label), default: defaultValue });
}

function ensureInteractive(): void {
	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		throw new CliError({
			code: 'interactive_auth_required',
			message:
				'Interactive auth needs credentials. Pass --consumer-key/--consumer-secret or set WCPAY_CONSUMER_KEY/WCPAY_CONSUMER_SECRET.',
			status: 2,
		});
	}
}

function stripTrailingColon(label: string): string {
	return label.replace(/:\s*$/, '');
}
