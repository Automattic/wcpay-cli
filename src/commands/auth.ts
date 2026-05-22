import { Command } from 'commander';
import { RestClient } from '../core/api.js';
import { ENV_CONSUMER_KEY, ENV_CONSUMER_SECRET } from '../core/config.js';
import { createContext } from '../core/context.js';
import { CliError } from '../core/errors.js';
import { classifyMode } from '../core/mode.js';
import { printError, printSuccess } from '../core/output.js';
import { deriveProfileName, normalizeSiteUrl, ProfileStore, type Profile } from '../core/profiles.js';
import { promptSecret, promptText } from '../core/prompts.js';
import { createSecretStore, validateCredentials } from '../core/secrets.js';

interface AuthAddOptions {
	name?: string;
	site?: string;
	consumerKey?: string;
	consumerSecret?: string;
	allowInsecureLocal?: boolean;
	verify?: boolean;
	json?: boolean;
}

type LoginOptions = AuthAddOptions;

interface SaveProfileInput {
	name?: string;
	site: string;
	consumerKey: string;
	consumerSecret: string;
	allowInsecureLocal?: boolean;
	verify?: boolean;
}

export function registerLoginCommand( program: Command ): void {
	program
		.command( 'login' )
		.description( 'Authenticate with a WooPayments store using WooCommerce REST API keys.' )
		.option( '--no-browser', 'Use manual WooCommerce REST API key auth without opening a browser. This is the default for now.' )
		.option( '--site <url>', 'Store site URL.' )
		.option( '--name <name>', 'Profile name. Defaults to the site hostname.' )
		.option( '--consumer-key <key>', `WooCommerce consumer key. Defaults to ${ ENV_CONSUMER_KEY }.` )
		.option( '--consumer-secret <secret>', `WooCommerce consumer secret. Defaults to ${ ENV_CONSUMER_SECRET }.` )
		.option( '--allow-insecure-local', 'Allow HTTP for local development stores.' )
		.option( '--no-verify', 'Save credentials without verifying them first.' )
		.option( '--json', 'Emit JSON output.' )
		.action( async ( options: LoginOptions ) => {
			const json = isJson( program, options );
			await runAction( { json }, async () => {
				const globalOptions = program.opts() as { site?: string };
				const site = options.site ?? globalOptions.site ?? ( await promptText( 'Site URL: ' ) );
				const siteUrl = normalizeSiteUrl( site, { allowInsecureLocal: options.allowInsecureLocal } );
				const consumerKey = options.consumerKey ?? process.env[ ENV_CONSUMER_KEY ];
				const consumerSecret = options.consumerSecret ?? process.env[ ENV_CONSUMER_SECRET ];

				if ( ! consumerKey || ! consumerSecret ) {
					writeNoBrowserInstructions( siteUrl, json );
				}

				const saved = await saveAuthProfile( {
					name: options.name,
					site: siteUrl,
					consumerKey: consumerKey ?? ( await promptText( 'Consumer key: ' ) ),
					consumerSecret: consumerSecret ?? ( await promptSecret( 'Consumer secret: ' ) ),
					allowInsecureLocal: options.allowInsecureLocal,
					verify: options.verify,
				} );

				printSuccess( saved, {
					json,
					human: `Logged in to ${ saved.profile.name } (${ saved.profile.siteUrl })`,
				} );
			} );
		} );
}

