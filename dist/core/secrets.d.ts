export interface WooCommerceApiCredentials {
    consumerKey: string;
    consumerSecret: string;
}
export interface SecretStore {
    get(ref: string): Promise<WooCommerceApiCredentials | undefined>;
    set(ref: string, credentials: WooCommerceApiCredentials): Promise<void>;
    delete(ref: string): Promise<void>;
}
export interface CommandRunner {
    (command: string, args: string[], options?: {
        input?: string;
    }): Promise<{
        stdout: string;
        stderr: string;
    }>;
}
export declare class FileSecretStore implements SecretStore {
    private readonly env;
    constructor(env?: NodeJS.ProcessEnv);
    get(ref: string): Promise<WooCommerceApiCredentials | undefined>;
    set(ref: string, credentials: WooCommerceApiCredentials): Promise<void>;
    delete(ref: string): Promise<void>;
    private getPath;
    private readAuthFile;
    private writeAuthFile;
}
export declare class MacOSKeychainSecretStore implements SecretStore {
    private readonly runner;
    constructor(runner?: CommandRunner);
    get(ref: string): Promise<WooCommerceApiCredentials | undefined>;
    set(ref: string, credentials: WooCommerceApiCredentials): Promise<void>;
    delete(ref: string): Promise<void>;
}
export declare class SecretToolSecretStore implements SecretStore {
    private readonly runner;
    constructor(runner?: CommandRunner);
    get(ref: string): Promise<WooCommerceApiCredentials | undefined>;
    set(ref: string, credentials: WooCommerceApiCredentials): Promise<void>;
    delete(ref: string): Promise<void>;
}
export declare class UnsupportedKeychainSecretStore implements SecretStore {
    get(_ref: string): Promise<WooCommerceApiCredentials | undefined>;
    set(_ref: string, _credentials: WooCommerceApiCredentials): Promise<void>;
    delete(_ref: string): Promise<void>;
}
export declare class HelpfulKeychainSecretStore implements SecretStore {
    private readonly keychain;
    constructor(keychain: SecretStore);
    get(ref: string): Promise<WooCommerceApiCredentials | undefined>;
    set(ref: string, credentials: WooCommerceApiCredentials): Promise<void>;
    delete(ref: string): Promise<void>;
}
export declare function createSecretStore(env?: NodeJS.ProcessEnv, platform?: NodeJS.Platform): SecretStore;
export declare function describeSecretStorage(env?: NodeJS.ProcessEnv, platform?: NodeJS.Platform): string;
export declare function validateCredentials(credentials: WooCommerceApiCredentials): void;
//# sourceMappingURL=secrets.d.ts.map