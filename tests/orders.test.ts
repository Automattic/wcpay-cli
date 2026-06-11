import { describe, expect, it } from 'vitest';
import { formatOrder, getOrderMeta } from '../src/commands/orders.js';

const order = {
	id: 123,
	status: 'processing',
	total: '45.00',
	currency: 'USD',
	payment_method_title: 'WooPayments',
	date_created: '2026-06-01T00:00:00',
	meta_data: [
		{ id: 1, key: '_intent_id', value: 'pi_123' },
		{ id: 2, key: '_charge_id', value: 'ch_456' },
		{ id: 3, key: '_wcpay_mode', value: 'test' },
	],
};

describe('getOrderMeta', () => {
	it('extracts a meta value by key', () => {
		expect(getOrderMeta(order, '_intent_id')).toBe('pi_123');
		expect(getOrderMeta(order, '_missing')).toBeUndefined();
		expect(getOrderMeta({ id: 1 }, '_intent_id')).toBeUndefined();
	});
});

describe('formatOrder', () => {
	it('surfaces WooPayments metadata', () => {
		const output = formatOrder(order);
		expect(output).toContain('pi_123');
		expect(output).toContain('ch_456');
		expect(output).toContain('processing');
	});
});
