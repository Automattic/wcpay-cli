export declare function ensureParentDir(path: string): Promise<void>;
export declare function readJsonFile<T>(path: string, fallback: T): Promise<T>;
export declare function writeJsonFile(path: string, value: unknown, mode?: number): Promise<void>;
export declare function removeFileIfExists(path: string): Promise<void>;
//# sourceMappingURL=fs.d.ts.map