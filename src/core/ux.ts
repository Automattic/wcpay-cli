import figlet from 'figlet';
import ora from 'ora';
import pc from 'picocolors';

export function isPrettyTerminal(env: NodeJS.ProcessEnv = process.env): boolean {
	return Boolean(process.stdout.isTTY && process.stderr.isTTY && !env.CI);
}

export function logo(): string {
	return figlet.textSync('wcpay', { font: 'Small' }).trimEnd();
}

export function printWelcome(): void {
	if (isPrettyTerminal()) {
		process.stdout.write(`${pc.cyan(logo())}\n\n`);
	}

	process.stdout.write(
		[
			`${pc.bold('WooPayments CLI')}`,
			'',
			'Inspect, debug, and safely exercise WooPayments stores from your terminal.',
			'',
			`${pc.bold('Start by connecting a store:')}`,
			`  ${pc.cyan('wcpay login --site https://store.example')}`,
			'',
			`${pc.bold('Useful next commands:')}`,
			`  ${pc.cyan('wcpay doctor')}`,
			`  ${pc.cyan('wcpay mode')}`,
			`  ${pc.cyan('wcpay transactions list --limit 10')}`,
			'',
		].join('\n')
	);
}

export function printLoginIntro(): void {
	if (!isPrettyTerminal()) {
		return;
	}

	process.stdout.write(
		[
			pc.cyan(logo()),
			'',
			`${pc.bold('Connect a WooPayments store')}`,
			pc.dim(
				'Use WooCommerce REST API keys to inspect payments, deposits, disputes, and test-mode workflows.'
			),
			'',
		].join('\n')
	);
}

export async function withSpinner<T>(
	message: string,
	action: () => Promise<T>,
	options: { enabled?: boolean; successText?: string } = {}
): Promise<T> {
	if (!options.enabled || !isPrettyTerminal()) {
		return action();
	}

	const spinner = ora(message).start();
	try {
		const result = await action();
		spinner.succeed(options.successText ?? message);
		return result;
	} catch (error) {
		spinner.fail(message);
		throw error;
	}
}

export function formatCheck(message: string): string {
	return `${pc.green('✓')} ${message}`;
}

export function formatMuted(message: string): string {
	return pc.dim(message);
}

export function formatCommand(command: string): string {
	return pc.cyan(command);
}

export function formatWarning(message: string): string {
	return `${pc.yellow('!')} ${message}`;
}
