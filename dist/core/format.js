export function formatKeyValue(rows) {
    const entries = Object.entries(rows).filter(([, value]) => value !== undefined && value !== null);
    const width = Math.max(...entries.map(([key]) => key.length), 0);
    return entries.map(([key, value]) => `${key.padEnd(width)}  ${formatValue(value)}`).join('\n');
}
export function formatList(data, columns) {
    const items = extractItems(data);
    if (items.length === 0) {
        return 'No results.';
    }
    const widths = columns.map((column) => Math.max(column.length, ...items.map((item) => formatValue(item[column]).length)));
    const header = columns.map((column, index) => column.padEnd(widths[index])).join('  ');
    const divider = widths.map((width) => '-'.repeat(width)).join('  ');
    const body = items
        .map((item) => columns.map((column, index) => formatValue(item[column]).padEnd(widths[index])).join('  '))
        .join('\n');
    return `${header}\n${divider}\n${body}`;
}
export function extractItems(data) {
    if (Array.isArray(data)) {
        return data.filter(isRecord);
    }
    if (isRecord(data)) {
        for (const key of ['data', 'items', 'transactions', 'deposits', 'disputes']) {
            const value = data[key];
            if (Array.isArray(value)) {
                return value.filter(isRecord);
            }
        }
    }
    return [];
}
export function formatValue(value) {
    if (value === undefined || value === null) {
        return '';
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    return JSON.stringify(value);
}
function isRecord(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
//# sourceMappingURL=format.js.map