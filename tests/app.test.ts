import { describe, expect, it } from 'vitest';
import { buildProgram } from '../src/app.js';
import { getConfigDir } from '../src/core/config.js';
import { getToolRegistry } from '../src/tools/registry.js';

describe( 'buildProgram', () => {
	it( 'creates the wcpay command', () => {
		const program = buildProgram();
		expect( program.name() ).toBe( 'wcpay' );
		expect( program.commands.map( ( command ) => command.name() ) ).toContain( 'tools' );
		expect( program.commands.map( ( command ) => command.name() ) ).toContain( 'login' );
	} );
} );

describe( 'config paths', () => {
	it( 'uses WCPAY_HOME when provided', () => {
		expect( getConfigDir( { WCPAY_HOME: '/tmp/wcpay-test' } as NodeJS.ProcessEnv ) ).toBe( '/tmp/wcpay-test' );
	} );
} );

describe( 'tool registry', () => {
	it( 'contains MCP-ready read tools and classified write tools', () => {
		const tools = getToolRegistry();
		expect( tools.length ).toBeGreaterThan( 0 );
		expect( tools.filter( ( tool ) => tool.mcp ).every( ( tool ) => tool.safety === 'read' ) ).toBe( true );
		expect( tools.some( ( tool ) => tool.name === 'wcpay_get_mode' ) ).toBe( true );
		expect( tools.some( ( tool ) => tool.safety === 'test_mode_write' ) ).toBe( true );
	} );
} );
