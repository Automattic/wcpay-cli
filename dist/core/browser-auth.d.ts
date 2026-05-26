import type { WooCommerceApiCredentials } from './secrets.js';
export declare const BROWSER_AUTH_ENDPOINT = "/wc/v3/payments/cli/authorize";
export declare const BROWSER_AUTH_TOKEN_ENDPOINT = "/wc/v3/payments/cli/token";
export type BrowserAuthScope = 'read' | 'write' | 'read_write';
export interface BrowserAuthOptions {
    siteUrl: string;
    profileName?: string;
    scope?: BrowserAuthScope;
    openBrowser?: (url: string) => Promise<void>;
    onAuthorizeUrl?: (url: string) => void;
    fetch?: typeof fetch;
    timeoutMs?: number;
}
export interface BrowserAuthResult {
    credentials: WooCommerceApiCredentials;
    keyId?: string;
}
export declare function runBrowserAuth(options: BrowserAuthOptions): Promise<BrowserAuthResult>;
//# sourceMappingURL=browser-auth.d.ts.map