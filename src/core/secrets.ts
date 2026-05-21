import { join } from 'node:path';
import { getConfigDir } from './config.js';
import { CliError } from './errors.js';
import { readJsonFile, writeJsonFile } from './fs.js';

export interface WooCommerceApiCredentials {
	consumerKey: string;
	consumerSecret: string;
}

export interface SecretStore {
	get( ref: string ): Promise<WooCommerceApiCredentials | undefined>;
	set( ref: string, credentials: WooCommerceApiCredentials ): Promise<void>;
	delete( ref: string ): Promise<void>;
}

interface AuthFile {
	version: 1;
	credentials: Record<string, WooCommerceApiCredentials>;
}

const DEFAULT_AUTH_FILE: AuthFile = { version: 1, credentials: {} };

export class FileSecretStore implements SecretStore {
	private readonly env: NodeJS.ProcessEnv;

	public constructor( env: NodeJS.ProcessEnv = process.env ) {
		this.env = env;
	}

	public async get( ref: string ): Promise<WooCommerceApiCredentials | undefined> {
		const file = await this.readAuthFile();
		return file.credentials[ ref ];
	}

	public async set( ref: string, credentials: WooCommerceApiCredentials ): Promise<void> {
		validateCredentials( credentials );
		const file = await this.readAuthFile();
		file.credentials[ ref ] = credentials;
		await this.writeAuthFile( file );
	}

	public async delete( ref: string ): Promise<void> {
		const file = await this.readAuthFile();
		delete file.credentials[ ref ];
		await this.writeAuthFile( file );
	}

	private getPath(): string {
		return join( getConfigDir( this.env ), 'auth.json' );
	}

	private async readAuthFile(): Promise<AuthFile> {
		return readJsonFile<AuthFile>( this.getPath(), DEFAULT_AUTH_FILE );
	}

	private async writeAuthFile( file: AuthFile ): Promise<void> {
		await writeJsonFile( this.getPath(), file, 0o600 );
	}
}

export function createSecretStore( env: NodeJS.ProcessEnv = process.env ): SecretStore {
	// TODO: add a keychain-backed implementation. The file store gives us a deterministic
	// implementation for local development, CI, and test fixtures.
	return new FileSecretStore( env );
}

export function validateCredentials( credentials: WooCommerceApiCredentials ): void {
	if ( ! credentials.consumerKey.startsWith( 'ck_' ) ) {
		throw new CliError( {
			code: 'invalid_consumer_key',
			message: 'WooCommerce consumer keys should start with `ck_`.',
			status: 2,
		} );
	}

	if ( ! credentials.consumerSecret.startsWith( 'cs_' ) ) {
		throw new CliError( {
			code: 'invalid_consumer_secret',
			message: 'WooCommerce consumer secrets should start with `cs_`.',
			status: 2,
		} );
	}
}
