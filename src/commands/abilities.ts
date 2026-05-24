import { Command } from 'commander';
import { listAbilities, runAbility, isReadOnlyAbility } from '../core/abilities.js';
import { createContext } from '../core/context.js';
import { parseAssignments } from '../core/fields.js';
import { CliError } from '../core/errors.js';
import { printError, printSuccess } from '../core/output.js';

export function registerAbilitiesCommands(program: Command): void {
	const abilities = program
		.command('abilities')
		.description('Discover and run WooPayments Abilities API actions when available.');

	abilities
		.command('list')
		.description('List WooPayments abilities exposed by the selected store.')
		.option('--json', 'Emit JSON output.')
		.action(async (options: { json?: boolean }) => {
			const json = isJson(program, options);
			await runAbilitiesAction({ json }, async () => {
				const context = await createContext({ profile: program.opts().profile });
				const discovered = await listAbilities(context.client);
				printSuccess(
					{
						abilities: discovered,
						meta: { profile: context.profile.name, site: context.profile.siteUrl },
					},
					{
						json,
						human: discovered.length
							? discovered.map((ability) => `${ability.name}\t${ability.description ?? ''}`).join('\n')
							: 'No WooPayments abilities are exposed by this store.',
					}
				);
			});
		});

	abilities
		.command('run <ability> [fields...]')
		.description('Run a discovered read-only WooPayments ability.')
		.option('--json', 'Emit JSON output.')
		.action(async (ability: string, fields: string[], options: { json?: boolean }) => {
			const json = isJson(program, options);
			await runAbilitiesAction({ json }, async () => {
				const context = await createContext({ profile: program.opts().profile });
				const discovered = await listAbilities(context.client);
				const descriptor = discovered.find((item) => item.name === ability);
				if (!descriptor) {
					throw new CliError({
						code: 'ability_not_exposed',
						message: `WooPayments ability is not exposed by this store: ${ability}`,
						status: 2,
					});
				}
				if (!isReadOnlyAbility(descriptor)) {
					throw new CliError({
						code: 'ability_not_read_only',
						message: `Refusing to run non-read-only ability: ${ability}`,
						status: 2,
					});
				}

				const input = parseAssignments(fields);
				const data = await runAbility(context.client, ability, input);
				printSuccess(
					{ ability, input, data, meta: { profile: context.profile.name, site: context.profile.siteUrl } },
					{ json, human: JSON.stringify(data, null, 2) }
				);
			});
		});
}

function isJson(program: Command, options: { json?: boolean }): boolean {
	return Boolean(options.json || (program.opts() as { json?: boolean }).json);
}

async function runAbilitiesAction(options: { json?: boolean }, action: () => Promise<void>): Promise<void> {
	try {
		await action();
	} catch (error) {
		printError(error, { json: options.json });
		process.exitCode = 1;
	}
}
