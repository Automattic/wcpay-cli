import { CliError } from './errors.js';
import { getConfigPath, getProfilesPath } from './config.js';
import { readJsonFile, writeJsonFile } from './fs.js';

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
	};
	createdAt: string;
	updatedAt: string;
}

interface ProfilesFile {
	version: 1;
	profiles: Record<string, Profile>;
}

const DEFAULT_CONFIG: WcpayConfig = { version: 1 };
const DEFAULT_PROFILES: ProfilesFile = { version: 1, profiles: {} };

export function isLocalHostname( hostname: string ): boolean {
	return isLoopbackHostname( hostname ) || hostname.endsWith( '.local' );
}

function isLoopbackHostname( hostname: string ): boolean {
	return [ 'localhost', '127.0.0.1', '::1' ].includes( hostname );
}

export function normalizeSiteUrl( siteUrl: string, options: { allowInsecureLocal?: boolean } = {} ): string {
	let url: URL;
	try {
		url = new URL( siteUrl );
	} catch {
		throw new CliError( {
			code: 'invalid_site_url',
			message: `Invalid site URL: ${ siteUrl }`,
			status: 2,
		} );
	}

	if ( url.protocol !== 'https:' && url.protocol !== 'http:' ) {
		throw new CliError( {
			code: 'invalid_site_url_protocol',
			message: 'Site URL must use http or https.',
			status: 2,
		} );
	}

	if ( url.protocol === 'http:' ) {
		if ( ! isLocalHostname( url.hostname ) ) {
			throw new CliError( {
				code: 'insecure_remote_site_url',
				message: 'Refusing to store credentials for a non-HTTPS remote site. Use HTTPS for remote stores.',
				status: 2,
			} );
		}

		if ( ! isLoopbackHostname( url.hostname ) && ! options.allowInsecureLocal ) {
			throw new CliError( {
				code: 'insecure_local_site_url_requires_opt_in',
				message: 'HTTP .local development stores require --allow-insecure-local.',
				status: 2,
			} );
		}
	}

	url.hash = '';
	url.search = '';
	return url.toString().replace( /\/$/, '' );
}

export function deriveProfileName( siteUrl: string ): string {
	const url = new URL( siteUrl );
	return url.hostname.replace( /[^a-zA-Z0-9._-]/g, '-' );
}

export class ProfileStore {
	private readonly env: NodeJS.ProcessEnv;

	public constructor( env: NodeJS.ProcessEnv = process.env ) {
		this.env = env;
	}

	public async getConfig(): Promise<WcpayConfig> {
		return readJsonFile<WcpayConfig>( getConfigPath( this.env ), DEFAULT_CONFIG );
	}

	public async saveConfig( config: WcpayConfig ): Promise<void> {
		await writeJsonFile( getConfigPath( this.env ), config );
	}

	public async list(): Promise<Profile[]> {
		const file = await this.readProfilesFile();
		return Object.values( file.profiles ).sort( ( a, b ) => a.name.localeCompare( b.name ) );
	}

	public async get( name?: string ): Promise<Profile> {
		const profileName = name ?? ( await this.getConfig() ).defaultProfile;
		if ( ! profileName ) {
			throw new CliError( {
				code: 'missing_profile',
				message: 'No profile selected. Run `wcpay auth add` or pass `--profile <name>`.',
				status: 2,
			} );
		}

		const file = await this.readProfilesFile();
		const profile = file.profiles[ profileName ];
		if ( ! profile ) {
			throw new CliError( {
				code: 'profile_not_found',
				message: `Profile not found: ${ profileName }`,
				status: 2,
			} );
		}
		return profile;
	}

	public async upsert( input: { name: string; siteUrl: string; allowInsecureLocal?: boolean } ): Promise<Profile> {
		const now = new Date().toISOString();
		const file = await this.readProfilesFile();
		const existing = file.profiles[ input.name ];
		const profile: Profile = {
			name: input.name,
			siteUrl: normalizeSiteUrl( input.siteUrl, { allowInsecureLocal: input.allowInsecureLocal } ),
			allowInsecureLocal: Boolean( input.allowInsecureLocal ),
			auth: existing?.auth ?? {
				type: 'woocommerce_api_key',
				secretRef: `profile:${ input.name }`,
			},
			createdAt: existing?.createdAt ?? now,
			updatedAt: now,
		};

		file.profiles[ profile.name ] = profile;
		await this.writeProfilesFile( file );
		return profile;
	}

	public async remove( name: string ): Promise<Profile> {
		const file = await this.readProfilesFile();
		const profile = file.profiles[ name ];
		if ( ! profile ) {
			throw new CliError( {
				code: 'profile_not_found',
				message: `Profile not found: ${ name }`,
				status: 2,
			} );
		}

		delete file.profiles[ name ];
		await this.writeProfilesFile( file );

		const config = await this.getConfig();
		if ( config.defaultProfile === name ) {
			delete config.defaultProfile;
			await this.saveConfig( config );
		}

		return profile;
	}

	public async setDefault( name: string ): Promise<Profile> {
		const profile = await this.get( name );
		const config = await this.getConfig();
		config.defaultProfile = profile.name;
		await this.saveConfig( config );
		return profile;
	}

	private async readProfilesFile(): Promise<ProfilesFile> {
		return readJsonFile<ProfilesFile>( getProfilesPath( this.env ), DEFAULT_PROFILES );
	}

	private async writeProfilesFile( file: ProfilesFile ): Promise<void> {
		await writeJsonFile( getProfilesPath( this.env ), file );
	}
}
