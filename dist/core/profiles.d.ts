export interface WcpayConfig {
    version: 1;
    defaultProfile?: string;
    keyring?: boolean;
}
export interface Profile {
    name: string;
    siteUrl: string;
    allowInsecureLocal: boolean;
    auth: {
        type: 'woocommerce_api_key';
        secretRef: string;
        keyId?: string;
    };
    createdAt: string;
    updatedAt: string;
}
export declare function isLocalHostname(hostname: string): boolean;
export declare function normalizeSiteUrl(siteUrl: string, options?: {
    allowInsecureLocal?: boolean;
}): string;
export declare function deriveProfileName(siteUrl: string): string;
export declare class ProfileStore {
    private readonly env;
    constructor(env?: NodeJS.ProcessEnv);
    getConfig(): Promise<WcpayConfig>;
    saveConfig(config: WcpayConfig): Promise<void>;
    list(): Promise<Profile[]>;
    get(name?: string): Promise<Profile>;
    upsert(input: {
        name: string;
        siteUrl: string;
        allowInsecureLocal?: boolean;
        keyId?: string;
    }): Promise<Profile>;
    remove(name: string): Promise<Profile>;
    setDefault(name: string): Promise<Profile>;
    private readProfilesFile;
    private writeProfilesFile;
}
//# sourceMappingURL=profiles.d.ts.map