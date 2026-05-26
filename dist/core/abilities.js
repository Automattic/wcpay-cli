import { CliError } from './errors.js';
export const WCPAY_ABILITIES = {
    getAccount: 'woocommerce-payments/get-account',
    getTransactions: 'woocommerce-payments/get-transactions',
    getDeposits: 'woocommerce-payments/get-deposits',
    getDisputes: 'woocommerce-payments/get-disputes',
    getDispute: 'woocommerce-payments/get-dispute',
    getCharge: 'woocommerce-payments/get-charge',
};
export async function listAbilities(client) {
    try {
        const data = await client.request({ method: 'GET', path: '/wp-abilities/v1/abilities' });
        return normalizeAbilitiesList(data).filter((ability) => ability.name.startsWith('woocommerce-payments/'));
    }
    catch (error) {
        if (isAbilityDiscoveryUnavailableError(error)) {
            return [];
        }
        throw error;
    }
}
export async function listReadOnlyWcpayAbilities(client) {
    return (await listAbilities(client)).filter(isReadOnlyAbility);
}
export function isReadOnlyAbility(ability) {
    const annotations = getAbilityAnnotations(ability);
    return annotations.readonly === true && annotations.destructive !== true;
}
export function getAbilityAnnotations(ability) {
    const meta = ability.meta;
    if (meta && typeof meta === 'object' && 'annotations' in meta) {
        const annotations = meta.annotations;
        if (annotations && typeof annotations === 'object') {
            return annotations;
        }
    }
    return {};
}
export async function runReadAbilityWithRestFallback(client, ability, input, fallback, mapAbilityResult = (result) => result) {
    try {
        return mapAbilityResult(await runAbility(client, ability, input));
    }
    catch (error) {
        if (isAbilityFallbackError(error)) {
            return fallback();
        }
        throw error;
    }
}
export async function runAbility(client, ability, input = {}) {
    return client.request({
        method: 'POST',
        path: `/wp-abilities/v1/abilities/${ability}/run`,
        body: { input },
    });
}
export function isAbilityDiscoveryUnavailableError(error) {
    return (error instanceof CliError &&
        (error.status === 401 ||
            error.status === 403 ||
            error.status === 404 ||
            error.status === 405 ||
            error.code === 'rest_no_route' ||
            error.code === 'rest_no_method'));
}
export function isAbilityFallbackError(error) {
    if (!(error instanceof CliError)) {
        return false;
    }
    return (error.status === 404 ||
        error.status === 405 ||
        (error.status !== undefined && error.status >= 500) ||
        error.code === 'rest_no_route' ||
        error.code === 'rest_no_method' ||
        error.code === 'ability_not_found' ||
        error.code === 'wp_ability_not_found');
}
export function normalizeAbilityCollection(result, collectionKey) {
    if (result && typeof result === 'object' && collectionKey in result) {
        return { data: result[collectionKey] };
    }
    return result;
}
function normalizeAbilitiesList(data) {
    const abilities = Array.isArray(data)
        ? data
        : data && typeof data === 'object' && 'abilities' in data && Array.isArray(data.abilities)
            ? data.abilities
            : [];
    return abilities.filter(isAbilityDescriptor);
}
function isAbilityDescriptor(value) {
    return value !== null && typeof value === 'object' && 'name' in value && typeof value.name === 'string';
}
//# sourceMappingURL=abilities.js.map