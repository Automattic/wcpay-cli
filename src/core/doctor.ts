import type { RestClient } from './api.js';
import { classifyMode, type WcpayMode } from './mode.js';
import type { Profile } from './profiles.js';
import { describeSecretStorage } from './secrets.js';

export type DoctorStatus = 'pass' | 'warn' | 'fail';
export type DoctorGroup = 'setup' | 'woopayments';

export interface DoctorCheck {
	name: string;
	status: DoctorStatus;
	message: string;
	group: DoctorGroup;
	details?: unknown;
}

export interface DoctorResult {
	mode: WcpayMode;
	checks: DoctorCheck[];
	summary: Record<DoctorStatus, number>;
}

export const DOCTOR_GROUPS: Array<{ key: DoctorGroup; label: string }> = [
	{ key: 'setup', label: 'Local setup' },
	{ key: 'woopayments', label: 'WooPayments' },
];

const DOCTOR_GROUP_BY_CHECK: Record<string, DoctorGroup> = {
	profile: 'setup',
	site_url: 'setup',
	credentials_storage: 'setup',
	auth: 'setup',
	mode: 'woopayments',
	payments_enabled: 'woopayments',
	account: 'woopayments',
};

export async function runDoctorChecks(input: {
	profile: Profile;
	client: RestClient;
}): Promise<DoctorResult> {
	const checks: DoctorCheck[] = [];
	checks.push(pass('profile', input.profile.name));
	checks.push(pass('site_url', input.profile.siteUrl));
	checks.push(pass('credentials_storage', describeSecretStorage()));

	const settings = await input.client.request({
		method: 'GET',
		path: '/wc/v3/payments/settings',
	});
	const mode = classifyMode(settings as Record<string, unknown>);
	checks.push(pass('auth', 'Credentials accepted.'));
	checks.push(
		mode === 'live' ? warn('mode', 'live — write commands will be blocked') : pass('mode', mode)
	);
	checks.push(
		(settings as Record<string, unknown>).is_wcpay_enabled === false
			? warn('payments_enabled', 'WooPayments appears disabled')
			: pass('payments_enabled', 'WooPayments settings are reachable')
	);

	await addAccountCheck(checks, input.client);

	return { mode, checks, summary: summarizeChecks(checks) };
}

async function addAccountCheck(checks: DoctorCheck[], client: RestClient): Promise<void> {
	try {
		const account = await client.request({ method: 'GET', path: '/wc/v3/payments/accounts' });
		if (account === false) {
			checks.push(warn('account', 'WooPayments account is not connected or unavailable'));
			return;
		}
		if (account && typeof account === 'object') {
			const accountRecord = account as Record<string, unknown>;
			checks.push(
				pass('account', `status: ${String(accountRecord.status ?? 'unknown')}`, {
					country: accountRecord.country,
					is_live: accountRecord.is_live,
					payments_enabled: accountRecord.payments_enabled,
				})
			);
			return;
		}
		checks.push(warn('account', 'Unexpected account response'));
	} catch (error) {
		checks.push(fail('account', errorMessage(error), errorDetails(error)));
	}
}

function summarizeChecks(checks: DoctorCheck[]): Record<DoctorStatus, number> {
	return {
		pass: checks.filter((check) => check.status === 'pass').length,
		warn: checks.filter((check) => check.status === 'warn').length,
		fail: checks.filter((check) => check.status === 'fail').length,
	};
}

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

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function errorDetails(error: unknown): unknown {
	return error && typeof error === 'object' && 'code' in error
		? {
				code: String(error.code),
				...('status' in error && typeof error.status === 'number'
					? { status: error.status }
					: {}),
			}
		: undefined;
}
