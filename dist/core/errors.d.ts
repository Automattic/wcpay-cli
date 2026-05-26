import type { CliErrorShape } from './types.js';
export declare class CliError extends Error {
    readonly code: string;
    readonly status?: number;
    readonly details?: unknown;
    constructor(error: CliErrorShape);
    toJSON(): CliErrorShape;
}
//# sourceMappingURL=errors.d.ts.map