import { Command } from 'commander';
import { createContext } from '../core/context.js';
import {
	DOCTOR_GROUPS,
	runDoctorChecks,
	type DoctorCheck,
	type DoctorStatus,
} from '../core/doctor.js';
import { classifyMode, ModeService } from '../core/mode.js';
import { formatKeyValue } from '../core/format.js';
import { printSuccess } from '../core/output.js';
import { formatCommand, formatMuted } from '../core/ux.js';
import { isJsonOutput, runCommandAction } from './common.js';

export function registerReadCommands(program: Command): void {
	program
		.command('mode')
		.description('Show WooPayments mode for the selected profile.')
		.option('--json', 'Emit JSON output.')
		.action(async (options: { json?: boolean }) => {
			const json = isJsonOutput(program, options);
			await runCommandAction({ json }, async () => {
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
			const json = isJsonOutput(program, options);
			await runCommandAction({ json }, async () => {
				const context = await createContext({ profile: program.opts().profile });
				const { mode, checks, summary } = await runDoctorChecks(context);
				printSuccess(
					{
						profile: context.profile.name,
						site: context.profile.siteUrl,
						mode,
						summary,
						checks,
					},
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
			const json = isJsonOutput(program, options);
			await runCommandAction({ json }, async () => {
				const context = await createContext({ profile: program.opts().profile });
				const data = await context.client.request({
					method: 'GET',
					path: '/wc/v3/payments/accounts',
				});
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
			const json = isJsonOutput(program, options);
			await runCommandAction({ json }, async () => {
				const context = await createContext({ profile: program.opts().profile });
				const data = await context.client.request({
					method: 'GET',
					path: '/wc/v3/payments/settings',
				});
				printSuccess(data, { json, human: formatSettings(data, context.profile.siteUrl) });
			});
		});
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
			lines.push(
				`  ${doctorIcon(check.status)} ${formatDoctorName(check.name)} ${formatMuted(check.message)}`
			);
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
	if (checks.some((checkItem) => checkItem.name === 'mode' && checkItem.status === 'warn')) {
		steps.push(
			'Live-mode stores are read-only in wcpay; switch WooPayments to test/dev mode before write commands.'
		);
	}
	return steps;
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
