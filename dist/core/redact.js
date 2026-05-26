const SENSITIVE_QUERY_PARAMS = new Set([
    'oauth_consumer_key',
    'oauth_signature',
    'consumer_key',
    'consumer_secret',
    '_wpnonce',
]);
const SENSITIVE_HEADER_NAMES = new Set(['authorization', 'x-mcp-api-key', 'x-wp-nonce']);
const SENSITIVE_OBJECT_KEY_PATTERNS = [/secret/i, /token/i, /password/i, /authorization/i, /consumer_key/i, /consumer_secret/i];
export function redactUrl(urlString) {
    const url = new URL(urlString);
    for (const param of SENSITIVE_QUERY_PARAMS) {
        if (url.searchParams.has(param)) {
            url.searchParams.set(param, '[redacted]');
        }
    }
    return url.toString();
}
export function redactHeaders(headers) {
    return Object.fromEntries(Object.entries(headers).map(([key, value]) => [
        key,
        SENSITIVE_HEADER_NAMES.has(key.toLowerCase()) ? '[redacted]' : value,
    ]));
}
export function redactValue(value) {
    if (Array.isArray(value)) {
        return value.map((item) => redactValue(item));
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, entryValue]) => [
            key,
            isSensitiveObjectKey(key) ? '[redacted]' : redactValue(entryValue),
        ]));
    }
    return value;
}
function isSensitiveObjectKey(key) {
    return SENSITIVE_OBJECT_KEY_PATTERNS.some((pattern) => pattern.test(key));
}
//# sourceMappingURL=redact.js.map