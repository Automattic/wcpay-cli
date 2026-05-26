import { readFileSync } from 'node:fs';

interface PackageJson {
	version: string;
}

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as PackageJson;
const version = packageJson.version;
const tag = `v${version}`;
const releaseAssetName = `automattic-wcpay-cli-${version}.tgz`;
const releaseAssetUrl = `https://github.com/Automattic/wcpay-cli/releases/download/${tag}/${releaseAssetName}`;
const changelog = readFileSync('CHANGELOG.md', 'utf8');
const versionSource = readFileSync('src/core/version.ts', 'utf8');
const githubInstallFiles = ['README.md', 'docs/index.md', 'docs/packaging.md'];
const githubReleaseAssetPattern =
	/https:\/\/github\.com\/Automattic\/wcpay-cli\/releases\/download\/v\d+\.\d+\.\d+\/automattic-wcpay-cli-\d+\.\d+\.\d+\.tgz/g;

const checks: Array<{ name: string; ok: boolean; message: string }> = [
	{
		name: 'CHANGELOG release heading',
		ok: changelog.includes(`## ${version}`),
		message: `CHANGELOG.md must include a ## ${version} heading.`,
	},
	{
		name: 'CLI version constant',
		ok: versionSource.includes(`VERSION = '${version}'`),
		message: `src/core/version.ts must export VERSION = '${version}'.`,
	},
];

for (const file of githubInstallFiles) {
	const contents = readFileSync(file, 'utf8');
	const matches = contents.match(githubReleaseAssetPattern) ?? [];
	checks.push({
		name: `${file} GitHub release asset URL`,
		ok: matches.length > 0 && matches.every((match) => match === releaseAssetUrl),
		message: `${file} must point GitHub install commands at ${releaseAssetUrl}.`,
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
