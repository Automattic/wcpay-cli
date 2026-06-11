import {
	ENV_CONSUMER_KEY,
	ENV_CONSUMER_SECRET,
	ENV_DEBUG,
	ENV_PROFILE,
	ENV_SITE_URL,
	ENV_TIMEOUT,
} from './config.js';
import { CliError } from './errors.js';
import { normalizeSiteUrl, ProfileStore, type Profile } from './profiles.js';
import {
	createSecretStore,
	validateCredentials,
	type SecretStore,
	type WooCommerceApiCredentials,
} from './secrets.js';
import { RestClient, type RestClientOptions } from './api.js';
import { parseOptionalPositiveInteger } from './validation.js';

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

export async function createContext(
	options: ResolveProfileOptions = {},
	env: NodeJS.ProcessEnv = process.env
): Promise<CliContext> {
	const profileStore = new ProfileStore(env);
	const secretStore = createSecretStore(env);
	const profile = await resolveContextProfile(options, profileStore, env);
	const credentials = await resolveCredentials(profile, secretStore, env);
	const client = new RestClient(profile, credentials, clientOptionsFromEnv(env));

	return { profile, credentials, client, profileStore, secretStore };
}

export function clientOptionsFromEnv(env: NodeJS.ProcessEnv = process.env): RestClientOptions {
	const options: RestClientOptions = {};
	const timeoutSeconds = parseOptionalPositiveInteger(env[ENV_TIMEOUT], ENV_TIMEOUT);
	if (timeoutSeconds !== undefined) {
		options.timeoutMs = timeoutSeconds * 1000;
	}
	if (env[ENV_DEBUG] === '1' || env[ENV_DEBUG] === 'true') {
		options.logger = (line) => process.stderr.write(`${line}\n`);
	}
	return options;
}

const ENV_PROFILE_NAME = 'env';
const ENV_SECRET_REF = 'env';

async function resolveContextProfile(
	options: ResolveProfileOptions,
	profileStore: ProfileStore,
	env: NodeJS.ProcessEnv
): Promise<Profile> {
	const requested = options.profile ?? env[ENV_PROFILE];
	if (!requested && env[ENV_SITE_URL]) {
		const now = new Date().toISOString();
		return {
			name: ENV_PROFILE_NAME,
			siteUrl: normalizeSiteUrl(env[ENV_SITE_URL]),
			allowInsecureLocal: false,
			auth: { type: 'woocommerce_api_key', secretRef: ENV_SECRET_REF },
			createdAt: now,
			updatedAt: now,
		};
	}
	return profileStore.get(requested);
}

export async function resolveCredentials(
	profile: Profile,
	secretStore: SecretStore,
	env: NodeJS.ProcessEnv = process.env
): Promise<WooCommerceApiCredentials> {
	if (env[ENV_CONSUMER_KEY] && env[ENV_CONSUMER_SECRET]) {
		const credentials = {
			consumerKey: env[ENV_CONSUMER_KEY],
			consumerSecret: env[ENV_CONSUMER_SECRET],
		};
		validateCredentials(credentials);
		return credentials;
	}

	if (profile.auth.secretRef === ENV_SECRET_REF) {
		throw new CliError({
			code: 'missing_env_credentials',
			message: `${ENV_SITE_URL} is set but ${ENV_CONSUMER_KEY} and ${ENV_CONSUMER_SECRET} are missing. Set both to use environment-based auth.`,
			status: 2,
		});
	}

	const credentials = await secretStore.get(profile.auth.secretRef);
	if (!credentials) {
		throw new CliError({
			code: 'missing_credentials',
			message: `No credentials found for profile ${profile.name}. Run \`wcpay auth add\` again.`,
			status: 2,
		});
	}

	return credentials;
}
