import { describe, expect, it } from 'vitest';
import { createMcpServer } from '../src/mcp/server.js';

describe( 'createMcpServer', () => {
	it( 'creates an MCP server instance', () => {
		const server = createMcpServer();
		expect( server.isConnected() ).toBe( false );
	} );
} );
