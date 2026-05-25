import { readFileSync } from 'node:fs';

interface PackageJson {
	version: string;
}

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as PackageJson;
const version = packageJson.version;
const tag = `v${version}`;
const changelog = readFileSync('CHANGELOG.md', 'utf8');
const githubInstallFiles = ['README.md', 'docs/index.md', 'docs/packaging.md'];
const githubInstallPattern = /github:Automattic\/wcpay-cli#v\d+\.\d+\.\d+/g;

const checks: Array<{ name: string; ok: boolean; message: string }> = [
	{
		name: 'CHANGELOG release heading',
		ok: changelog.includes(`## ${version}`),
		message: `CHANGELOG.md must include a ## ${version} heading.`,
	},
];

for (const file of githubInstallFiles) {
	const contents = readFileSync(file, 'utf8');
	const matches = contents.match(githubInstallPattern) ?? [];
	checks.push({
		name: `${file} GitHub install tag`,
		ok:
			matches.length > 0 &&
			matches.every((match) => match === `github:Automattic/wcpay-cli#${tag}`),
		message: `${file} must point GitHub install commands at ${tag}.`,
	});
}

const failures = checks.filter((check) => !check.ok);
if (failures.length > 0) {
	for (const failure of failures) {
		process.stderr.write(`release:check failed: ${failure.name}\n${failure.message}\n`);
	}
	process.exit(1);
}

process.stdout.write(`release:check passed for ${tag}\n`);
