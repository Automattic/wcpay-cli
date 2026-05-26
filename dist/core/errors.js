export class CliError extends Error {
    code;
    status;
    details;
    constructor(error) {
        super(error.message);
        this.name = 'CliError';
        this.code = error.code;
        this.status = error.status;
        this.details = error.details;
    }
    toJSON() {
        return {
            code: this.code,
            message: this.message,
            ...(this.status ? { status: this.status } : {}),
            ...(this.details !== undefined ? { details: this.details } : {}),
        };
    }
}
//# sourceMappingURL=errors.js.map