export declare function isPrettyTerminal(env?: NodeJS.ProcessEnv): boolean;
export declare function logo(columns?: number): string;
export declare function printWelcome(): void;
export declare function printLoginIntro(): void;
export declare function withSpinner<T>(message: string, action: () => Promise<T>, options?: {
    enabled?: boolean;
    successText?: string;
}): Promise<T>;
export declare function formatCheck(message: string): string;
export declare function formatMuted(message: string): string;
export declare function formatCommand(command: string): string;
export declare function formatWarning(message: string): string;
//# sourceMappingURL=ux.d.ts.map