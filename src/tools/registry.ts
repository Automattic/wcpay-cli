import type { ToolDescriptor } from '../core/types.js';

export const toolRegistry: ToolDescriptor[] = [
	{
		name: 'wcpay_doctor',
		description: 'Run WooPayments CLI diagnostics for the selected profile.',
		command: 'wcpay doctor --json --redact',
		safety: 'read',
		mcp: true,
		inputs: { profile: { type: 'string', optional: true } },
		examples: [ 'wcpay doctor', 'wcpay doctor --json --redact' ],
	},
	{
		name: 'wcpay_get_mode',
		description: 'Read WooPayments mode flags and classify the store as live, test, or dev.',
		command: 'wcpay mode --json',
		safety: 'read',
		mcp: true,
		inputs: { profile: { type: 'string', optional: true } },
		examples: [ 'wcpay mode', 'wcpay mode --json' ],
	},
	{
		name: 'wcpay_get_account_status',
		description: 'Read WooPayments account status for the selected profile.',
		command: 'wcpay account status --json',
		safety: 'read',
		mcp: true,
		inputs: { profile: { type: 'string', optional: true } },
		examples: [ 'wcpay account status' ],
	},
	{
		name: 'wcpay_get_settings',
		description: 'Read WooPayments settings and mode flags.',
		command: 'wcpay settings get --json',
		safety: 'read',
		mcp: true,
		inputs: { profile: { type: 'string', optional: true } },
		examples: [ 'wcpay settings get' ],
	},
	{
		name: 'wcpay_api_get',
		description: 'Make an authenticated GET request to a store REST API path.',
		command: 'wcpay api get <path> --json',
		safety: 'read',
		mcp: true,
		inputs: { path: { type: 'string' }, profile: { type: 'string', optional: true } },
		examples: [ 'wcpay api get /wc/v3/payments/accounts --json' ],
	},
];

export function getToolRegistry(): ToolDescriptor[] {
	return toolRegistry;
}
