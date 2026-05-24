import { Command } from 'commander';
import {
	WCPAY_ABILITIES,
	listAbilities,
	runReadAbilityWithRestFallback,
} from '../core/abilities.js';
import { createContext } from '../core/context.js';
import { classifyMode, ModeService } from '../core/mode.js';
import { formatKeyValue } from '../core/format.js';
import { printError, printSuccess } from '../core/output.js';
import { describeSecretStorage } from '../core/secrets.js';

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
				await addAbilitiesCheck(checks, context);

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
				const data = await runReadAbilityWithRestFallback(
					context.client,
					WCPAY_ABILITIES.getAccount,
					{},
					() =>
						context.client.request({ method: 'GET', path: '/wc/v3/payments/accounts' })
				);
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
	details?: unknown;
}

function pass(name: string, message: string, details?: unknown): DoctorCheck {
	return { name, status: 'pass', message, ...(details !== undefined ? { details } : {}) };
}

function warn(name: string, message: string, details?: unknown): DoctorCheck {
	return { name, status: 'warn', message, ...(details !== undefined ? { details } : {}) };
}

function fail(name: string, message: string, details?: unknown): DoctorCheck {
	return { name, status: 'fail', message, ...(details !== undefined ? { details } : {}) };
}

async function addAccountCheck(
	checks: DoctorCheck[],
	context: Awaited<ReturnType<typeof createContext>>
): Promise<void> {
	try {
		const account = await runReadAbilityWithRestFallback(
			context.client,
			WCPAY_ABILITIES.getAccount,
			{},
			() => context.client.request({ method: 'GET', path: '/wc/v3/payments/accounts' })
		);
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

async function addAbilitiesCheck(
	checks: DoctorCheck[],
	context: Awaited<ReturnType<typeof createContext>>
): Promise<void> {
	try {
		const abilities = await listAbilities(context.client);
		if (abilities.length === 0) {
			checks.push(warn('abilities', 'No WooPayments abilities are exposed; REST fallbacks will be used'));
			return;
		}
		checks.push(pass('abilities', `${abilities.length} WooPayments abilities exposed`));
	} catch (error) {
		checks.push(warn('abilities', 'Could not inspect WooPayments abilities; REST fallbacks will be used', errorDetails(error)));
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
	return [
		`Doctor summary: ${summary.pass} passed, ${summary.warn} warnings, ${summary.fail} failed`,
		'',
		...checks.map((check) => `${doctorIcon(check.status)} ${check.name}\t${check.message}`),
	].join('\n');
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
