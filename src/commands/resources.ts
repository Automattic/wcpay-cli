import { Command } from 'commander';
import { createContext } from '../core/context.js';
import { amountColumn, formatKeyValue, formatList } from '../core/format.js';
import { printSuccess } from '../core/output.js';
import type { RestClient } from '../core/api.js';
import { fetchAllPages } from '../core/pagination.js';
import { isJsonOutput, runCommandAction } from './common.js';
import { sendGuardedWrite } from './guarded-write.js';
import { assertAllFlagUsage, buildListQuery, type ListOptions } from './list-options.js';

export function registerResourceCommands(program: Command): void {
	const deposits = registerListGetResource(program, {
		name: 'deposits',
		description: 'Inspect WooPayments deposits.',
		basePath: '/wc/v3/payments/deposits',
		idName: 'deposit',
		listDefaultSort: 'date',
	});

	const disputes = registerListGetResource(program, {
		name: 'disputes',
		description: 'Inspect WooPayments disputes.',
		basePath: '/wc/v3/payments/disputes',
		idName: 'dispute',
		listDefaultSort: 'created',
	});

	deposits
		.command('overview')
		.description('Show deposit and balance overview across currencies.')
		.option('--json', 'Emit JSON output.')
		.action(async (options: { json?: boolean }) => {
			const json = isJsonOutput(program, options);
			await runCommandAction({ json }, async () => {
				const context = await createContext({ profile: program.opts().profile });
				const data = await context.client.request({
					method: 'GET',
					path: '/wc/v3/payments/deposits/overview-all',
				});
				printSuccess(data, { json });
			});
		});

	disputes
		.command('summary')
		.description('Show dispute counts by status.')
		.option('--json', 'Emit JSON output.')
		.action(async (options: { json?: boolean }) => {
			const json = isJsonOutput(program, options);
			await runCommandAction({ json }, async () => {
				const context = await createContext({ profile: program.opts().profile });
				const data = await context.client.request({
					method: 'GET',
					path: '/wc/v3/payments/disputes/summary',
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

	disputes
		.command('close <id>')
		.description('Close (concede) a test/dev-mode dispute.')
		.option('--dry-run', 'Print the request without sending it.')
		.option('--yes', 'Confirm the test/dev-mode write.')
		.option('--json', 'Emit JSON output.')
		.action(
			async (id: string, options: { dryRun?: boolean; yes?: boolean; json?: boolean }) => {
				const json = isJsonOutput(program, options);
				await runCommandAction({ json }, async () => {
					await sendGuardedWrite(program, {
						path: `/wc/v3/payments/disputes/${encodeURIComponent(id)}/close`,
						body: {},
						dryRun: Boolean(
							options.dryRun || (program.opts() as { dryRun?: boolean }).dryRun
						),
						yes: Boolean(options.yes || (program.opts() as { yes?: boolean }).yes),
						json,
					});
				});
			}
		);

	const transactions = program
		.command('transactions')
		.description('Inspect WooPayments transactions.');
	transactions
		.command('list')
		.description('List transactions.')
		.option('--json', 'Emit JSON output.')
		.option('--page <page>', 'Page number.')
		.option('--limit <limit>', 'Page size.')
		.option('--since <date>', 'Filter after this date.')
		.option('--until <date>', 'Filter before this date.')
		.option('--currency <code>', 'Filter store currency.')
		.option('--all', 'Fetch all pages (up to 10 pages of 100 records).')
		.action(async (options: ListOptions) => {
			await runCommandAction({ json: isJsonOutput(program, options) }, async () => {
				assertAllFlagUsage(options);
				const context = await createContext({ profile: program.opts().profile });
				const query = buildListQuery(options, { currencyParam: 'store_currency_is' });
				const data = options.all
					? await collectAllPages(context, '/wc/v3/payments/transactions', query)
					: await context.client.request({
							method: 'GET',
							path: '/wc/v3/payments/transactions',
							query,
						});
				printSuccess(data, {
					json: isJsonOutput(program, options),
					human: formatList(
						data,
						['transaction_id', 'date', 'type', 'amount', 'currency'],
						{
							amount: amountColumn,
						}
					),
				});
			});
		});

	transactions
		.command('summary')
		.description('Show transaction totals for the selected filters.')
		.option('--json', 'Emit JSON output.')
		.option('--since <date>', 'Filter after this date.')
		.option('--until <date>', 'Filter before this date.')
		.action(async (options: ListOptions) => {
			const json = isJsonOutput(program, options);
			await runCommandAction({ json }, async () => {
				const context = await createContext({ profile: program.opts().profile });
				const data = await context.client.request({
					method: 'GET',
					path: '/wc/v3/payments/transactions/summary',
					query: buildListQuery(options),
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

	transactions
		.command('get <id>')
		.description('Get a transaction by ID if the store endpoint supports it.')
		.option('--json', 'Emit JSON output.')
		.action(async (id: string, options: { json?: boolean }) => {
			await runCommandAction({ json: isJsonOutput(program, options) }, async () => {
				// WooPayments currently exposes transaction list and summaries, but not a stable
				// single-transaction REST route. Keep the command explicit rather than guessing.
				printSuccess(
					{
						id,
						implemented: false,
						reason: 'No reviewed single-transaction WooPayments REST endpoint is allowlisted yet.',
					},
					{
						json: isJsonOutput(program, options),
						human: 'No allowlisted single-transaction endpoint yet.',
					}
				);
			});
		});

	const charges = program.command('charges').description('Inspect WooPayments charges.');
	charges
		.command('get <id>')
		.description('Get a charge.')
		.option('--json', 'Emit JSON output.')
		.action(async (id: string, options: { json?: boolean }) => {
			await runCommandAction({ json: isJsonOutput(program, options) }, async () => {
				const context = await createContext({ profile: program.opts().profile });
				const data = await context.client.request({
					method: 'GET',
					path: `/wc/v3/payments/charges/${encodeURIComponent(id)}`,
				});
				printSuccess(data, { json: isJsonOutput(program, options) });
			});
		});

	const paymentIntents = program
		.command('payment-intents')
		.description('Inspect WooPayments payment intents.');
	paymentIntents
		.command('get <id>')
		.description('Get a payment intent.')
		.option('--json', 'Emit JSON output.')
		.action(async (id: string, options: { json?: boolean }) => {
			const json = isJsonOutput(program, options);
			await runCommandAction({ json }, async () => {
				const context = await createContext({ profile: program.opts().profile });
				const data = await context.client.request({
					method: 'GET',
					path: `/wc/v3/payments/payment_intents/${encodeURIComponent(id)}`,
				});
				printSuccess(data, { json });
			});
		});

	const timeline = program
		.command('timeline')
		.description('Inspect WooPayments payment timelines.');
	timeline
		.command('get <intent-id>')
		.description('Get the event timeline for a payment intent.')
		.option('--json', 'Emit JSON output.')
		.action(async (intentId: string, options: { json?: boolean }) => {
			const json = isJsonOutput(program, options);
			await runCommandAction({ json }, async () => {
				const context = await createContext({ profile: program.opts().profile });
				const data = await context.client.request({
					method: 'GET',
					path: `/wc/v3/payments/timeline/${encodeURIComponent(intentId)}`,
				});
				printSuccess(data, { json });
			});
		});
}

function registerListGetResource(
	program: Command,
	resource: {
		name: string;
		description: string;
		basePath: string;
		idName: string;
		listDefaultSort?: string;
	}
): Command {
	const command = program.command(resource.name).description(resource.description);

	command
		.command('list')
		.description(`List ${resource.name}.`)
		.option('--json', 'Emit JSON output.')
		.option('--page <page>', 'Page number.')
		.option('--limit <limit>', 'Page size.')
		.option('--since <date>', 'Filter after this date.')
		.option('--until <date>', 'Filter before this date.')
		.option('--status <status>', 'Filter status.')
		.option('--all', 'Fetch all pages (up to 10 pages of 100 records).')
		.action(async (options: ListOptions) => {
			await runCommandAction({ json: isJsonOutput(program, options) }, async () => {
				assertAllFlagUsage(options);
				const context = await createContext({ profile: program.opts().profile });
				const query = buildListQuery(options, { defaultSort: resource.listDefaultSort });
				const data = options.all
					? await collectAllPages(context, resource.basePath, query)
					: await context.client.request({
							method: 'GET',
							path: resource.basePath,
							query,
						});
				printSuccess(data, {
					json: isJsonOutput(program, options),
					human: formatList(data, columnsForResource(resource.name), {
						amount: amountColumn,
					}),
				});
			});
		});

	command
		.command('get <id>')
		.description(`Get a ${resource.idName}.`)
		.option('--json', 'Emit JSON output.')
		.action(async (id: string, options: { json?: boolean }) => {
			await runCommandAction({ json: isJsonOutput(program, options) }, async () => {
				const context = await createContext({ profile: program.opts().profile });
				const data = await context.client.request({
					method: 'GET',
					path: `${resource.basePath}/${encodeURIComponent(id)}`,
				});
				printSuccess(data, { json: isJsonOutput(program, options) });
			});
		});

	return command;
}

export async function collectAllPages(
	context: { client: RestClient },
	path: string,
	query: Record<string, string | number>
): Promise<{ data: Array<Record<string, unknown>> }> {
	const result = await fetchAllPages(context.client, path, query);
	if (result.truncated) {
		process.stderr.write(
			`Stopped after ${result.pages} pages (${result.data.length} records). Refine filters to see the rest.\n`
		);
	}
	return { data: result.data };
}

function columnsForResource(resourceName: string): string[] {
	if (resourceName === 'deposits') {
		return ['id', 'date', 'amount', 'currency', 'status'];
	}
	if (resourceName === 'disputes') {
		return ['id', 'created', 'amount', 'currency', 'status'];
	}
	return ['id'];
}
