import { describe, expect, it } from 'vitest';
import { CliError, exitCodeForError } from '../src/core/errors.js';

describe('exitCodeForError', () => {
	it('maps error categories to distinct exit codes', () => {
		expect(
			exitCodeForError(
				new CliError({ code: 'live_mode_write_blocked', message: 'blocked', status: 409 })
			)
		).toBe(5);
		expect(
			exitCodeForError(new CliError({ code: 'missing_profile', message: 'usage', status: 2 }))
		).toBe(2);
		expect(
			exitCodeForError(
				new CliError({ code: 'rest_request_failed', message: 'denied', status: 401 })
			)
		).toBe(3);
		expect(
			exitCodeForError(
				new CliError({ code: 'rest_request_failed', message: 'boom', status: 500 })
			)
		).toBe(4);
		expect(exitCodeForError(new Error('boom'))).toBe(1);
		expect(exitCodeForError(new CliError({ code: 'odd', message: 'no status' }))).toBe(1);
	});
});