export function registerAuthCommands( program: Command ): void {
	const auth = program.command( 'auth' ).description( 'Manage WooCommerce REST API credentials.' );

	auth
		.command( 'add' )
		.description( 'Add a site profile.' )
		.option( '--site <url>', 'Store site URL.' )
		.option( '--name <name>', 'Profile name. Defaults to the site hostname.' )
		.option( '--consumer-key <key>', `WooCommerce consumer key. Defaults to ${ ENV_CONSUMER_KEY }.` )
		.option( '--consumer-secret <secret>', `WooCommerce consumer secret. Defaults to ${ ENV_CONSUMER_SECRET }.` )
		.option( '--allow-insecure-local', 'Allow HTTP for local development stores.' )
		.option( '--no-verify', 'Save credentials without verifying them first.' )
		.option( '--json', 'Emit JSON output.' )
		.action( async ( options: AuthAddOptions ) => {
			const globalOptions = program.opts() as { site?: string; json?: boolean };
			const site = options.site ?? globalOptions.site;
			const json = Boolean( options.json || globalOptions.json );
			await runAction( { json }, async () => {
				const consumerKey = options.consumerKey ?? process.env[ ENV_CONSUMER_KEY ];
				const consumerSecret = options.consumerSecret ?? process.env[ ENV_CONSUMER_SECRET ];

				if ( ! site ) {
					throw new CliError( {
						code: 'missing_site_url',
						message: 'Pass --site <url> to add a profile.',
						status: 2,
					} );
				}

				if ( ! consumerKey || ! consumerSecret ) {
					throw new CliError( {
						code: 'missing_credentials_input',
						message: 'Pass --consumer-key and --consumer-secret, or set WCPAY_CONSUMER_KEY and WCPAY_CONSUMER_SECRET. For a guided flow, run `wcpay login`.',
						status: 2,
					} );
				}

				const saved = await saveAuthProfile( {
					name: options.name,
					site,
					consumerKey,
					consumerSecret,
					allowInsecureLocal: options.allowInsecureLocal,
					verify: options.verify,
				} );

				printSuccess( saved, {
					json,
					human: `Added profile ${ saved.profile.name } (${ saved.profile.siteUrl })`,
				} );
			} );
		} );

	auth
		.command( 'list' )
		.description( 'List site profiles.' )
		.option( '--json', 'Emit JSON output.' )
		.action( async ( options: { json?: boolean } ) => {
			const json = isJson( program, options );
			await runAction( { json }, async () => {
				const store = new ProfileStore();
				const config = await store.getConfig();
				const profiles = ( await store.list() ).map( publicProfile );
				printSuccess( { profiles, defaultProfile: config.defaultProfile }, {
					json,
					human: profiles.length
						? profiles.map( ( profile ) => `${ profile.name }\t${ profile.siteUrl }${ profile.name === config.defaultProfile ? '\t(default)' : '' }` ).join( '\n' )
						: 'No profiles configured. Run `wcpay auth add`.',
				} );
			} );
		} );

	auth
		.command( 'remove <profile>' )
		.description( 'Remove a site profile.' )
		.option( '--json', 'Emit JSON output.' )
		.action( async ( name: string, options: { json?: boolean } ) => {
			const json = isJson( program, options );
			await runAction( { json }, async () => {
				const store = new ProfileStore();
				const secretStore = createSecretStore();
				const removed = await store.remove( name );
				await secretStore.delete( removed.auth.secretRef );
				printSuccess( { profile: publicProfile( removed ) }, {
					json,
					human: `Removed profile ${ removed.name }`,
				} );
			} );
		} );

	auth
		.command( 'test [profile]' )
		.description( 'Validate credentials for a profile.' )
		.option( '--json', 'Emit JSON output.' )
		.action( async ( profileName: string | undefined, options: { json?: boolean } ) => {
			const json = isJson( program, options );
			await runAction( { json }, async () => {
				const context = await createContext( { profile: profileName } );
				const settings = await context.client.request( {
					method: 'GET',
					path: '/wc/v3/payments/settings',
				} );
				const mode = classifyMode( settings as Record<string, unknown> );
				printSuccess( {
					profile: publicProfile( context.profile ),
					mode,
				}, {
					json,
					human: `Authenticated to ${ context.profile.name } (${ context.profile.siteUrl }) in ${ mode } mode`,
				} );
			} );
		} );
}

