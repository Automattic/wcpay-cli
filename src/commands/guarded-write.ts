import { Command } from 'commander';
import { createContext } from '../core/context.js';
import { CliError } from '../core/errors.js';
import { ModeService } from '../core/mode.js';
import { printSuccess } from '../core/output.js';
import { redactHeaders, redactUrl } from '../core/redact.js';

export async function sendGuardedWrite(
	program: Command,
	input: {
		path: string;
		body: Record<string, unknown>;
		dryRun: boolean;
		yes: boolean;
		json: boolean;
	}
): Promise<void> {
	if (!input.dryRun && !input.yes) {
		throw new CliError({
			code: 'confirmation_required',
			message: 'Write commands require --yes or --dry-run.',
			status: 2,
		});
	}

	const context = await createContext({
		profile: (program.opts() as { profile?: string }).profile,
	});
	const modeService = new ModeService(context.client);
	await modeService.assertWriteAllowed('POST', input.path);

	const request = { method: 'POST' as const, path: input.path, body: input.body };
	if (input.dryRun) {
		const resolved = context.client.resolve(request);
		printSuccess(
			{
				method: resolved.method,
				url: redactUrl(resolved.url),
				headers: redactHeaders(resolved.headers),
				body: input.body,
			},
			{ json: input.json, human: `${resolved.method} ${redactUrl(resolved.url)}` }
		);
		return;
	}

	const data = await context.client.request(request);
	printSuccess(data, { json: input.json });
}
