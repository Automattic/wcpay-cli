import { printSuccess } from '../core/output.js';
export function registerCompletionsCommand(program) {
    program
        .command('completions <shell>')
        .description('Print shell completion script for bash or zsh.')
        .option('--json', 'Emit JSON output.')
        .action((shell, options) => {
        const script = getCompletionScript(shell);
        printSuccess({ shell, script }, { json: options.json, human: script });
    });
}
function getCompletionScript(shell) {
    if (shell === 'bash') {
        return `# Add to ~/.bashrc:\n# eval "$(wcpay completions bash)"\n_complete_wcpay() {\n  local cur prev commands\n  COMPREPLY=()\n  cur="${'${COMP_WORDS[COMP_CWORD]}'}"\n  prev="${'${COMP_WORDS[COMP_CWORD-1]}'}"\n  commands="login auth profile whoami api abilities account settings transactions deposits disputes charges refunds authorizations test mcp tools completions doctor mode help"\n  if [[ ${'${COMP_CWORD}'} == 1 ]]; then\n    COMPREPLY=( $(compgen -W "$commands" -- "$cur") )\n  fi\n}\ncomplete -F _complete_wcpay wcpay\n`;
    }
    if (shell === 'zsh') {
        return `# Add to ~/.zshrc:\n# eval "$(wcpay completions zsh)"\n#compdef wcpay\n_wcpay() {\n  local -a commands\n  commands=(\n    'login:Authenticate with a WooPayments store'\n    'auth:Manage credentials'\n    'profile:Manage active profile'\n    'api:Make REST API requests'
    'abilities:Discover and run WooPayments abilities'\n    'doctor:Run diagnostics'\n    'mode:Show mode'\n    'mcp:Run MCP server'\n    'tools:Inspect tool metadata'\n  )\n  _describe 'command' commands\n}\ncompdef _wcpay wcpay\n`;
    }
    throw new Error(`Unsupported shell: ${shell}. Supported shells: bash, zsh.`);
}
//# sourceMappingURL=completions.js.map