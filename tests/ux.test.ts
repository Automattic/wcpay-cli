import { describe, expect, it } from 'vitest';
import { formatCheck, formatCommand, formatMuted, formatWarning, logo } from '../src/core/ux.js';

describe('terminal UX helpers', () => {
	it('renders a compact logo for narrow terminals', () => {
		expect(logo(60)).toContain('__');
		expect(logo(60)).not.toContain('████');
	});

	it('renders a richer logo for wide terminals', () => {
		expect(logo(120)).toContain('████');
		expect(logo(120).length).toBeGreaterThan(logo(60).length);
	});

	it('formats common onboarding messages', () => {
		expect(formatCheck('Connected')).toContain('Connected');
		expect(formatWarning('HTTP URL')).toContain('HTTP URL');
		expect(formatCommand('wcpay doctor')).toContain('wcpay doctor');
		expect(formatMuted('Store')).toContain('Store');
	});
});
