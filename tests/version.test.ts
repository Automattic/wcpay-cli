import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { VERSION } from '../src/core/version.js';

describe('VERSION', () => {
	it('matches the package.json version', async () => {
		const packageJson = JSON.parse(
			await readFile(new URL('../package.json', import.meta.url), 'utf8')
		) as { version: string };
		expect(VERSION).toBe(packageJson.version);
	});
});
