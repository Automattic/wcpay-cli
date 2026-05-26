import type { RestClient } from './api.js';
export declare const WCPAY_ABILITIES: {
    readonly getAccount: "woocommerce-payments/get-account";
    readonly getTransactions: "woocommerce-payments/get-transactions";
    readonly getDeposits: "woocommerce-payments/get-deposits";
    readonly getDisputes: "woocommerce-payments/get-disputes";
    readonly getDispute: "woocommerce-payments/get-dispute";
    readonly getCharge: "woocommerce-payments/get-charge";
};
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
export declare function listAbilities(client: RestClient): Promise<AbilityDescriptor[]>;
export declare function listReadOnlyWcpayAbilities(client: RestClient): Promise<AbilityDescriptor[]>;
export declare function isReadOnlyAbility(ability: AbilityDescriptor): boolean;
export declare function getAbilityAnnotations(ability: AbilityDescriptor): Record<string, unknown>;
export declare function runReadAbilityWithRestFallback<T>(client: RestClient, ability: WcpayAbilityName, input: Record<string, unknown>, fallback: () => Promise<T>, mapAbilityResult?: (result: unknown) => T): Promise<T>;
export declare function runAbility<T = unknown>(client: RestClient, ability: string, input?: Record<string, unknown>): Promise<T>;
export declare function isAbilityDiscoveryUnavailableError(error: unknown): boolean;
export declare function isAbilityFallbackError(error: unknown): boolean;
export declare function normalizeAbilityCollection(result: unknown, collectionKey: string): Record<string, unknown>;
//# sourceMappingURL=abilities.d.ts.map