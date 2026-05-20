export type OutputFormat = 'human' | 'json';

export type CommandSafety = 'read' | 'test_mode_write' | 'destructive' | 'local_only';

export interface GlobalOptions {
	profile?: string;
	site?: string;
	json?: boolean;
	redact?: boolean;
	noRedact?: boolean;
	dryRun?: boolean;
	yes?: boolean;
	verbose?: boolean;
	debug?: boolean;
	timeout?: string;
}

export interface CliErrorShape {
	code: string;
	message: string;
	status?: number;
	details?: unknown;
}

export interface CliEnvelope<TData = unknown, TMeta = Record<string, unknown>> {
	ok: boolean;
	data?: TData;
	error?: CliErrorShape;
	meta?: TMeta;
}

export interface ToolDescriptor {
	name: string;
	description: string;
	command: string;
	safety: CommandSafety;
	mcp: boolean;
	inputs: Record<string, unknown>;
	examples: string[];
}
