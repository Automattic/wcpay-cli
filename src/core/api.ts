import { createHmac, randomBytes } from 'node:crypto';
import { CliError } from './errors.js';
import type { Profile } from './profiles.js';
import type { WooCommerceApiCredentials } from './secrets.js';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface RestRequest {
	method: HttpMethod;
	path: string;
	query?: Record<string, unknown>;
	body?: unknown;
	headers?: Record<string, string>;
	dryRun?: boolean;
}

export interface ResolvedRestRequest {
	method: HttpMethod;
	url: string;
	headers: Record<string, string>;
	body?: string;
}

export interface RestClientOptions {
	fetch?: typeof fetch;
	nonce?: () => string;
	timestamp?: () => number;
}

export class RestClient {
	private readonly fetchImpl: typeof fetch;
	private readonly nonce: () => string;
	private readonly timestamp: () => number;

	public constructor(
		private readonly profile: Profile,
		private readonly credentials: WooCommerceApiCredentials,
		options: RestClientOptions = {}
	) {
		this.fetchImpl = options.fetch ?? fetch;
		this.nonce = options.nonce ?? ( () => randomBytes( 16 ).toString( 'hex' ) );
		this.timestamp = options.timestamp ?? ( () => Math.floor( Date.now() / 1000 ) );
	}

	public resolve( request: RestRequest ): ResolvedRestRequest {
		const method = normalizeMethod( request.method );
		const url = buildRestUrl( this.profile.siteUrl, request.path, request.query );
		const headers: Record<string, string> = {
			Accept: 'application/json',
			'User-Agent': 'wcpay-cli/0.0.0',
			...request.headers,
		};

		let body: string | undefined;
		if ( request.body !== undefined ) {
			headers[ 'Content-Type' ] = 'application/json; charset=utf-8';
			body = JSON.stringify( request.body );
		}

		if ( url.protocol === 'https:' ) {
			headers.Authorization = `Basic ${ Buffer.from(
				`${ this.credentials.consumerKey }:${ this.credentials.consumerSecret }`
			).toString( 'base64' ) }`;
		} else {
			applyOAuthQueryParams( url, method, this.credentials, this.nonce(), this.timestamp() );
		}

		return { method, url: url.toString(), headers, body };
	}

	public async request<T = unknown>( request: RestRequest ): Promise<T> {
		const resolved = this.resolve( request );
		const response = await this.fetchImpl( resolved.url, {
			method: resolved.method,
			headers: resolved.headers,
			body: resolved.body,
		} );

		const text = await response.text();
		const data = parseResponseBody( text );

		if ( ! response.ok ) {
			throw new CliError( {
				code: getErrorCode( data ) ?? 'rest_request_failed',
				message: getErrorMessage( data ) ?? `Request failed with status ${ response.status }.` ,
				status: response.status,
				details: data,
			} );
		}

		return data as T;
	}
}

export function normalizeMethod( method: string ): HttpMethod {
	const normalized = method.toUpperCase();
	if ( ! [ 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS' ].includes( normalized ) ) {
		throw new CliError( {
			code: 'invalid_http_method',
			message: `Unsupported HTTP method: ${ method }`,
			status: 2,
		} );
	}
	return normalized as HttpMethod;
}

export function isReadMethod( method: string ): boolean {
	return [ 'GET', 'HEAD', 'OPTIONS' ].includes( normalizeMethod( method ) );
}

export function normalizeRestPath( path: string ): string {
	let normalized = path.trim();
	if ( ! normalized ) {
		throw new CliError( {
			code: 'missing_rest_path',
			message: 'REST path is required.',
			status: 2,
		} );
	}

	if ( /^https?:\/\//.test( normalized ) ) {
		const url = new URL( normalized );
		normalized = `${ url.pathname }${ url.search }`;
	}

	normalized = normalized.replace( /^\/+/, '' );
	normalized = normalized.replace( /^wp-json\//, '' );
	return `/${ normalized }`;
}

export function buildRestUrl( siteUrl: string, path: string, query: Record<string, unknown> = {} ): URL {
	const normalizedPath = normalizeRestPath( path );
	const url = new URL( `${ siteUrl.replace( /\/$/, '' ) }/wp-json${ normalizedPath }` );

	for ( const [ key, value ] of Object.entries( query ) ) {
		appendQueryParam( url.searchParams, key, value );
	}

	return url;
}

function appendQueryParam( params: URLSearchParams, key: string, value: unknown ): void {
	if ( value === undefined ) {
		return;
	}
	if ( Array.isArray( value ) ) {
		for ( const item of value ) {
			appendQueryParam( params, key, item );
		}
		return;
	}
	params.append( key, value === null ? '' : String( value ) );
}

function applyOAuthQueryParams(
	url: URL,
	method: HttpMethod,
	credentials: WooCommerceApiCredentials,
	nonce: string,
	timestamp: number
): void {
	const oauthParams: Record<string, string> = {
		oauth_consumer_key: credentials.consumerKey,
		oauth_nonce: nonce,
		oauth_signature_method: 'HMAC-SHA256',
		oauth_timestamp: String( timestamp ),
	};

	for ( const [ key, value ] of Object.entries( oauthParams ) ) {
		url.searchParams.set( key, value );
	}

	const params = Object.fromEntries( url.searchParams.entries() );
	const signature = createOAuthSignature( method, url, params, credentials.consumerSecret );
	url.searchParams.set( 'oauth_signature', signature );
}

export function createOAuthSignature(
	method: HttpMethod,
	url: URL,
	params: Record<string, string>,
	consumerSecret: string
): string {
	const unsignedParams = { ...params };
	delete unsignedParams.oauth_signature;

	const normalizedPairs = Object.entries( unsignedParams )
		.sort( ( [ a ], [ b ] ) => a.localeCompare( b ) )
		.map( ( [ key, value ] ) => `${ percentEncode( key ) }=${ percentEncode( value ) }` );

	const baseUrl = `${ url.origin }${ url.pathname }`;
	const stringToSign = [
		method,
		percentEncode( baseUrl ),
		percentEncode( normalizedPairs.join( '&' ) ),
	].join( '&' );

	return createHmac( 'sha256', `${ consumerSecret }&` ).update( stringToSign ).digest( 'base64' );
}

export function percentEncode( value: string ): string {
	return encodeURIComponent( value ).replace( /[!'()*]/g, ( char ) =>
		`%${ char.charCodeAt( 0 ).toString( 16 ).toUpperCase() }`
	);
}

function parseResponseBody( text: string ): unknown {
	if ( ! text ) {
		return null;
	}
	try {
		return JSON.parse( text );
	} catch {
		return text;
	}
}

function getErrorCode( data: unknown ): string | undefined {
	if ( data && typeof data === 'object' && 'code' in data && typeof data.code === 'string' ) {
		return data.code;
	}
	return undefined;
}

function getErrorMessage( data: unknown ): string | undefined {
	if ( data && typeof data === 'object' && 'message' in data && typeof data.message === 'string' ) {
		return data.message;
	}
	return undefined;
}
