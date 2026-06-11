import { Command } from 'commander';
import { CliError } from '../core/errors.js';
import { printSuccess } from '../core/output.js';
import { isJsonOutput, runCommandAction } from './common.js';

interface CommandSummary {
	name: string;
	description: string;
	subcommands: CommandSummary[];
}

export function registerCompletionsCommand(program: Command): void {
	program
		.command('completions <shell>')
		.description('Print shell completion script for bash, zsh, or fish.')
		.option('--json', 'Emit JSON output.')
		.action(async (shell: string, options: { json?: boolean }) => {
			const json = isJsonOutput(program, options);
			await runCommandAction({ json }, async () => {
				const script = getCompletionScript(program, shell);
				printSuccess({ shell, script }, { json, human: script });
			});
		});
}

export function getCompletionScript(program: Command, shell: string): string {
	const commands = summarizeCommands(program);
	if (shell === 'bash') {
		return bashScript(commands);
	}
	if (shell === 'zsh') {
		return zshScript(commands);
	}
	if (shell === 'fish') {
		return fishScript(commands);
	}
	throw new CliError({
		code: 'unsupported_completion_shell',
		message: `Unsupported shell: ${shell}. Supported shells: bash, zsh, fish.`,
		status: 2,
	});
}

function summarizeCommands(command: Command): CommandSummary[] {
	return command.commands
		.filter((child) => child.name() !== 'help')
		.map((child) => ({
			name: child.name(),
			description: sanitizeDescription(child.description()),
			subcommands: summarizeCommands(child),
		}));
}

function sanitizeDescription(description: string): string {
	return description.replace(/'/g, '').replace(/\s+/g, ' ').trim().replace(/\.$/, '');
}

function bashScript(commands: CommandSummary[]): string {
	const topLevel = commands.map((command) => command.name).join(' ');
	const cases = commands
		.filter((command) => command.subcommands.length > 0)
		.map(
			(command) =>
				`    ${command.name}) COMPREPLY=( $(compgen -W "${command.subcommands
					.map((sub) => sub.name)
					.join(' ')}" -- "$cur") ) ;;`
		)
		.join('\n');
	return [
		'# Add to ~/.bashrc:',
		'# eval "$(wcpay completions bash)"',
		'_complete_wcpay() {',
		'  local cur',
		'  COMPREPLY=()',
		'  cur="${COMP_WORDS[COMP_CWORD]}"',
		'  if [[ ${COMP_CWORD} == 1 ]]; then',
		`    COMPREPLY=( $(compgen -W "${topLevel}" -- "$cur") )`,
		'    return',
		'  fi',
		'  case "${COMP_WORDS[1]}" in',
		cases,
		'  esac',
		'}',
		'complete -F _complete_wcpay wcpay',
		'',
	].join('\n');
}

function zshScript(commands: CommandSummary[]): string {
	const topLevel = commands
		.map((command) => `    '${command.name}:${command.description}'`)
		.join('\n');
	const cases = commands
		.filter((command) => command.subcommands.length > 0)
		.map((command) =>
			[
				`    ${command.name})`,
				'      subcommands=(',
				command.subcommands
					.map((sub) => `        '${sub.name}:${sub.description}'`)
					.join('\n'),
				'      )',
				"      _describe 'subcommand' subcommands",
				'      ;;',
			].join('\n')
		)
		.join('\n');
	return [
		'# Add to ~/.zshrc:',
		'# eval "$(wcpay completions zsh)"',
		'#compdef wcpay',
		'_wcpay() {',
		'  local -a commands subcommands',
		'  if (( CURRENT == 2 )); then',
		'    commands=(',
		topLevel,
		'    )',
		"    _describe 'command' commands",
		'    return',
		'  fi',
		'  case "${words[2]}" in',
		cases,
		'  esac',
		'}',
		'compdef _wcpay wcpay',
		'',
	].join('\n');
}

function fishScript(commands: CommandSummary[]): string {
	const lines = [
		'# Save as ~/.config/fish/completions/wcpay.fish, or run:',
		'# wcpay completions fish | source',
		'complete -c wcpay -f',
	];
	for (const command of commands) {
		lines.push(
			`complete -c wcpay -n '__fish_use_subcommand' -a ${command.name} -d '${command.description}'`
		);
		for (const sub of command.subcommands) {
			lines.push(
				`complete -c wcpay -n '__fish_seen_subcommand_from ${command.name}' -a ${sub.name} -d '${sub.description}'`
			);
		}
	}
	lines.push('');
	return lines.join('\n');
}
