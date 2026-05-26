import { CliError } from './errors.js';
import { getConfigPath, getProfilesPath } from './config.js';
import { readJsonFile, writeJsonFile } from './fs.js';
const DEFAULT_CONFIG = { version: 1 };
const DEFAULT_PROFILES = { version: 1, profiles: {} };
export function isLocalHostname(hostname) {
    return isLoopbackHostname(hostname) || hostname.endsWith('.local');
}
function isLoopbackHostname(hostname) {
    return ['localhost', '127.0.0.1', '::1'].includes(hostname);
}
function hasExplicitProtocol(siteUrl) {
    return /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(siteUrl);
}
function addDefaultProtocol(siteUrl) {
    const hostname = extractBareHostname(siteUrl);
    const protocol = isLocalHostname(hostname) ? 'http' : 'https';
    return `${protocol}://${siteUrl}`;
}
function extractBareHostname(siteUrl) {
    const authority = siteUrl.split(/[/?#]/, 1)[0] ?? '';
    if (authority.startsWith('[')) {
        return authority.slice(1, authority.indexOf(']')).toLowerCase();
    }
    return authority.split(':', 1)[0]?.toLowerCase() ?? '';
}
export function normalizeSiteUrl(siteUrl, options = {}) {
    const input = siteUrl.trim();
    const normalizedInput = hasExplicitProtocol(input) ? input : addDefaultProtocol(input);
    let url;
    try {
        url = new URL(normalizedInput);
    }
    catch {
        throw new CliError({
            code: 'invalid_site_url',
            message: `Invalid site URL: ${siteUrl}`,
            status: 2,
        });
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new CliError({
            code: 'invalid_site_url_protocol',
            message: 'Site URL must use http or https.',
            status: 2,
        });
    }
    if (url.protocol === 'http:') {
        if (!isLocalHostname(url.hostname)) {
            throw new CliError({
                code: 'insecure_remote_site_url',
                message: 'Refusing to store credentials for a non-HTTPS remote site. Use HTTPS for remote stores.',
                status: 2,
            });
        }
        if (!isLoopbackHostname(url.hostname) && !options.allowInsecureLocal) {
            throw new CliError({
                code: 'insecure_local_site_url_requires_opt_in',
                message: 'HTTP .local development stores require --allow-insecure-local.',
                status: 2,
            });
        }
    }
    url.hash = '';
    url.search = '';
    return url.toString().replace(/\/$/, '');
}
export function deriveProfileName(siteUrl) {
    const url = new URL(siteUrl);
    return url.hostname.replace(/[^a-zA-Z0-9._-]/g, '-');
}
export class ProfileStore {
    env;
    constructor(env = process.env) {
        this.env = env;
    }
    async getConfig() {
        return readJsonFile(getConfigPath(this.env), DEFAULT_CONFIG);
    }
    async saveConfig(config) {
        await writeJsonFile(getConfigPath(this.env), config);
    }
    async list() {
        const file = await this.readProfilesFile();
        return Object.values(file.profiles).sort((a, b) => a.name.localeCompare(b.name));
    }
    async get(name) {
        const profileName = name ?? (await this.getConfig()).defaultProfile;
        if (!profileName) {
            throw new CliError({
                code: 'missing_profile',
                message: 'No profile selected. Run `wcpay auth add` or pass `--profile <name>`.',
                status: 2,
            });
        }
        const file = await this.readProfilesFile();
        const profile = file.profiles[profileName];
        if (!profile) {
            throw new CliError({
                code: 'profile_not_found',
                message: `Profile not found: ${profileName}`,
                status: 2,
            });
        }
        return profile;
    }
    async upsert(input) {
        const now = new Date().toISOString();
        const file = await this.readProfilesFile();
        const existing = file.profiles[input.name];
        const auth = existing?.auth ?? {
            type: 'woocommerce_api_key',
            secretRef: `profile:${input.name}`,
        };
        const profile = {
            name: input.name,
            siteUrl: normalizeSiteUrl(input.siteUrl, {
                allowInsecureLocal: input.allowInsecureLocal,
            }),
            allowInsecureLocal: Boolean(input.allowInsecureLocal),
            auth: {
                ...auth,
                ...(input.keyId ? { keyId: input.keyId } : {}),
            },
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        };
        file.profiles[profile.name] = profile;
        await this.writeProfilesFile(file);
        return profile;
    }
    async remove(name) {
        const file = await this.readProfilesFile();
        const profile = file.profiles[name];
        if (!profile) {
            throw new CliError({
                code: 'profile_not_found',
                message: `Profile not found: ${name}`,
                status: 2,
            });
        }
        delete file.profiles[name];
        await this.writeProfilesFile(file);
        const config = await this.getConfig();
        if (config.defaultProfile === name) {
            delete config.defaultProfile;
            await this.saveConfig(config);
        }
        return profile;
    }
    async setDefault(name) {
        const profile = await this.get(name);
        const config = await this.getConfig();
        config.defaultProfile = profile.name;
        await this.saveConfig(config);
        return profile;
    }
    async readProfilesFile() {
        return readJsonFile(getProfilesPath(this.env), DEFAULT_PROFILES);
    }
    async writeProfilesFile(file) {
        await writeJsonFile(getProfilesPath(this.env), file);
    }
}
//# sourceMappingURL=profiles.js.map