export function registerProfileCommands( program: Command ): void {
	const profile = program.command( 'profile' ).description( 'Manage the active site profile.' );
	profile
		.command( 'use <profile>' )
		.description( 'Set the default profile.' )
		.option( '--json', 'Emit JSON output.' )
		.action( async ( name: string, options: { json?: boolean } ) => {
			const json = isJson( program, options );
			await runAction( { json }, async () => {
				const store = new ProfileStore();
				const selected = await store.setDefault( name );
				printSuccess( { profile: publicProfile( selected ) }, {
					json,
					human: `Using profile ${ selected.name }`,
				} );
			} );
		} );
}

export function registerWhoamiCommand( program: Command ): void {
	program
		.command( 'whoami' )
		.description( 'Show authenticated site/user context.' )
		.option( '--json', 'Emit JSON output.' )
		.action( async ( options: { json?: boolean } ) => {
			const json = isJson( program, options );
			await runAction( { json }, async () => {
				const context = await createContext( { profile: program.opts().profile } );
				printSuccess( { profile: publicProfile( context.profile ) }, {
					json,
					human: `${ context.profile.name }\t${ context.profile.siteUrl }`,
				} );
			} );
		} );
}

async function saveAuthProfile( input: SaveProfileInput ): Promise<{ profile: Omit<Profile, 'auth'>; defaultProfile?: string }> {
	const credentials = { consumerKey: input.consumerKey, consumerSecret: input.consumerSecret };
	validateCredentials( credentials );

	const siteUrl = normalizeSiteUrl( input.site, {
		allowInsecureLocal: input.allowInsecureLocal,
	} );
	const name = input.name ?? deriveProfileName( siteUrl );
	const now = new Date().toISOString();
	const profile: Profile = {
		name,
		siteUrl,
		allowInsecureLocal: Boolean( input.allowInsecureLocal ),
		auth: { type: 'woocommerce_api_key', secretRef: `profile:${ name }` },
		createdAt: now,
		updatedAt: now,
	};

	if ( input.verify !== false ) {
		await verifyProfile( profile, credentials );
	}

	const profileStore = new ProfileStore();
	const secretStore = createSecretStore();
	const savedProfile = await profileStore.upsert( {
		name,
		siteUrl,
		allowInsecureLocal: input.allowInsecureLocal,
	} );
	await secretStore.set( savedProfile.auth.secretRef, credentials );

	const config = await profileStore.getConfig();
	if ( ! config.defaultProfile ) {
		config.defaultProfile = savedProfile.name;
		await profileStore.saveConfig( config );
	}

	return { profile: publicProfile( savedProfile ), defaultProfile: config.defaultProfile };
}

async function verifyProfile( profile: Profile, credentials: { consumerKey: string; consumerSecret: string } ): Promise<void> {
	const client = new RestClient( profile, credentials );
	await client.request( { method: 'GET', path: '/wc/v3/payments/settings' } );
}

function writeNoBrowserInstructions( siteUrl: string, json: boolean ): void {
	if ( json ) {
		return;
	}
	const keysUrl = `${ siteUrl }/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys`;
	process.stderr.write( [
		'No-browser login uses WooCommerce REST API keys.',
		'Create a Read/Write key for a user with manage_woocommerce capability:',
		'',
		`  ${ keysUrl }`,
		'',
		'Then paste the generated consumer key and consumer secret below.',
		'',
	].join( '\n' ) );
}

function isJson( program: Command, options: { json?: boolean } ): boolean {
	return Boolean( options.json || ( program.opts() as { json?: boolean } ).json );
}

function publicProfile( profile: Profile ): Omit<Profile, 'auth'> {
	const { auth: _auth, ...rest } = profile;
	return rest;
}

async function runAction( options: { json?: boolean }, action: () => Promise<void> ): Promise<void> {
	try {
		await action();
	} catch ( error ) {
		printError( error, { json: options.json } );
		process.exitCode = 1;
	}
}
