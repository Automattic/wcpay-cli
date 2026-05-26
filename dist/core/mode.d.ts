import { type HttpMethod, type RestClient } from './api.js';
export interface WcpaySettings {
    is_test_mode_enabled?: boolean;
    is_test_mode_onboarding?: boolean;
    is_dev_mode_enabled?: boolean;
    [key: string]: unknown;
}
export type WcpayMode = 'live' | 'test' | 'dev';
export declare function classifyMode(settings: WcpaySettings): WcpayMode;
export declare function canWriteInMode(mode: WcpayMode): boolean;
export declare class ModeService {
    private readonly client;
    private settingsPromise?;
    constructor(client: RestClient);
    getSettings(): Promise<WcpaySettings>;
    getMode(): Promise<WcpayMode>;
    assertWriteAllowed(method: HttpMethod, path: string): Promise<void>;
}
//# sourceMappingURL=mode.d.ts.map