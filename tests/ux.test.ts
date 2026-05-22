import { describe, expect, it } from 'vitest';
import { formatCheck, formatCommand, formatMuted, formatWarning, logo } from '../src/core/ux.js';

describe('terminal UX helpers', () => {
	it('renders a non-empty ASCII logo', () => {
		expect(logo()).toContain('__');
		expect(logo().length).toBeGreaterThan(20);
	});

	it('formats common onboarding messages', () => {
		expect(formatCheck('Connected')).toContain('Connected');
		expect(formatWarning('HTTP URL')).toContain('HTTP URL');
		expect(formatCommand('wcpay doctor')).toContain('wcpay doctor');
		expect(formatMuted('Store')).toContain('Store');
	});
});
