import type { CliErrorShape } from './types.js';

export class CliError extends Error {
	public readonly code: string;
	public readonly status?: number;
	public readonly details?: unknown;

	public constructor(error: CliErrorShape) {
		super(error.message);
		this.name = 'CliError';
		this.code = error.code;
		this.status = error.status;
		this.details = error.details;
	}

	public toJSON(): CliErrorShape {
		return {
			code: this.code,
			message: this.message,
			...(this.status ? { status: this.status } : {}),
			...(this.details !== undefined ? { details: this.details } : {}),
		};
	}
}

export function exitCodeForError(error: unknown): number {
	if (!(error instanceof CliError)) {
		return 1;
	}
	if (error.code === 'live_mode_write_blocked') {
		return 5;
	}
	if (error.status === 2) {
		return 2;
	}
	if (error.status === 401 || error.status === 403) {
		return 3;
	}
	if (error.status !== undefined && error.status >= 400) {
		return 4;
	}
	return 1;
}
