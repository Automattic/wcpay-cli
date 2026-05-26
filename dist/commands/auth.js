import { buildRestUrl, RestClient } from '../core/api.js';
import { runBrowserAuth } from '../core/browser-auth.js';
import { ENV_CONSUMER_KEY, ENV_CONSUMER_SECRET } from '../core/config.js';
import { createContext } from '../core/context.js';
import { CliError } from '../core/errors.js';
import { classifyMode } from '../core/mode.js';
import { printError, printSuccess } from '../core/output.js';
import { deriveProfileName, normalizeSiteUrl, ProfileStore, } from '../core/profiles.js';
import { promptConfirm, promptSecret, promptText } from '../core/prompts.js';
import { createSecretStore, describeSecretStorage, validateCredentials } from '../core/secrets.js';
import { formatCheck, formatCommand, formatMuted, formatWarning, isPrettyTerminal, printLoginIntro, withSpinner, } from '../core/ux.js';
export function registerLoginCommand(program) {
    program
        .command('login')
        .description('Authenticate with a WooPayments store.')
        .option('--browser', 'Use the browser-based WooPayments connection flow when available.', true)
        .option('--no-browser', 'Use manual WooCommerce REST API key auth without opening a browser.')
        .option('--site <url>', 'Store site URL.')
        .option('--name <name>', 'Profile name. Defaults to the site hostname.')
        .option('--consumer-key <key>', `WooCommerce consumer key. Defaults to ${ENV_CONSUMER_KEY}.`)
        .option('--consumer-secret <secret>', `WooCommerce consumer secret. Defaults to ${ENV_CONSUMER_SECRET}.`)
        .option('--allow-insecure-local', 'Allow HTTP for local development stores.')
        .option('--scope <scope>', 'Browser login key scope: read, write, or read_write.', 'read')
        .option('--no-verify', 'Save credentials without verifying them first.')
        .option('--yes', 'Continue even if a profile is already configured.')
        .option('--json', 'Emit JSON output.')
        .action(async (options) => {
        const json = isJson(program, options);
        await runAction({ json }, async () => {
            const pretty = isPrettyTerminal() && !json;
            if (pretty) {
                printLoginIntro();
            }
            await confirmLoginWhenProfileExists({
                interactive: pretty,
                yes: Boolean(options.yes || program.opts().yes),
            });
            const site = options.site ?? (await promptText('Store URL'));
            const normalized = await normalizeLoginSite(site, {
                allowInsecureLocal: options.allowInsecureLocal,
                interactive: pretty,
            });
            const scope = normalizeAuthScope(options.scope ?? 'read');
            let consumerKey = options.consumerKey ?? process.env[ENV_CONSUMER_KEY];
            let consumerSecret = options.consumerSecret ?? process.env[ENV_CONSUMER_SECRET];
            let browserKeyId;
            let usedBrowserLogin = false;
            if (!consumerKey && !consumerSecret && options.browser && pretty) {
                try {
                    process.stdout.write(`${formatMuted('Opening your store to authorize WooPayments CLI...')}\n`);
                    const browserAuth = await runBrowserAuth({
                        siteUrl: normalized.siteUrl,
                        profileName: options.name,
                        scope,
                        onAuthorizeUrl: (url) => {
                            process.stdout.write(`${formatMuted('If your browser did not open, visit:')}\n  ${formatCommand(url)}\n`);
                        },
                    });
                    browserKeyId = browserAuth.keyId;
                    consumerKey = browserAuth.credentials.consumerKey;
                    consumerSecret = browserAuth.credentials.consumerSecret;
                    usedBrowserLogin = true;
                }
                catch (error) {
                    if (!isBrowserAuthFallbackError(error)) {
                        throw error;
                    }
                    process.stdout.write(`${formatMuted('Browser login is not available on this store yet. Falling back to manual API key login.')}\n\n`);
                }
            }
            if (!consumerKey || !consumerSecret) {
                writeNoBrowserInstructions(normalized.siteUrl, json);
            }
            const saved = await saveAuthProfile({
                name: options.name,
                site: normalized.siteUrl,
                consumerKey: consumerKey ?? (await promptText('Consumer key')),
                consumerSecret: consumerSecret ?? (await promptSecret('Consumer secret')),
                allowInsecureLocal: normalized.allowInsecureLocal,
                verify: options.verify,
                keyId: browserKeyId,
            }, { spinner: pretty });
            printSuccess(saved, {
                json,
                human: formatLoginSuccess(saved, { browserLogin: usedBrowserLogin }),
            });
        });
    });
}
export function registerAuthCommands(program) {
    const auth = program.command('auth').description('Manage WooCommerce REST API credentials.');
    auth.command('add')
        .description('Add a site profile.')
        .option('--site <url>', 'Store site URL.')
        .option('--name <name>', 'Profile name. Defaults to the site hostname.')
        .option('--consumer-key <key>', `WooCommerce consumer key. Defaults to ${ENV_CONSUMER_KEY}.`)
        .option('--consumer-secret <secret>', `WooCommerce consumer secret. Defaults to ${ENV_CONSUMER_SECRET}.`)
        .option('--allow-insecure-local', 'Allow HTTP for local development stores.')
        .option('--no-verify', 'Save credentials without verifying them first.')
        .option('--json', 'Emit JSON output.')
        .action(async (options) => {
        const globalOptions = program.opts();
        const site = options.site;
        const json = Boolean(options.json || globalOptions.json);
        await runAction({ json }, async () => {
            const consumerKey = options.consumerKey ?? process.env[ENV_CONSUMER_KEY];
            const consumerSecret = options.consumerSecret ?? process.env[ENV_CONSUMER_SECRET];
            if (!site) {
                throw new CliError({
                    code: 'missing_site_url',
                    message: 'Pass --site <url> to add a profile.',
                    status: 2,
                });
            }
            if (!consumerKey || !consumerSecret) {
                throw new CliError({
                    code: 'missing_credentials_input',
                    message: 'Pass --consumer-key and --consumer-secret, or set WCPAY_CONSUMER_KEY and WCPAY_CONSUMER_SECRET. For a guided flow, run `wcpay login`.',
                    status: 2,
                });
            }
            const saved = await saveAuthProfile({
                name: options.name,
                site,
                consumerKey,
                consumerSecret,
                allowInsecureLocal: options.allowInsecureLocal,
                verify: options.verify,
            });
            printSuccess(saved, {
                json,
                human: `Added profile ${saved.profile.name} (${saved.profile.siteUrl})`,
            });
        });
    });
    auth.command('list')
        .description('List site profiles.')
        .option('--json', 'Emit JSON output.')
        .action(async (options) => {
        const json = isJson(program, options);
        await runAction({ json }, async () => {
            const store = new ProfileStore();
            const config = await store.getConfig();
            const profiles = (await store.list()).map(publicProfile);
            printSuccess({ profiles, defaultProfile: config.defaultProfile }, {
                json,
                human: profiles.length
                    ? profiles
                        .map((profile) => `${profile.name}\t${profile.siteUrl}${profile.name === config.defaultProfile ? '\t(default)' : ''}`)
                        .join('\n')
                    : 'No profiles configured. Run `wcpay auth add`.',
            });
        });
    });
    auth.command('remove <profile>')
        .description('Remove a site profile.')
        .option('--revoke', 'Revoke the WooCommerce REST API key before removing local credentials.')
        .option('--json', 'Emit JSON output.')
        .action(async (name, options) => {
        const json = isJson(program, options);
        await runAction({ json }, async () => {
            const store = new ProfileStore();
            const secretStore = createSecretStore();
            const profile = await store.get(name);
            const credentials = await secretStore.get(profile.auth.secretRef);
            let revoked = false;
            if (options.revoke) {
                if (!credentials) {
                    throw new CliError({
                        code: 'missing_credentials_for_revoke',
                        message: `Credentials for profile ${name} were not found; cannot revoke the remote key.`,
                        status: 2,
                    });
                }
                await revokeProfileKey(profile, credentials);
                revoked = true;
            }
            const removed = await store.remove(name);
            await secretStore.delete(removed.auth.secretRef);
            printSuccess({ profile: publicProfile(removed), revoked }, {
                json,
                human: `Removed profile ${removed.name}${revoked ? ' and revoked its WooCommerce REST API key' : ''}`,
            });
        });
    });
    auth.command('test [profile]')
        .description('Validate credentials for a profile.')
        .option('--json', 'Emit JSON output.')
        .action(async (profileName, options) => {
        const json = isJson(program, options);
        await runAction({ json }, async () => {
            const context = await createContext({ profile: profileName });
            const settings = await context.client.request({
                method: 'GET',
                path: '/wc/v3/payments/settings',
            });
            const mode = classifyMode(settings);
            printSuccess({
                profile: publicProfile(context.profile),
                mode,
            }, {
                json,
                human: `Authenticated to ${context.profile.name} (${context.profile.siteUrl}) in ${mode} mode`,
            });
        });
    });
}
export function registerProfileCommands(program) {
    const profile = program.command('profile').description('Manage the active site profile.');
    profile
        .command('use <profile>')
        .description('Set the default profile.')
        .option('--json', 'Emit JSON output.')
        .action(async (name, options) => {
        const json = isJson(program, options);
        await runAction({ json }, async () => {
            const store = new ProfileStore();
            const selected = await store.setDefault(name);
            printSuccess({ profile: publicProfile(selected) }, {
                json,
                human: `Using profile ${selected.name}`,
            });
        });
    });
}
export function registerWhoamiCommand(program) {
    program
        .command('whoami')
        .description('Show authenticated site/user context.')
        .option('--json', 'Emit JSON output.')
        .action(async (options) => {
        const json = isJson(program, options);
        await runAction({ json }, async () => {
            const context = await createContext({ profile: program.opts().profile });
            printSuccess({ profile: publicProfile(context.profile) }, {
                json,
                human: `${context.profile.name}\t${context.profile.siteUrl}`,
            });
        });
    });
}
async function saveAuthProfile(input, options = {}) {
    const credentials = { consumerKey: input.consumerKey, consumerSecret: input.consumerSecret };
    validateCredentials(credentials);
    const siteUrl = normalizeSiteUrl(input.site, {
        allowInsecureLocal: input.allowInsecureLocal,
    });
    const name = input.name ?? deriveProfileName(siteUrl);
    const now = new Date().toISOString();
    const profile = {
        name,
        siteUrl,
        allowInsecureLocal: Boolean(input.allowInsecureLocal),
        auth: {
            type: 'woocommerce_api_key',
            secretRef: `profile:${name}`,
            ...(input.keyId ? { keyId: input.keyId } : {}),
        },
        createdAt: now,
        updatedAt: now,
    };
    const shouldVerify = input.verify !== false;
    if (shouldVerify) {
        await withSpinner('Verifying credentials', () => verifyProfile(profile, credentials), {
            enabled: options.spinner,
            successText: 'Verified credentials',
        });
    }
    const secretStorage = describeSecretStorage();
    const { savedProfile, defaultProfile } = await withSpinner('Saving profile and credentials', async () => {
        const profileStore = new ProfileStore();
        const secretStore = createSecretStore();
        const saved = await profileStore.upsert({
            name,
            siteUrl,
            allowInsecureLocal: input.allowInsecureLocal,
            keyId: input.keyId,
        });
        await secretStore.set(saved.auth.secretRef, credentials);
        const config = await profileStore.getConfig();
        if (!config.defaultProfile) {
            config.defaultProfile = saved.name;
            await profileStore.saveConfig(config);
        }
        return { savedProfile: saved, defaultProfile: config.defaultProfile };
    }, { enabled: options.spinner, successText: `Saved credentials in ${secretStorage}` });
    return {
        profile: publicProfile(savedProfile),
        defaultProfile,
        secretStorage,
        verified: shouldVerify,
    };
}
async function confirmLoginWhenProfileExists(options) {
    if (!options.interactive || options.yes) {
        return;
    }
    const store = new ProfileStore();
    const config = await store.getConfig();
    if (!config.defaultProfile) {
        return;
    }
    let currentProfile;
    try {
        currentProfile = await store.get(config.defaultProfile);
    }
    catch {
        return;
    }
    process.stdout.write([
        formatWarning('A WooPayments CLI profile is already configured.'),
        formatMuted(`Current profile: ${currentProfile.name} (${currentProfile.siteUrl})`),
        '',
    ].join('\n'));
    const shouldContinue = await promptConfirm('Continue and add or update a login?', false);
    if (!shouldContinue) {
        throw new CliError({
            code: 'login_cancelled',
            message: 'Login cancelled. Your existing profile was not changed.',
            status: 2,
        });
    }
}
async function normalizeLoginSite(site, options) {
    try {
        return {
            siteUrl: normalizeSiteUrl(site, { allowInsecureLocal: options.allowInsecureLocal }),
            allowInsecureLocal: options.allowInsecureLocal,
        };
    }
    catch (error) {
        if (error instanceof CliError &&
            error.code === 'insecure_local_site_url_requires_opt_in' &&
            options.interactive) {
            process.stdout.write(`${formatWarning('This local development URL uses HTTP.')}\n`);
            const allow = await promptConfirm('Allow this local HTTP store for development?', false);
            if (allow) {
                return {
                    siteUrl: normalizeSiteUrl(site, { allowInsecureLocal: true }),
                    allowInsecureLocal: true,
                };
            }
        }
        throw error;
    }
}
async function verifyProfile(profile, credentials) {
    const client = new RestClient(profile, credentials);
    await client.request({ method: 'GET', path: '/wc/v3/payments/settings' });
}
async function revokeProfileKey(profile, credentials) {
    if (!profile.auth.keyId) {
        throw new CliError({
            code: 'missing_revoke_key_id',
            message: 'This profile does not include a remote key ID, so wcpay cannot revoke it automatically. Remove it in WooCommerce > Settings > Advanced > REST API, or run without --revoke to remove only local credentials.',
            status: 2,
        });
    }
    const url = buildRestUrl(profile.siteUrl, '/wc/v3/payments/cli/revoke');
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json; charset=utf-8',
            'User-Agent': 'wcpay-cli/0.0.0',
        },
        body: JSON.stringify({
            key_id: profile.auth.keyId,
            consumer_key: credentials.consumerKey,
            consumer_secret: credentials.consumerSecret,
        }),
    });
    if (!response.ok) {
        throw new CliError({
            code: 'revoke_failed',
            message: `Could not revoke the remote WooCommerce REST API key. Status ${response.status}.`,
            status: response.status,
            details: await safeParseJsonResponse(response),
        });
    }
}
async function safeParseJsonResponse(response) {
    const text = await response.text();
    if (!text) {
        return undefined;
    }
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
function normalizeAuthScope(scope) {
    if (scope === 'read' || scope === 'write' || scope === 'read_write') {
        return scope;
    }
    throw new CliError({
        code: 'invalid_auth_scope',
        message: 'Login scope must be one of: read, write, read_write.',
        status: 2,
    });
}
function isBrowserAuthFallbackError(error) {
    return error instanceof CliError && error.code === 'browser_auth_unavailable';
}
function formatLoginSuccess(saved, options = {}) {
    return [
        '',
        formatCheck(`Connected to ${saved.profile.name}`),
        formatMuted(`Store: ${saved.profile.siteUrl}`),
        formatMuted(`Login flow: ${options.browserLogin ? 'browser' : 'manual API key'}`),
        formatMuted(`Credentials: ${saved.secretStorage}`),
        ...(saved.defaultProfile === saved.profile.name
            ? [formatMuted('Default profile: yes')]
            : []),
        '',
        'Try next:',
        `  ${formatCommand('wcpay doctor')}`,
        `  ${formatCommand('wcpay mode')}`,
        `  ${formatCommand('wcpay transactions list --limit 10')}`,
    ].join('\n');
}
function writeNoBrowserInstructions(siteUrl, json) {
    if (json) {
        return;
    }
    const keysUrl = `${siteUrl}/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys`;
    process.stderr.write([
        'WooCommerce REST API key required',
        formatMuted('Create a Read/Write key for a user with manage_woocommerce capability:'),
        '',
        `  ${formatCommand(keysUrl)}`,
        '',
        formatMuted('Then paste the generated consumer key and consumer secret below.'),
        '',
    ].join('\n'));
}
function isJson(program, options) {
    return Boolean(options.json || program.opts().json);
}
function publicProfile(profile) {
    const { auth: _auth, ...rest } = profile;
    return rest;
}
async function runAction(options, action) {
    try {
        await action();
    }
    catch (error) {
        printError(error, { json: options.json });
        process.exitCode = 1;
    }
}
//# sourceMappingURL=auth.js.map