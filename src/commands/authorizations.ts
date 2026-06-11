import { Command } from 'commander';
import { createContext } from '../core/context.js';
import { amountColumn, formatKeyValue, formatList } from '../core/format.js';
import { printSuccess } from '../core/output.js';
import { parsePositiveInteger } from '../core/validation.js';
import { isJsonOutput, runCommandAction } from './common.js';
import { sendGuardedWrite } from './guarded-write.js';
import { buildListQuery, type ListOptions } from './list-options.js';

interface AuthorizationWriteOptions {
	order?: string;
	intent?: string;
	dryRun?: boolean;
	yes?: boolean;
	json?: boolean;
}

export function registerAuthorizationCommands(program: Command): void {
	const authorizations = program
		.command('authorizations')
		.description('Inspect and manage uncaptured payment authorizations.');

	authorizations
		.command('list')
		.description('List uncaptured authorizations.')
		.option('--json', 'Emit JSON output.')
		.option('--page <page>', 'Page number.')
		.option('--limit <limit>', 'Page size.')
		.action(async (options: ListOptions) => {
			const json = isJsonOutput(program, options);
			await runCommandAction({ json }, async () => {
				const context = await createContext({ profile: program.opts().profile });
				const data = await context.client.request({
					method: 'GET',
					path: '/wc/v3/payments/authorizations',
					query: buildListQuery(options, { defaultSort: 'created' }),
				});
				printSuccess(data, {
					json,
					human: formatList(
						data,
						['payment_intent_id', 'created', 'amount', 'currency', 'order_id'],
						{ amount: amountColumn }
					),
				});
			});
		});

	authorizations
		.command('get <payment-intent-id>')
		.description('Get an authorization by payment intent ID.')
		.option('--json', 'Emit JSON output.')
		.action(async (intentId: string, options: { json?: boolean }) => {
			const json = isJsonOutput(program, options);
			await runCommandAction({ json }, async () => {
				const context = await createContext({ profile: program.opts().profile });
				const data = await context.client.request({
					method: 'GET',
					path: `/wc/v3/payments/authorizations/${encodeURIComponent(intentId)}`,
				});
				printSuccess(data, { json });
			});
		});

	authorizations
		.command('summary')
		.description('Show a summary of uncaptured authorizations.')
		.option('--json', 'Emit JSON output.')
		.action(async (options: { json?: boolean }) => {
			const json = isJsonOutput(program, options);
			await runCommandAction({ json }, async () => {
				const context = await createContext({ profile: program.opts().profile });
				const data = await context.client.request({
					method: 'GET',
					path: '/wc/v3/payments/authorizations/summary',
				});
				printSuccess(data, {
					json,
					human:
						data && typeof data === 'object'
							? formatKeyValue(data as Record<string, unknown>)
							: String(data),
				});
			});
		});

	registerAuthorizationWrite(program, authorizations, 'capture', 'capture_authorization');
	registerAuthorizationWrite(program, authorizations, 'cancel', 'cancel_authorization');
}

function registerAuthorizationWrite(
	program: Command,
	authorizations: Command,
	name: 'capture' | 'cancel',
	endpointAction: 'capture_authorization' | 'cancel_authorization'
): void {
	authorizations
		.command(name)
		.description(`${name === 'capture' ? 'Capture' : 'Cancel'} a test/dev-mode authorization.`)
		.requiredOption('--order <order-id>', 'WooCommerce order ID.')
		.requiredOption('--intent <payment-intent-id>', 'Payment intent ID.')
		.option('--dry-run', 'Print the request without sending it.')
		.option('--yes', 'Confirm the test/dev-mode write.')
		.option('--json', 'Emit JSON output.')
		.action(async (options: AuthorizationWriteOptions) => {
			const json = isJsonOutput(program, options);
			await runCommandAction({ json }, async () => {
				const orderId = parsePositiveInteger(options.order, '--order');
				await sendGuardedWrite(program, {
					path: `/wc/v3/payments/orders/${orderId}/${endpointAction}`,
					body: { payment_intent_id: options.intent },
					dryRun: Boolean(
						options.dryRun || (program.opts() as { dryRun?: boolean }).dryRun
					),
					yes: Boolean(options.yes || (program.opts() as { yes?: boolean }).yes),
					json,
				});
			});
		});
}
