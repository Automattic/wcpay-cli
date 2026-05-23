import type { RestClient } from './api.js';
import { CliError } from './errors.js';

export const WCPAY_ABILITIES = {
	getAccount: 'woocommerce-payments/get-account',
	getTransactions: 'woocommerce-payments/get-transactions',
	getDeposits: 'woocommerce-payments/get-deposits',
	getDisputes: 'woocommerce-payments/get-disputes',
	getDispute: 'woocommerce-payments/get-dispute',
	getCharge: 'woocommerce-payments/get-charge',
} as const;

export type WcpayAbilityName = (typeof WCPAY_ABILITIES)[keyof typeof WCPAY_ABILITIES];

export async function runReadAbilityWithRestFallback<T>(
	client: RestClient,
	ability: WcpayAbilityName,
	input: Record<string, unknown>,
	fallback: () => Promise<T>,
	mapAbilityResult: (result: unknown) => T = (result) => result as T
): Promise<T> {
	try {
		return mapAbilityResult(await runAbility(client, ability, input));
	} catch (error) {
		if (isAbilityFallbackError(error)) {
			return fallback();
		}
		throw error;
	}
}

export async function runAbility<T = unknown>(
	client: RestClient,
	ability: string,
	input: Record<string, unknown> = {}
): Promise<T> {
	return client.request<T>({
		method: 'POST',
		path: `/wp-abilities/v1/abilities/${ability}/run`,
		body: { input },
	});
}

export function isAbilityFallbackError(error: unknown): boolean {
	if (!(error instanceof CliError)) {
		return false;
	}

	return (
		error.status === 404 ||
		error.status === 405 ||
		(error.status !== undefined && error.status >= 500) ||
		error.code === 'rest_no_route' ||
		error.code === 'rest_no_method' ||
		error.code === 'ability_not_found' ||
		error.code === 'wp_ability_not_found'
	);
}

export function normalizeAbilityCollection(
	result: unknown,
	collectionKey: string
): Record<string, unknown> {
	if (result && typeof result === 'object' && collectionKey in result) {
		return { data: (result as Record<string, unknown>)[collectionKey] };
	}
	return result as Record<string, unknown>;
}
