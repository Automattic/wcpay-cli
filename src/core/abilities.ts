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

export interface AbilityDescriptor {
	name: string;
	label?: string;
	description?: string;
	category?: string;
	input_schema?: unknown;
	output_schema?: unknown;
	meta?: Record<string, unknown>;
}

export async function listAbilities(client: RestClient): Promise<AbilityDescriptor[]> {
	try {
		const data = await client.request<unknown>({ method: 'GET', path: '/wp-abilities/v1/abilities' });
		return normalizeAbilitiesList(data).filter((ability) => ability.name.startsWith('woocommerce-payments/'));
	} catch (error) {
		if (isAbilityDiscoveryUnavailableError(error)) {
			return [];
		}
		throw error;
	}
}

export async function listReadOnlyWcpayAbilities(client: RestClient): Promise<AbilityDescriptor[]> {
	return (await listAbilities(client)).filter(isReadOnlyAbility);
}

export function isReadOnlyAbility(ability: AbilityDescriptor): boolean {
	const annotations = getAbilityAnnotations(ability);
	return annotations.readonly === true && annotations.destructive !== true;
}

export function getAbilityAnnotations(ability: AbilityDescriptor): Record<string, unknown> {
	const meta = ability.meta;
	if (meta && typeof meta === 'object' && 'annotations' in meta) {
		const annotations = meta.annotations;
		if (annotations && typeof annotations === 'object') {
			return annotations as Record<string, unknown>;
		}
	}
	return {};
}

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

export function isAbilityDiscoveryUnavailableError(error: unknown): boolean {
	return (
		error instanceof CliError &&
		(error.status === 401 ||
			error.status === 403 ||
			error.status === 404 ||
			error.status === 405 ||
			error.code === 'rest_no_route' ||
			error.code === 'rest_no_method')
	);
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

function normalizeAbilitiesList(data: unknown): AbilityDescriptor[] {
	const abilities = Array.isArray(data)
		? data
		: data && typeof data === 'object' && 'abilities' in data && Array.isArray(data.abilities)
			? data.abilities
			: [];

	return abilities.filter(isAbilityDescriptor);
}

function isAbilityDescriptor(value: unknown): value is AbilityDescriptor {
	return value !== null && typeof value === 'object' && 'name' in value && typeof value.name === 'string';
}
