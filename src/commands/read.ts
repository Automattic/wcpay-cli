import { Command } from 'commander';
import { createContext } from '../core/context.js';
import { classifyMode, ModeService } from '../core/mode.js';
import { formatKeyValue } from '../core/format.js';
import { printError, printSuccess } from '../core/output.js';
import { describeSecretStorage } from '../core/secrets.js';
import { formatCommand, formatMuted } from '../core/ux.js';

export function registerReadCommands(program: Command): void {
	program
		.command('mode')
		.description('Show WooPayments mode for the selected profile.')
		.option('--json', 'Emit JSON output.')
		.action(async (options: { json?: boolean }) => {
			const json = isJson(program, options);
			await runReadAction({ json }, async () => {
				const context = await createContext({ profile: program.opts().profile });
				const modeService = new ModeService(context.client);
				const settings = await modeService.getSettings();
				const mode = classifyMode(settings);
				printSuccess(
					{ mode, settings },
					{
						json,
						human: mode,
					}
				);
			});
		});

	program
		.command('doctor')
		.description('Run WooPayments diagnostics.')
		.option('--json', 'Emit JSON output.')
		.option('--redact', 'Redact sensitive values.', true)
		.action(async (options: { json?: boolean }) => {
			const json = isJson(program, options);
			await runReadAction({ json }, async () => {
				const context = await createContext({ profile: program.opts().profile });
				const checks: DoctorCheck[] = [];
				checks.push(pass('profile', context.profile.name));
				checks.push(pass('site_url', context.profile.siteUrl));
				checks.push(pass('credentials_storage', describeSecretStorage()));

				const settings = await context.client.request({
					method: 'GET',
					path: '/wc/v3/payments/settings',
				});
				const mode = classifyMode(settings as Record<string, unknown>);
				checks.push(pass('auth', 'Credentials accepted.'));
				checks.push(
					mode === 'live'
						? warn('mode', 'live — write commands will be blocked')
						: pass('mode', mode)
				);
				checks.push(
					(settings as Record<string, unknown>).is_wcpay_enabled === false
						? warn('payments_enabled', 'WooPayments appears disabled')
						: pass('payments_enabled', 'WooPayments settings are reachable')
				);

				await addAccountCheck(checks, context);
				await addBrowserLoginCheck(checks, context);

				const summary = summarizeChecks(checks);
				printSuccess(
					{ profile: context.profile.name, site: context.profile.siteUrl, mode, summary, checks },
					{
						json,
						human: formatDoctorChecks(checks, summary),
					}
				);
			});
		});

	const account = program
		.command('account')
		.description('Inspect WooPayments account information.');
	account
		.command('status')
		.description('Show account status.')
		.option('--json', 'Emit JSON output.')
		.action(async (options: { json?: boolean }) => {
			const json = isJson(program, options);
			await runReadAction({ json }, async () => {
				const context = await createContext({ profile: program.opts().profile });
				const data = await context.client.request({ method: 'GET', path: '/wc/v3/payments/accounts' });
				printSuccess(data, {
					json,
					human: formatAccountStatus(data, context.profile.siteUrl),
				});
			});
		});

	const settings = program.command('settings').description('Inspect WooPayments settings.');
	settings
		.command('get')
		.description('Show settings.')
		.option('--json', 'Emit JSON output.')
		.action(async (options: { json?: boolean }) => {
			const json = isJson(program, options);
			await runReadAction({ json }, async () => {
				const context = await createContext({ profile: program.opts().profile });
				const data = await context.client.request({
					method: 'GET',
					path: '/wc/v3/payments/settings',
				});
				printSuccess(data, { json, human: formatSettings(data, context.profile.siteUrl) });
			});
		});
}

type DoctorStatus = 'pass' | 'warn' | 'fail';

interface DoctorCheck {
	name: string;
	status: DoctorStatus;
	message: string;
	group: DoctorGroup;
	details?: unknown;
}

type DoctorGroup = 'setup' | 'connection' | 'woopayments';

const DOCTOR_GROUPS: Array<{ key: DoctorGroup; label: string }> = [
	{ key: 'setup', label: 'Local setup' },
	{ key: 'connection', label: 'Connection' },
	{ key: 'woopayments', label: 'WooPayments' },
];

const DOCTOR_GROUP_BY_CHECK: Record<string, DoctorGroup> = {
	profile: 'setup',
	site_url: 'setup',
	credentials_storage: 'setup',
	auth: 'connection',
	browser_login: 'connection',
	mode: 'woopayments',
	payments_enabled: 'woopayments',
	account: 'woopayments',
};

function pass(name: string, message: string, details?: unknown): DoctorCheck {
	return check(name, 'pass', message, details);
}

function warn(name: string, message: string, details?: unknown): DoctorCheck {
	return check(name, 'warn', message, details);
}

function fail(name: string, message: string, details?: unknown): DoctorCheck {
	return check(name, 'fail', message, details);
}

function check(
	name: string,
	status: DoctorStatus,
	message: string,
	details?: unknown
): DoctorCheck {
	return {
		name,
		status,
		message,
		group: DOCTOR_GROUP_BY_CHECK[name] ?? 'setup',
		...(details !== undefined ? { details } : {}),
	};
}

