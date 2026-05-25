import { readFileSync } from 'node:fs';

interface PackageJson {
	version: string;
}

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as PackageJson;
const version = packageJson.version;
const tag = `v${version}`;
const readme = readFileSync('README.md', 'utf8');
const changelog = readFileSync('CHANGELOG.md', 'utf8');

const checks: Array<{ name: string; ok: boolean; message: string }> = [
	{
		name: 'README GitHub install tag',
		ok: readme.includes(`github:Automattic/wcpay-cli#${tag}`),
		message: `README.md must point the GitHub install command at ${tag}.`,
	},
	{
		name: 'CHANGELOG release heading',
		ok: changelog.includes(`## ${version}`),
		message: `CHANGELOG.md must include a ## ${version} heading.`,
	},
];

const failures = checks.filter((check) => !check.ok);
if (failures.length > 0) {
	for (const failure of failures) {
		process.stderr.write(`release:check failed: ${failure.name}\n${failure.message}\n`);
	}
	process.exit(1);
}

process.stdout.write(`release:check passed for ${tag}\n`);
