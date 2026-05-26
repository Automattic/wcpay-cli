import type { CliEnvelope } from './types.js';
export declare function printJson(envelope: CliEnvelope): void;
export declare function printHuman(message: string): void;
export declare function printSuccess<TData = unknown>(data: TData, options?: {
    json?: boolean;
    meta?: Record<string, unknown>;
    human?: string;
}): void;
export declare function printError(error: unknown, options?: {
    json?: boolean;
}): void;
//# sourceMappingURL=output.d.ts.map