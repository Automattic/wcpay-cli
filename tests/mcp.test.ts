import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';
import { createMcpServer } from '../src/mcp/server.js';

describe( 'createMcpServer', () => {
	it( 'creates an MCP server instance', () => {
		const server = createMcpServer();
		expect( server.isConnected() ).toBe( false );
	} );

	it( 'lists registered read tools', async () => {
		const { client, server } = await connectTestClient();
		const tools = await client.listTools();

		expect( tools.tools.map( ( tool ) => tool.name ) ).toContain( 'wcpay_get_mode' );
		expect( tools.tools.map( ( tool ) => tool.name ) ).toContain( 'wcpay_api_get' );
		expect( tools.tools.every( ( tool ) => tool.annotations?.readOnlyHint ) ).toBe( true );

		await client.close();
		await server.close();
	} );

	it( 'returns CLI envelope errors from tools', async () => {
		const { client, server } = await connectTestClient();
		const envelope = await callToolEnvelope( client, { name: 'wcpay_get_mode', arguments: {} } );

		expect( envelope.ok ).toBe( false );
		expect( envelope.error?.code ).toBe( 'missing_profile' );

		await client.close();
		await server.close();
	} );

	it( 'limits the raw MCP API GET tool to WooPayments paths', async () => {
		const { client, server } = await connectTestClient();
		const envelope = await callToolEnvelope( client, {
			name: 'wcpay_api_get',
			arguments: { path: '/wp/v2/users' },
		} );

		expect( envelope.ok ).toBe( false );
		expect( envelope.error?.code ).toBe( 'mcp_path_not_allowed' );

		await client.close();
		await server.close();
	} );
} );

async function connectTestClient(): Promise<{ client: Client; server: ReturnType<typeof createMcpServer> }> {
	const server = createMcpServer();
	const client = new Client( { name: 'wcpay-cli-test', version: '0.0.0' } );
	const [ clientTransport, serverTransport ] = InMemoryTransport.createLinkedPair();
	await Promise.all( [ server.connect( serverTransport ), client.connect( clientTransport ) ] );
	return { client, server };
}

async function callToolEnvelope(
	client: Client,
	params: { name: string; arguments: Record<string, unknown> }
): Promise<{ ok: boolean; error?: { code: string } }> {
	const result = await client.callTool( params );
	const content = result.content as Array<{ type: string; text?: string }>;
	const text = content[ 0 ].type === 'text' ? content[ 0 ].text ?? '' : '';
	return JSON.parse( text ) as { ok: boolean; error?: { code: string } };
}
