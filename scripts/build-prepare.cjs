const { chmodSync, mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

const tempPrefix = mkdtempSync(join(tmpdir(), 'wcpay-cli-typescript-'));

const run = (command, args, options = {}) => {
	const result = spawnSync(command, args, {
		stdio: 'inherit',
		shell: process.platform === 'win32',
		...options,
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
};

try {
	run('npm', ['run', 'clean']);
	run('npm', [
		'install',
		'--global=false',
		'--prefix',
		tempPrefix,
		'--no-save',
		'--no-package-lock',
		'--ignore-scripts',
		'typescript@5.7.2',
		'@types/node@22.10.2',
	]);
	run(process.execPath, [
		join(tempPrefix, 'node_modules', 'typescript', 'bin', 'tsc'),
		'-p',
		'tsconfig.build.json',
		'--typeRoots',
		join(tempPrefix, 'node_modules', '@types'),
	]);
	chmodSync('dist/cli.js', 0o755);
} finally {
	rmSync(tempPrefix, { recursive: true, force: true });
}
