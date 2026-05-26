import { WCPAY_ABILITIES, normalizeAbilityCollection, runReadAbilityWithRestFallback, } from '../core/abilities.js';
import { createContext } from '../core/context.js';
import { formatList } from '../core/format.js';
import { printError, printSuccess } from '../core/output.js';
import { parseOptionalPositiveInteger } from '../core/validation.js';
export function registerResourceCommands(program) {
    registerListGetResource(program, {
        name: 'deposits',
        description: 'Inspect WooPayments deposits.',
        basePath: '/wc/v3/payments/deposits',
        idName: 'deposit',
        listAbility: WCPAY_ABILITIES.getDeposits,
        listAbilityCollectionKey: 'deposits',
        listDefaultSort: 'date',
    });
    registerListGetResource(program, {
        name: 'disputes',
        description: 'Inspect WooPayments disputes.',
        basePath: '/wc/v3/payments/disputes',
        idName: 'dispute',
        listAbility: WCPAY_ABILITIES.getDisputes,
        listAbilityCollectionKey: 'disputes',
        listDefaultSort: 'created',
        getAbility: WCPAY_ABILITIES.getDispute,
        getAbilityInputKey: 'dispute_id',
    });
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
        .action(async (options) => {
        await runResourceAction({ json: isJson(program, options) }, async () => {
            const context = await createContext({ profile: program.opts().profile });
            const restQuery = buildListQuery(options, { currencyParam: 'store_currency_is' });
            const data = await runReadAbilityWithRestFallback(context.client, WCPAY_ABILITIES.getTransactions, buildAbilityListInput(options, { currencyParam: 'store_currency_is' }), () => context.client.request({
                method: 'GET',
                path: '/wc/v3/payments/transactions',
                query: restQuery,
            }), (result) => normalizeAbilityCollection(result, 'transactions'));
            printSuccess(data, {
                json: isJson(program, options),
                human: formatList(data, ['id', 'date', 'type', 'amount', 'currency']),
            });
        });
    });
    transactions
        .command('get <id>')
        .description('Get a transaction by ID if the store endpoint supports it.')
        .option('--json', 'Emit JSON output.')
        .action(async (id, options) => {
        await runResourceAction({ json: isJson(program, options) }, async () => {
            // WooPayments currently exposes transaction list and summaries, but not a stable
            // single-transaction REST route. Keep the command explicit rather than guessing.
            printSuccess({
                id,
                implemented: false,
                reason: 'No reviewed single-transaction WooPayments REST endpoint is allowlisted yet.',
            }, {
                json: isJson(program, options),
                human: 'No allowlisted single-transaction endpoint yet.',
            });
        });
    });
    const charges = program.command('charges').description('Inspect WooPayments charges.');
    charges
        .command('get <id>')
        .description('Get a charge.')
        .option('--json', 'Emit JSON output.')
        .action(async (id, options) => {
        await runResourceAction({ json: isJson(program, options) }, async () => {
            const context = await createContext({ profile: program.opts().profile });
            const data = await runReadAbilityWithRestFallback(context.client, WCPAY_ABILITIES.getCharge, { charge_id: id }, () => context.client.request({
                method: 'GET',
                path: `/wc/v3/payments/charges/${encodeURIComponent(id)}`,
            }));
            printSuccess(data, { json: isJson(program, options) });
        });
    });
}
function registerListGetResource(program, resource) {
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
        .action(async (options) => {
        await runResourceAction({ json: isJson(program, options) }, async () => {
            const context = await createContext({ profile: program.opts().profile });
            const restQuery = buildListQuery(options, { defaultSort: resource.listDefaultSort });
            const restFallback = () => context.client.request({
                method: 'GET',
                path: resource.basePath,
                query: restQuery,
            });
            const data = resource.listAbility
                ? await runReadAbilityWithRestFallback(context.client, resource.listAbility, buildAbilityListInput(options, { defaultSort: resource.listDefaultSort }), restFallback, (result) => normalizeAbilityCollection(result, resource.listAbilityCollectionKey ?? resource.name))
                : await restFallback();
            printSuccess(data, {
                json: isJson(program, options),
                human: formatList(data, columnsForResource(resource.name)),
            });
        });
    });
    command
        .command('get <id>')
        .description(`Get a ${resource.idName}.`)
        .option('--json', 'Emit JSON output.')
        .action(async (id, options) => {
        await runResourceAction({ json: isJson(program, options) }, async () => {
            const context = await createContext({ profile: program.opts().profile });
            const restFallback = () => context.client.request({
                method: 'GET',
                path: `${resource.basePath}/${encodeURIComponent(id)}`,
            });
            const data = resource.getAbility
                ? await runReadAbilityWithRestFallback(context.client, resource.getAbility, { [resource.getAbilityInputKey ?? `${resource.idName}_id`]: id }, restFallback)
                : await restFallback();
            printSuccess(data, { json: isJson(program, options) });
        });
    });
}
function columnsForResource(resourceName) {
    if (resourceName === 'deposits') {
        return ['id', 'date', 'amount', 'currency', 'status'];
    }
    if (resourceName === 'disputes') {
        return ['id', 'created', 'amount', 'currency', 'status'];
    }
    return ['id'];
}
function buildAbilityListInput(options, config = {}) {
    const input = {};
    const page = parseOptionalPositiveInteger(options.page, '--page');
    const limit = parseOptionalPositiveInteger(options.limit, '--limit');
    if (page) {
        input.page = page;
    }
    if (limit) {
        input.per_page = limit;
    }
    if (options.since) {
        input.date_after = options.since;
    }
    if (options.until) {
        input.date_before = options.until;
    }
    if (options.status) {
        input.status_is = options.status;
    }
    if (config.defaultSort) {
        input.orderby = config.defaultSort;
        input.order = 'desc';
    }
    if (options.currency && config.currencyParam) {
        input[config.currencyParam] = options.currency.toLowerCase();
    }
    return input;
}
function buildListQuery(options, config = {}) {
    const query = {};
    const page = parseOptionalPositiveInteger(options.page, '--page');
    const limit = parseOptionalPositiveInteger(options.limit, '--limit');
    if (page) {
        query.page = page;
    }
    if (limit) {
        query.pagesize = limit;
    }
    if (options.since) {
        query.date_after = options.since;
    }
    if (options.until) {
        query.date_before = options.until;
    }
    if (options.status) {
        query.status_is = options.status;
    }
    if (config.defaultSort) {
        query.sort = config.defaultSort;
        query.direction = 'desc';
    }
    if (options.currency && config.currencyParam) {
        query[config.currencyParam] = options.currency.toLowerCase();
    }
    return query;
}
function isJson(program, options) {
    return Boolean(options.json || program.opts().json);
}
async function runResourceAction(options, action) {
    try {
        await action();
    }
    catch (error) {
        printError(error, { json: options.json });
        process.exitCode = 1;
    }
}
//# sourceMappingURL=resources.js.map