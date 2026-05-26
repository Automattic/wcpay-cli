const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

const spec = process.argv[2];
const expectedVersion = process.argv[3];
if (!spec) {
	process.stderr.write('Usage: node scripts/smoke-github-install.cjs <npm-install-spec> [expected-version]\n');
	process.exit(2);
}

const prefix = mkdtempSync(join(tmpdir(), 'wcpay-cli-install-'));
try {
	let result = spawnSync('npm', ['install', '-g', '--prefix', prefix, spec], {
		stdio: 'inherit',
		shell: process.platform === 'win32',
	});
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}

	const bin = process.platform === 'win32' ? join(prefix, 'wcpay.cmd') : join(prefix, 'bin', 'wcpay');
	result = spawnSync(bin, ['--version'], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'inherit'],
		shell: process.platform === 'win32',
	});
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}

	const actualVersion = result.stdout.trim();
	process.stdout.write(`${actualVersion}\n`);
	if (expectedVersion && actualVersion !== expectedVersion) {
		process.stderr.write(
			`Installed wcpay version mismatch: expected ${expectedVersion}, got ${actualVersion}\n`
		);
		process.exit(1);
	}
	process.exit(0);
} finally {
	rmSync(prefix, { recursive: true, force: true });
}
