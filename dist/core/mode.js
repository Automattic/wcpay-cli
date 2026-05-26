import { isReadMethod } from './api.js';
import { CliError } from './errors.js';
export function classifyMode(settings) {
    if (settings.is_dev_mode_enabled) {
        return 'dev';
    }
    if (settings.is_test_mode_enabled || settings.is_test_mode_onboarding) {
        return 'test';
    }
    return 'live';
}
export function canWriteInMode(mode) {
    return mode === 'test' || mode === 'dev';
}
export class ModeService {
    client;
    settingsPromise;
    constructor(client) {
        this.client = client;
    }
    async getSettings() {
        this.settingsPromise ??= this.client.request({
            method: 'GET',
            path: '/wc/v3/payments/settings',
        });
        return this.settingsPromise;
    }
    async getMode() {
        return classifyMode(await this.getSettings());
    }
    async assertWriteAllowed(method, path) {
        if (isReadMethod(method)) {
            return;
        }
        const mode = await this.getMode();
        if (!canWriteInMode(mode)) {
            throw new CliError({
                code: 'live_mode_write_blocked',
                message: `Refusing to run ${method} ${path} because WooPayments is in live mode. WooPayments CLI only allows write operations when test/dev mode is active.`,
                status: 409,
                details: { method, path, mode },
            });
        }
    }
}
//# sourceMappingURL=mode.js.map