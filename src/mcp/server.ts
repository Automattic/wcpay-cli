import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createContext } from '../core/context.js';
import { classifyMode, ModeService } from '../core/mode.js';
import type { CliEnvelope } from '../core/types.js';

const optionalProfile = { profile: z.string().optional() };
const listArgs = {
	...optionalProfile,
	page: z.number().int().optional(),
	limit: z.number().int().optional(),
};

const readOnlyAnnotations = {
	readOnlyHint: true,
	destructiveHint: false,
	idempotentHint: true,
	openWorldHint: true,
};

export async function runMcpServer(): Promise<void> {
	const server = createMcpServer();
	await server.connect( new StdioServerTransport() );
}

export function createMcpServer(): McpServer {
	const server = new McpServer( {
		name: 'wcpay-cli',
		version: '0.0.0',
	} );

	server.registerTool(
		'wcpay_get_mode',
		{
			description: 'Read WooPayments mode flags and classify the store as live, test, or dev.',
			inputSchema: optionalProfile,
			annotations: readOnlyAnnotations,
		},
		async ( args ) => textResult( await getMode( args.profile ) )
	);

	server.registerTool(
		'wcpay_get_account_status',
		{
			description: 'Read WooPayments account status for the selected profile.',
			inputSchema: optionalProfile,
			annotations: readOnlyAnnotations,
		},
		async ( args ) => textResult( await getEndpoint( args.profile, '/wc/v3/payments/accounts' ) )
	);

	server.registerTool(
		'wcpay_get_settings',
		{
			description: 'Read WooPayments settings and mode flags.',
			inputSchema: optionalProfile,
			annotations: readOnlyAnnotations,
		},
		async ( args ) => textResult( await getEndpoint( args.profile, '/wc/v3/payments/settings' ) )
	);

	server.registerTool(
		'wcpay_list_transactions',
		{
			description: 'List WooPayments transactions.',
			inputSchema: listArgs,
			annotations: readOnlyAnnotations,
		},
		async ( args ) =>
			textResult(
				await getEndpoint( args.profile, '/wc/v3/payments/transactions', buildListQuery( args ) )
			)
	);

	server.registerTool(
		'wcpay_list_deposits',
		{
			description: 'List WooPayments deposits.',
			inputSchema: listArgs,
			annotations: readOnlyAnnotations,
		},
		async ( args ) =>
			textResult( await getEndpoint( args.profile, '/wc/v3/payments/deposits', buildListQuery( args ) ) )
	);

	server.registerTool(
		'wcpay_list_disputes',
		{
			description: 'List WooPayments disputes.',
			inputSchema: listArgs,
			annotations: readOnlyAnnotations,
		},
		async ( args ) =>
			textResult( await getEndpoint( args.profile, '/wc/v3/payments/disputes', buildListQuery( args ) ) )
	);

	server.registerTool(
		'wcpay_api_get',
		{
			description: 'Make an authenticated GET request to a store REST API path.',
			inputSchema: {
				...optionalProfile,
				path: z.string(),
			},
			annotations: readOnlyAnnotations,
		},
		async ( args ) => textResult( await getEndpoint( args.profile, args.path ) )
	);

	server.registerTool(
		'wcpay_doctor',
		{
			description: 'Run WooPayments CLI diagnostics for the selected profile.',
			inputSchema: optionalProfile,
			annotations: readOnlyAnnotations,
		},
		async ( args ) => textResult( await doctor( args.profile ) )
	);

	return server;
}

async function getMode( profile?: string ): Promise<CliEnvelope> {
	try {
		const context = await createContext( { profile } );
		const modeService = new ModeService( context.client );
		const settings = await modeService.getSettings();
		return { ok: true, data: { mode: classifyMode( settings ), settings } };
	} catch ( error ) {
		return errorEnvelope( error );
	}
}

async function getEndpoint(
	profile: string | undefined,
	path: string,
	query: Record<string, unknown> = {}
): Promise<CliEnvelope> {
	try {
		const context = await createContext( { profile } );
		const data = await context.client.request( { method: 'GET', path, query } );
		return { ok: true, data, meta: { profile: context.profile.name, site: context.profile.siteUrl } };
	} catch ( error ) {
		return errorEnvelope( error );
	}
}

async function doctor( profile?: string ): Promise<CliEnvelope> {
	try {
		const context = await createContext( { profile } );
		const settings = await context.client.request( { method: 'GET', path: '/wc/v3/payments/settings' } );
		const mode = classifyMode( settings as Record<string, unknown> );
		return {
			ok: true,
			data: {
				profile: context.profile.name,
				mode,
				checks: [
					{ name: 'profile', status: 'pass', message: context.profile.name },
					{ name: 'site_url', status: 'pass', message: context.profile.siteUrl },
					{ name: 'auth', status: 'pass', message: 'Credentials accepted.' },
					{ name: 'mode', status: 'pass', message: mode },
				],
			},
		};
	} catch ( error ) {
		return errorEnvelope( error );
	}
}

function buildListQuery( args: { page?: number; limit?: number } ): Record<string, number> {
	return {
		...( args.page ? { page: args.page } : {} ),
		...( args.limit ? { pagesize: args.limit } : {} ),
	};
}

function textResult( envelope: CliEnvelope ) {
	return {
		content: [
			{
				type: 'text' as const,
				text: JSON.stringify( envelope, null, 2 ),
			},
		],
	};
}

function errorEnvelope( error: unknown ): CliEnvelope {
	if ( error && typeof error === 'object' && 'code' in error && 'message' in error ) {
		return {
			ok: false,
			error: {
				code: String( error.code ),
				message: String( error.message ),
				...( 'status' in error && typeof error.status === 'number' ? { status: error.status } : {} ),
			},
		};
	}

	return {
		ok: false,
		error: {
			code: 'unexpected_error',
			message: error instanceof Error ? error.message : String( error ),
		},
	};
}
