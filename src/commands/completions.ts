import { Command } from 'commander';
import { CliError } from '../core/errors.js';
import { printError, printSuccess } from '../core/output.js';

export function registerCompletionsCommand( program: Command ): void {
	program
		.command( 'completions <shell>' )
		.description( 'Print shell completion script for bash or zsh.' )
		.option( '--json', 'Emit JSON output.' )
		.action( ( shell: string, options: { json?: boolean } ) => {
			const json = isJson( program, options );

			try {
				const script = getCompletionScript( shell );
				printSuccess( { shell, script }, { json, human: script } );
			} catch ( error ) {
				printError( error, { json } );
				process.exitCode = 1;
			}
		} );
}

function getCompletionScript( shell: string ): string {
	if ( shell === 'bash' ) {
		return `# Add to ~/.bashrc:\n# eval "$(wcpay completions bash)"\n_complete_wcpay() {\n  local cur prev commands\n  COMPREPLY=()\n  cur="${ '${COMP_WORDS[COMP_CWORD]}' }"\n  prev="${ '${COMP_WORDS[COMP_CWORD-1]}' }"\n  commands="login auth profile whoami api account settings transactions deposits disputes charges refunds authorizations test mcp tools completions doctor mode help"\n  if [[ ${ '${COMP_CWORD}' } == 1 ]]; then\n    COMPREPLY=( $(compgen -W "$commands" -- "$cur") )\n  fi\n}\ncomplete -F _complete_wcpay wcpay\n`;
	}

	if ( shell === 'zsh' ) {
		return `# Add to ~/.zshrc:\n# eval "$(wcpay completions zsh)"\n#compdef wcpay\n_wcpay() {\n  local -a commands\n  commands=(\n    'login:Authenticate with a WooPayments store'\n    'auth:Manage credentials'\n    'profile:Manage active profile'\n    'api:Make REST API requests'
    'doctor:Run diagnostics'\n    'mode:Show mode'\n    'mcp:Run MCP server'\n    'tools:Inspect tool metadata'\n  )\n  _describe 'command' commands\n}\ncompdef _wcpay wcpay\n`;
	}

	throw new CliError( {
		code: 'unsupported_shell',
		message: `Unsupported shell: ${ shell }. Supported shells: bash, zsh.`,
		status: 1,
	} );
}

function isJson( program: Command, options: { json?: boolean } ): boolean {
	return Boolean( options.json || ( program.opts() as { json?: boolean } ).json );
}
