const { existsSync } = require('node:fs');
const { spawnSync } = require('node:child_process');

if (!existsSync('.git')) {
	process.exit(0);
}

const result = spawnSync('npx', ['husky'], {
	stdio: 'inherit',
	shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
