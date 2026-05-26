import { ProfileStore, type Profile } from './profiles.js';
import { type SecretStore, type WooCommerceApiCredentials } from './secrets.js';
import { RestClient } from './api.js';
export interface ResolveProfileOptions {
    profile?: string;
}
export interface CliContext {
    profile: Profile;
    credentials: WooCommerceApiCredentials;
    client: RestClient;
    profileStore: ProfileStore;
    secretStore: SecretStore;
}
export declare function createContext(options?: ResolveProfileOptions, env?: NodeJS.ProcessEnv): Promise<CliContext>;
export declare function resolveCredentials(profile: Profile, secretStore: SecretStore, env?: NodeJS.ProcessEnv): Promise<WooCommerceApiCredentials>;
//# sourceMappingURL=context.d.ts.map