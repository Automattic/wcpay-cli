import { isReadMethod, type HttpMethod, type RestClient } from './api.js';
import { CliError } from './errors.js';

export interface WcpaySettings {
	is_test_mode_enabled?: boolean;
	is_test_mode_onboarding?: boolean;
	is_dev_mode_enabled?: boolean;
	[ key: string ]: unknown;
}

export type WcpayMode = 'live' | 'test' | 'dev';

export function classifyMode( settings: WcpaySettings ): WcpayMode {
	if ( settings.is_dev_mode_enabled ) {
		return 'dev';
	}
	if ( settings.is_test_mode_enabled || settings.is_test_mode_onboarding ) {
		return 'test';
	}
	return 'live';
}

export function canWriteInMode( mode: WcpayMode ): boolean {
	return mode === 'test' || mode === 'dev';
}

export class ModeService {
	private settingsPromise?: Promise<WcpaySettings>;

	public constructor( private readonly client: RestClient ) {}

	public async getSettings(): Promise<WcpaySettings> {
		this.settingsPromise ??= this.client.request<WcpaySettings>( {
			method: 'GET',
			path: '/wc/v3/payments/settings',
		} );
		return this.settingsPromise;
	}

	public async getMode(): Promise<WcpayMode> {
		return classifyMode( await this.getSettings() );
	}

	public async assertWriteAllowed( method: HttpMethod, path: string ): Promise<void> {
		if ( isReadMethod( method ) ) {
			return;
		}

		const mode = await this.getMode();
		if ( ! canWriteInMode( mode ) ) {
			throw new CliError( {
				code: 'live_mode_write_blocked',
				message: `Refusing to run ${ method } ${ path } because WooPayments is in live mode. WooPayments CLI only allows write operations when test/dev mode is active.`,
				status: 409,
				details: { method, path, mode },
			} );
		}
	}
}
