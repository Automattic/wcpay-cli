import { createContext } from '../core/context.js';
import { CliError } from '../core/errors.js';
import { ModeService } from '../core/mode.js';
import { printError, printSuccess } from '../core/output.js';
import { redactHeaders, redactUrl } from '../core/redact.js';
import { getTestPaymentScenario, listTestPaymentScenarios } from '../core/test-scenarios.js';
import { parsePositiveInteger } from '../core/validation.js';
export function registerWriteCommands(program) {
    const refunds = program.command('refunds').description('Create and inspect refunds.');
    refunds
        .command('create')
        .description('Create a test/dev-mode refund.')
        .option('--order <order-id>', 'WooCommerce order ID.')
        .option('--charge <charge-id>', 'WooPayments/Stripe charge ID.')
        .requiredOption('--amount <minor-units>', 'Refund amount in minor currency units.')
        .option('--reason <reason>', 'Refund reason: requested_by_customer, duplicate, or fraudulent.', 'requested_by_customer')
        .option('--dry-run', 'Print the request without sending it.')
        .option('--yes', 'Confirm the test/dev-mode write.')
        .option('--json', 'Emit JSON output.')
        .action(async (options) => {
        const json = isJson(program, options);
        await runWriteAction({ json }, async () => {
            if (!options.order && !options.charge) {
                throw new CliError({
                    code: 'missing_refund_target',
                    message: 'Pass either --order <order-id> or --charge <charge-id>.',
                    status: 2,
                });
            }
            await sendGuardedWrite(program, {
                path: '/wc/v3/payments/refund',
                body: {
                    ...(options.order
                        ? { order_id: parsePositiveInteger(options.order, '--order') }
                        : {}),
                    ...(options.charge ? { charge_id: options.charge } : {}),
                    amount: parsePositiveInteger(options.amount, '--amount'),
                    reason: options.reason,
                },
                dryRun: Boolean(options.dryRun || program.opts().dryRun),
                yes: Boolean(options.yes || program.opts().yes),
                json,
            });
        });
    });
    const authorizations = program
        .command('authorizations')
        .description('Capture or cancel test/dev-mode authorizations.');
    registerAuthorizationCommand(program, authorizations, 'capture', 'capture_authorization');
    registerAuthorizationCommand(program, authorizations, 'cancel', 'cancel_authorization');
    registerTestCommands(program);
}
function registerTestCommands(program) {
    const test = program.command('test').description('Run test/dev-mode WooPayments workflows.');
    const order = test.command('order').description('Test order workflows.');
    order
        .command('create')
        .description('Create a test order from an existing product.')
        .requiredOption('--product <product-id>', 'Existing WooCommerce product ID.')
        .option('--quantity <quantity>', 'Quantity.', '1')
        .option('--email <email>', 'Billing email for the order.', 'wcpay-cli-test@example.com')
        .option('--dry-run', 'Print the request without sending it.')
        .option('--yes', 'Confirm the test/dev-mode write.')
        .option('--json', 'Emit JSON output.')
        .action(async (options) => {
        const json = isJson(program, options);
        await runWriteAction({ json }, async () => {
            await sendGuardedWrite(program, {
                path: '/wc/v3/orders',
                body: {
                    status: 'pending',
                    billing: { email: options.email },
                    line_items: [
                        {
                            product_id: parsePositiveInteger(options.product, '--product'),
                            quantity: parsePositiveInteger(options.quantity ?? '1', '--quantity'),
                        },
                    ],
                    meta_data: [
                        { key: '_wcpay_cli_created', value: '1' },
                        { key: '_wcpay_cli_created_at', value: new Date().toISOString() },
                    ],
                },
                dryRun: Boolean(options.dryRun || program.opts().dryRun),
                yes: Boolean(options.yes || program.opts().yes),
                json,
            });
        });
    });
    const payment = test.command('payment').description('Test payment workflows.');
    payment
        .command('scenarios')
        .description('List built-in test payment scenarios.')
        .option('--json', 'Emit JSON output.')
        .action((options) => {
        const scenarios = listTestPaymentScenarios();
        printSuccess({ scenarios }, {
            json: isJson(program, options),
            human: scenarios
                .map((scenario) => `${scenario.alias}\t${scenario.paymentMethod}\t${scenario.description}`)
                .join('\n'),
        });
    });
    payment
        .command('create')
        .description('Create a test payment using a built-in scenario alias.')
        .requiredOption('--order <order-id>', 'WooCommerce order ID.')
        .option('--scenario <scenario>', 'Built-in scenario alias.', 'success')
        .option('--payment-method <payment-method-id>', 'Override the scenario payment method ID.')
        .option('--dry-run', 'Print the request without sending it.')
        .option('--yes', 'Confirm the test/dev-mode write.')
        .option('--json', 'Emit JSON output.')
        .action(async (options) => {
        const json = isJson(program, options);
        await runWriteAction({ json }, async () => {
            const scenario = getTestPaymentScenario(options.scenario ?? 'success');
            if (!scenario && !options.paymentMethod) {
                throw new CliError({
                    code: 'unknown_test_payment_scenario',
                    message: `Unknown test payment scenario: ${options.scenario}. Run \`wcpay test payment scenarios\` for supported aliases.`,
                    status: 2,
                });
            }
            await sendTestPaymentCreate(program, {
                orderId: parsePositiveInteger(options.order, '--order'),
                paymentMethod: options.paymentMethod ?? scenario.paymentMethod,
                scenario: options.scenario ?? scenario.alias,
                dryRun: Boolean(options.dryRun || program.opts().dryRun),
                yes: Boolean(options.yes || program.opts().yes),
                json,
            });
        });
    });
}
function registerAuthorizationCommand(program, authorizations, name, endpointAction) {
    authorizations
        .command(name)
        .description(`${name === 'capture' ? 'Capture' : 'Cancel'} a test/dev-mode authorization.`)
        .requiredOption('--order <order-id>', 'WooCommerce order ID.')
        .requiredOption('--intent <payment-intent-id>', 'Payment intent ID.')
        .option('--dry-run', 'Print the request without sending it.')
        .option('--yes', 'Confirm the test/dev-mode write.')
        .option('--json', 'Emit JSON output.')
        .action(async (options) => {
        const json = isJson(program, options);
        await runWriteAction({ json }, async () => {
            const orderId = parsePositiveInteger(options.order, '--order');
            await sendGuardedWrite(program, {
                path: `/wc/v3/payments/orders/${orderId}/${endpointAction}`,
                body: { payment_intent_id: options.intent },
                dryRun: Boolean(options.dryRun || program.opts().dryRun),
                yes: Boolean(options.yes || program.opts().yes),
                json,
            });
        });
    });
}
async function sendTestPaymentCreate(program, input) {
    if (!input.dryRun && !input.yes) {
        throw new CliError({
            code: 'confirmation_required',
            message: 'Write commands require --yes or --dry-run.',
            status: 2,
        });
    }
    const context = await createContext({
        profile: program.opts().profile,
    });
    const modeService = new ModeService(context.client);
    const customerPath = `/wc/v3/payments/orders/${input.orderId}/create_customer`;
    const paymentPath = '/wc/v3/payments/payment_intents';
    await modeService.assertWriteAllowed('POST', paymentPath);
    if (input.dryRun) {
        const customerRequest = context.client.resolve({
            method: 'POST',
            path: customerPath,
            body: {},
        });
        const paymentRequest = context.client.resolve({
            method: 'POST',
            path: paymentPath,
            body: {
                order_id: input.orderId,
                payment_method: input.paymentMethod,
                customer: '<created-customer-id>',
                _wcpay_cli_scenario: input.scenario,
            },
        });
        printSuccess({
            requests: [
                {
                    method: customerRequest.method,
                    url: redactUrl(customerRequest.url),
                    headers: redactHeaders(customerRequest.headers),
                    body: {},
                },
                {
                    method: paymentRequest.method,
                    url: redactUrl(paymentRequest.url),
                    headers: redactHeaders(paymentRequest.headers),
                    body: {
                        order_id: input.orderId,
                        payment_method: input.paymentMethod,
                        customer: '<created-customer-id>',
                        _wcpay_cli_scenario: input.scenario,
                    },
                },
            ],
        }, {
            json: input.json,
            human: `${customerRequest.method} ${redactUrl(customerRequest.url)}\n${paymentRequest.method} ${redactUrl(paymentRequest.url)}`,
        });
        return;
    }
    const customer = await context.client.request({
        method: 'POST',
        path: customerPath,
        body: {},
    });
    if (typeof customer.id !== 'string' || customer.id.length === 0) {
        throw new CliError({
            code: 'test_payment_customer_creation_failed',
            message: 'WooPayments did not return a customer ID for the test payment.',
            status: 500,
        });
    }
    const data = await context.client.request({
        method: 'POST',
        path: paymentPath,
        body: {
            order_id: input.orderId,
            payment_method: input.paymentMethod,
            customer: customer.id,
            _wcpay_cli_scenario: input.scenario,
        },
    });
    printSuccess(data, { json: input.json });
}
async function sendGuardedWrite(program, input) {
    if (!input.dryRun && !input.yes) {
        throw new CliError({
            code: 'confirmation_required',
            message: 'Write commands require --yes or --dry-run.',
            status: 2,
        });
    }
    const context = await createContext({
        profile: program.opts().profile,
    });
    const modeService = new ModeService(context.client);
    await modeService.assertWriteAllowed('POST', input.path);
    const request = { method: 'POST', path: input.path, body: input.body };
    if (input.dryRun) {
        const resolved = context.client.resolve(request);
        printSuccess({
            method: resolved.method,
            url: redactUrl(resolved.url),
            headers: redactHeaders(resolved.headers),
            body: input.body,
        }, { json: input.json, human: `${resolved.method} ${redactUrl(resolved.url)}` });
        return;
    }
    const data = await context.client.request(request);
    printSuccess(data, { json: input.json });
}
function isJson(program, options) {
    return Boolean(options.json || program.opts().json);
}
async function runWriteAction(options, action) {
    try {
        await action();
    }
    catch (error) {
        printError(error, { json: options.json });
        process.exitCode = 1;
    }
}
//# sourceMappingURL=writes.js.map