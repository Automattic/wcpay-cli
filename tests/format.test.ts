import { describe, expect, it } from 'vitest';
import {
	amountColumn,
	extractItems,
	formatAmount,
	formatKeyValue,
	formatList,
} from '../src/core/format.js';

describe('formatKeyValue', () => {
	it('formats key value rows', () => {
		expect(formatKeyValue({ Mode: 'test', Enabled: true })).toContain('Mode');
		expect(formatKeyValue({ Mode: 'test', Empty: undefined })).not.toContain('Empty');
	});
});

describe('extractItems', () => {
	it('extracts arrays from common response wrappers', () => {
		expect(extractItems({ data: [{ id: '1' }] })).toEqual([{ id: '1' }]);
		expect(extractItems([{ id: '2' }])).toEqual([{ id: '2' }]);
	});
});

describe('formatList', () => {
	it('formats tabular data', () => {
		const table = formatList({ data: [{ id: 'tr_1', amount: 100 }] }, ['id', 'amount']);
		expect(table).toContain('tr_1');
		expect(table).toContain('amount');
	});

	it('applies a column formatter', () => {
		const output = formatList(
			{ data: [{ id: 'txn_1', amount: 4500, currency: 'usd' }] },
			['id', 'amount'],
			{ amount: amountColumn }
		);
		expect(output).toContain('$45.00');
	});
});

describe('formatAmount', () => {
	it('formats minor units as currency', () => {
		expect(formatAmount(4500, 'usd')).toBe('$45.00');
		expect(formatAmount(4500, 'eur')).toBe('€45.00');
	});

	it('does not divide zero-decimal currencies', () => {
		expect(formatAmount(4500, 'jpy')).toBe('¥4,500');
	});

	it('falls back to the raw number without a currency', () => {
		expect(formatAmount(4500)).toBe('4500');
	});

	it('lets Intl render unknown-but-well-formed currency codes', () => {
		// Intl separates the code and the number with a non-breaking space.
		expect(formatAmount(4500, 'zzz')).toBe('ZZZ 45.00');
	});

	it('falls back gracefully for malformed currency codes', () => {
		expect(formatAmount(4500, 'z!')).toBe('45.00 Z!');
	});
});
