import { Command } from 'commander';
import { createContext } from '../core/context.js';
import { formatKeyValue } from '../core/format.js';
import { printSuccess } from '../core/output.js';
import { parsePositiveInteger } from '../core/validation.js';
import { isJsonOutput, runCommandAction } from './common.js';

export function registerOrderCommands(program: Command): void {
	const orders = program
		.command('orders')
		.description('Inspect WooCommerce orders and their WooPayments metadata.');
	orders
		.command('get <order-id>')
		.description('Get an order with its WooPayments payment metadata.')
		.option('--json', 'Emit JSON output.')
		.action(async (orderId: string, options: { json?: boolean }) => {
			const json = isJsonOutput(program, options);
			await runCommandAction({ json }, async () => {
				const id = parsePositiveInteger(orderId, '<order-id>');
				const context = await createContext({ profile: program.opts().profile });
				const data = await context.client.request({
					method: 'GET',
					path: `/wc/v3/orders/${id}`,
				});
				printSuccess(data, { json, human: formatOrder(data) });
			});
		});
}

export function formatOrder(data: unknown): string {
	if (!data || typeof data !== 'object') {
		return String(data);
	}
	const order = data as Record<string, unknown>;
	return formatKeyValue({
		ID: order.id,
		Status: order.status,
		Total: order.total,
		Currency: order.currency,
		'Payment method': order.payment_method_title ?? order.payment_method,
		Created: order.date_created,
		'Intent ID': getOrderMeta(order, '_intent_id'),
		'Charge ID': getOrderMeta(order, '_charge_id'),
		'WooPayments mode': getOrderMeta(order, '_wcpay_mode'),
	});
}

export function getOrderMeta(order: Record<string, unknown>, key: string): unknown {
	const meta = order.meta_data;
	if (!Array.isArray(meta)) {
		return undefined;
	}
	const entry = meta.find(
		(item) => item && typeof item === 'object' && (item as { key?: unknown }).key === key
	);
	return entry ? (entry as { value?: unknown }).value : undefined;
}
