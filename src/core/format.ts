export function formatKeyValue(rows: Record<string, unknown>): string {
	const entries = Object.entries(rows).filter(
		([, value]) => value !== undefined && value !== null
	);
	const width = Math.max(...entries.map(([key]) => key.length), 0);
	return entries.map(([key, value]) => `${key.padEnd(width)}  ${formatValue(value)}`).join('\n');
}

export type ColumnFormatter = (item: Record<string, unknown>) => string;

export function formatList(
	data: unknown,
	columns: string[],
	formatters: Record<string, ColumnFormatter> = {}
): string {
	const items = extractItems(data);
	if (items.length === 0) {
		return 'No results.';
	}

	const cell = (item: Record<string, unknown>, column: string): string =>
		formatters[column] ? formatters[column](item) : formatValue(item[column]);

	const widths = columns.map((column) =>
		Math.max(column.length, ...items.map((item) => cell(item, column).length))
	);
	const header = columns.map((column, index) => column.padEnd(widths[index])).join('  ');
	const divider = widths.map((width) => '-'.repeat(width)).join('  ');
	const body = items
		.map((item) =>
			columns.map((column, index) => cell(item, column).padEnd(widths[index])).join('  ')
		)
		.join('\n');

	return `${header}\n${divider}\n${body}`;
}

const ZERO_DECIMAL_CURRENCIES = new Set([
	'bif',
	'clp',
	'djf',
	'gnf',
	'jpy',
	'kmf',
	'krw',
	'mga',
	'pyg',
	'rwf',
	'ugx',
	'vnd',
	'vuv',
	'xaf',
	'xof',
	'xpf',
]);

export function formatAmount(minorUnits: number, currency?: string): string {
	if (!currency) {
		return String(minorUnits);
	}
	const zeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase());
	const amount = zeroDecimal ? minorUnits : minorUnits / 100;
	try {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency.toUpperCase(),
		}).format(amount);
	} catch {
		return `${amount.toFixed(zeroDecimal ? 0 : 2)} ${currency.toUpperCase()}`;
	}
}

export const amountColumn: ColumnFormatter = (item) =>
	typeof item.amount === 'number'
		? formatAmount(item.amount, typeof item.currency === 'string' ? item.currency : undefined)
		: formatValue(item.amount);

export function extractItems(data: unknown): Array<Record<string, unknown>> {
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

export function formatValue(value: unknown): string {
	if (value === undefined || value === null) {
		return '';
	}
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
