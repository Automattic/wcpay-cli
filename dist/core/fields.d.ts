export interface ParsedFields {
    query: Record<string, unknown>;
    body: Record<string, unknown> | undefined;
}
export declare function parseApiFields(method: string, fields: string[]): ParsedFields;
export declare function parseAssignments(fields: string[]): Record<string, unknown>;
export declare function parseAssignment(field: string): {
    key: string;
    value: unknown;
};
//# sourceMappingURL=fields.d.ts.map