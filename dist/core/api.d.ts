import type { Profile } from './profiles.js';
import type { WooCommerceApiCredentials } from './secrets.js';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export interface RestRequest {
    method: HttpMethod;
    path: string;
    query?: Record<string, unknown>;
    body?: unknown;
    headers?: Record<string, string>;
    dryRun?: boolean;
}
export interface ResolvedRestRequest {
    method: HttpMethod;
    url: string;
    headers: Record<string, string>;
    body?: string;
}
export interface RestClientOptions {
    fetch?: typeof fetch;
    nonce?: () => string;
    timestamp?: () => number;
}
export declare class RestClient {
    private readonly profile;
    private readonly credentials;
    private readonly fetchImpl;
    private readonly nonce;
    private readonly timestamp;
    constructor(profile: Profile, credentials: WooCommerceApiCredentials, options?: RestClientOptions);
    resolve(request: RestRequest): ResolvedRestRequest;
    request<T = unknown>(request: RestRequest): Promise<T>;
}
export declare function normalizeMethod(method: string): HttpMethod;
export declare function isReadMethod(method: string): boolean;
export declare function normalizeRestPath(path: string): string;
export declare function buildRestUrl(siteUrl: string, path: string, query?: Record<string, unknown>): URL;
export declare function createOAuthSignature(method: HttpMethod, url: URL, params: Record<string, string>, consumerSecret: string): string;
export declare function percentEncode(value: string): string;
//# sourceMappingURL=api.d.ts.map