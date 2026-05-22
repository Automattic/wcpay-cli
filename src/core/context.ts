import { ENV_CONSUMER_KEY, ENV_CONSUMER_SECRET } from './config.js';
import { CliError } from './errors.js';
import { ProfileStore, type Profile } from './profiles.js';
import { createSecretStore, validateCredentials, type SecretStore, type WooCommerceApiCredentials } from './secrets.js';
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

export async function createContext(
	options: ResolveProfileOptions = {},
	env: NodeJS.ProcessEnv = process.env
): Promise<CliContext> {
	const profileStore = new ProfileStore( env );
	const secretStore = createSecretStore( env );
	const profile = await profileStore.get( options.profile ?? env.WCPAY_PROFILE );
	const credentials = await resolveCredentials( profile, secretStore, env );
	const client = new RestClient( profile, credentials );

	return { profile, credentials, client, profileStore, secretStore };
}

export async function resolveCredentials(
	profile: Profile,
	secretStore: SecretStore,
	env: NodeJS.ProcessEnv = process.env
): Promise<WooCommerceApiCredentials> {
	if ( env[ ENV_CONSUMER_KEY ] && env[ ENV_CONSUMER_SECRET ] ) {
		const credentials = {
			consumerKey: env[ ENV_CONSUMER_KEY ],
			consumerSecret: env[ ENV_CONSUMER_SECRET ],
		};
		validateCredentials( credentials );
		return credentials;
	}

	const credentials = await secretStore.get( profile.auth.secretRef );
	if ( ! credentials ) {
		throw new CliError( {
			code: 'missing_credentials',
			message: `No credentials found for profile ${ profile.name }. Run \`wcpay auth add\` again.`,
			status: 2,
		} );
	}

	return credentials;
}
