import { createHmac, randomBytes } from 'node:crypto';
import { CliError } from './errors.js';
export class RestClient {
    profile;
    credentials;
    fetchImpl;
    nonce;
    timestamp;
    constructor(profile, credentials, options = {}) {
        this.profile = profile;
        this.credentials = credentials;
        this.fetchImpl = options.fetch ?? fetch;
        this.nonce = options.nonce ?? (() => randomBytes(16).toString('hex'));
        this.timestamp = options.timestamp ?? (() => Math.floor(Date.now() / 1000));
    }
    resolve(request) {
        const method = normalizeMethod(request.method);
        const url = buildRestUrl(this.profile.siteUrl, request.path, request.query);
        const headers = {
            Accept: 'application/json',
            'User-Agent': 'wcpay-cli/0.0.0',
            ...request.headers,
        };
        let body;
        if (request.body !== undefined) {
            headers['Content-Type'] = 'application/json; charset=utf-8';
            body = JSON.stringify(request.body);
        }
        if (url.protocol === 'https:') {
            headers.Authorization = `Basic ${Buffer.from(`${this.credentials.consumerKey}:${this.credentials.consumerSecret}`).toString('base64')}`;
        }
        else {
            applyOAuthQueryParams(url, method, this.credentials, this.nonce(), this.timestamp());
        }
        return { method, url: url.toString(), headers, body };
    }
    async request(request) {
        const resolved = this.resolve(request);
        const response = await this.fetchImpl(resolved.url, {
            method: resolved.method,
            headers: resolved.headers,
            body: resolved.body,
        });
        const text = await response.text();
        const data = parseResponseBody(text);
        if (!response.ok) {
            throw new CliError({
                code: getErrorCode(data) ?? 'rest_request_failed',
                message: getErrorMessage(data) ?? `Request failed with status ${response.status}.`,
                status: response.status,
                details: data,
            });
        }
        return data;
    }
}
export function normalizeMethod(method) {
    const normalized = method.toUpperCase();
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(normalized)) {
        throw new CliError({
            code: 'invalid_http_method',
            message: `Unsupported HTTP method: ${method}`,
            status: 2,
        });
    }
    return normalized;
}
export function isReadMethod(method) {
    return ['GET', 'HEAD', 'OPTIONS'].includes(normalizeMethod(method));
}
export function normalizeRestPath(path) {
    let normalized = path.trim();
    if (!normalized) {
        throw new CliError({
            code: 'missing_rest_path',
            message: 'REST path is required.',
            status: 2,
        });
    }
    if (/^https?:\/\//.test(normalized)) {
        const url = new URL(normalized);
        normalized = `${url.pathname}${url.search}`;
    }
    normalized = normalized.replace(/^\/+/, '');
    normalized = normalized.replace(/^wp-json\//, '');
    return `/${normalized}`;
}
export function buildRestUrl(siteUrl, path, query = {}) {
    const normalizedPath = normalizeRestPath(path);
    const url = new URL(`${siteUrl.replace(/\/$/, '')}/wp-json${normalizedPath}`);
    for (const [key, value] of Object.entries(query)) {
        appendQueryParam(url.searchParams, key, value);
    }
    return url;
}
function appendQueryParam(params, key, value) {
    if (value === undefined) {
        return;
    }
    if (Array.isArray(value)) {
        for (const item of value) {
            appendQueryParam(params, key, item);
        }
        return;
    }
    params.append(key, value === null ? '' : String(value));
}
function applyOAuthQueryParams(url, method, credentials, nonce, timestamp) {
    const oauthParams = {
        oauth_consumer_key: credentials.consumerKey,
        oauth_nonce: nonce,
        oauth_signature_method: 'HMAC-SHA256',
        oauth_timestamp: String(timestamp),
    };
    for (const [key, value] of Object.entries(oauthParams)) {
        url.searchParams.set(key, value);
    }
    const params = Object.fromEntries(url.searchParams.entries());
    const signature = createOAuthSignature(method, url, params, credentials.consumerSecret);
    url.searchParams.set('oauth_signature', signature);
}
export function createOAuthSignature(method, url, params, consumerSecret) {
    const unsignedParams = { ...params };
    delete unsignedParams.oauth_signature;
    const normalizedPairs = Object.entries(unsignedParams)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`);
    const baseUrl = `${url.origin}${url.pathname}`;
    const stringToSign = [
        method,
        percentEncode(baseUrl),
        percentEncode(normalizedPairs.join('&')),
    ].join('&');
    return createHmac('sha256', `${consumerSecret}&`).update(stringToSign).digest('base64');
}
export function percentEncode(value) {
    return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}
function parseResponseBody(text) {
    if (!text) {
        return null;
    }
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
function getErrorCode(data) {
    if (data && typeof data === 'object' && 'code' in data && typeof data.code === 'string') {
        return data.code;
    }
    return undefined;
}
function getErrorMessage(data) {
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
        return data.message;
    }
    return undefined;
}
//# sourceMappingURL=api.js.map