async function addAccountCheck(
	checks: DoctorCheck[],
	context: Awaited<ReturnType<typeof createContext>>
): Promise<void> {
	try {
		const account = await context.client.request({ method: 'GET', path: '/wc/v3/payments/accounts' });
		if (account === false) {
			checks.push(warn('account', 'WooPayments account is not connected or unavailable'));
			return;
		}
		if (account && typeof account === 'object') {
			const accountRecord = account as Record<string, unknown>;
			checks.push(
				pass(
					'account',
					`status: ${String(accountRecord.status ?? 'unknown')}`,
					{
						country: accountRecord.country,
						is_live: accountRecord.is_live,
						payments_enabled: accountRecord.payments_enabled,
					}
				)
			);
			return;
		}
		checks.push(warn('account', 'Unexpected account response'));
	} catch (error) {
		checks.push(fail('account', errorMessage(error), errorDetails(error)));
	}
}

async function addBrowserLoginCheck(
	checks: DoctorCheck[],
	context: Awaited<ReturnType<typeof createContext>>
): Promise<void> {
	try {
		await context.client.request({ method: 'OPTIONS', path: '/wc/v3/payments/cli/authorize' });
		checks.push(pass('browser_login', 'Browser login endpoint is available'));
	} catch (error) {
		checks.push(warn('browser_login', 'Browser login endpoint is not available; manual API key login will be used', errorDetails(error)));
	}
}

function summarizeChecks(checks: DoctorCheck[]): Record<DoctorStatus, number> {
	return {
		pass: checks.filter((check) => check.status === 'pass').length,
		warn: checks.filter((check) => check.status === 'warn').length,
		fail: checks.filter((check) => check.status === 'fail').length,
	};
}

function formatDoctorChecks(checks: DoctorCheck[], summary: Record<DoctorStatus, number>): string {
	const lines = [
		'WooPayments CLI doctor',
		formatMuted(`${summary.pass} passed · ${summary.warn} warnings · ${summary.fail} failed`),
		'',
	];

	for (const group of DOCTOR_GROUPS) {
		const groupChecks = checks.filter((check) => check.group === group.key);
		if (groupChecks.length === 0) {
			continue;
		}
		lines.push(group.label);
		for (const check of groupChecks) {
			lines.push(`  ${doctorIcon(check.status)} ${formatDoctorName(check.name)} ${formatMuted(check.message)}`);
		}
		lines.push('');
	}

	const nextSteps = getDoctorNextSteps(checks);
	if (nextSteps.length > 0) {
		lines.push('Next steps');
		for (const step of nextSteps) {
			lines.push(`  • ${step}`);
		}
		lines.push('');
	}

	return lines.join('\n').trimEnd();
}

function doctorIcon(status: DoctorStatus): string {
	if (status === 'pass') {
		return '✓';
	}
	if (status === 'warn') {
		return '!';
	}
	return '✗';
}

function formatDoctorName(name: string): string {
	return name.replace(/_/g, ' ').padEnd(19, ' ');
}

function getDoctorNextSteps(checks: DoctorCheck[]): string[] {
	const steps: string[] = [];
	if (checks.some((checkItem) => checkItem.status === 'fail')) {
		steps.push(`Run ${formatCommand('wcpay doctor --json')} for structured error details.`);
	}
	if (checks.some((checkItem) => checkItem.name === 'browser_login' && checkItem.status === 'warn')) {
		steps.push(`Use ${formatCommand('wcpay login --no-browser')} if browser login is not supported by this store.`);
	}
	if (checks.some((checkItem) => checkItem.name === 'mode' && checkItem.status === 'warn')) {
		steps.push('Live-mode stores are read-only in wcpay; switch WooPayments to test/dev mode before write commands.');
	}
	return steps;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function errorDetails(error: unknown): unknown {
	return error && typeof error === 'object' && 'code' in error
		? {
				code: String(error.code),
				...('status' in error && typeof error.status === 'number' ? { status: error.status } : {}),
			}
		: undefined;
}

function formatAccountStatus(data: unknown, site: string): string {
	if (data === false) {
		return formatKeyValue({ Site: site, Account: 'not connected or unavailable' });
	}
	if (data && typeof data === 'object') {
		const account = data as Record<string, unknown>;
		return formatKeyValue({
			Site: site,
			Status: account.status,
			Country: account.country,
			'Test mode': account.test_mode,
			'Test onboarding': account.test_mode_onboarding,
			Currency: getNested(account, ['store_currencies', 'default']),
		});
	}
	return String(data);
}

function formatSettings(data: unknown, site: string): string {
	if (data && typeof data === 'object') {
		const settings = data as Record<string, unknown>;
		return formatKeyValue({
			Site: site,
			Mode: settings.is_dev_mode_enabled
				? 'dev'
				: settings.is_test_mode_enabled
					? 'test'
					: 'live',
			Enabled: settings.is_wcpay_enabled,
			'Test mode': settings.is_test_mode_enabled,
			'Dev mode': settings.is_dev_mode_enabled,
			Country: settings.account_country,
			Currency: settings.account_domestic_currency,
			Deposits: settings.deposit_status,
		});
	}
	return String(data);
}

function getNested(object: Record<string, unknown>, path: string[]): unknown {
	let current: unknown = object;
	for (const key of path) {
		if (!current || typeof current !== 'object' || !(key in current)) {
			return undefined;
		}
		current = (current as Record<string, unknown>)[key];
	}
	return current;
}

function isJson(program: Command, options: { json?: boolean }): boolean {
	return Boolean(options.json || (program.opts() as { json?: boolean }).json);
}

async function runReadAction(
	options: { json?: boolean },
	action: () => Promise<void>
): Promise<void> {
	try {
		await action();
	} catch (error) {
		printError(error, { json: options.json });
		process.exitCode = 1;
	}
}
