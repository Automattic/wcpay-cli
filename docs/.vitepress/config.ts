import { defineConfig } from 'vitepress';

export default defineConfig({
	title: 'WooPayments CLI',
	description: 'Standalone CLI for WooPayments developers, support, agencies, scripts, and agents.',
	base: '/wcpay-cli/',
	cleanUrls: true,
	lastUpdated: true,
	themeConfig: {
		siteTitle: 'WooPayments CLI',
		nav: [
			{ text: 'Guide', link: '/getting-started' },
			{ text: 'Commands', link: '/commands' },
			{ text: 'GitHub', link: 'https://github.com/Automattic/wcpay-cli' },
		],
		sidebar: [
			{
				text: 'Guide',
				items: [
					{ text: 'Overview', link: '/' },
					{ text: 'Getting started', link: '/getting-started' },
					{ text: 'Authentication', link: '/auth' },
					{ text: 'Safety model', link: '/safety' },
					{ text: 'Command guide', link: '/commands' },
					{ text: 'Command reference', link: '/command-reference.generated' },
					{ text: 'API command syntax', link: '/api' },
					{ text: 'MCP', link: '/mcp' },
				],
			},
			{
				text: 'Development',
				items: [
					{ text: 'Endpoint inventory', link: '/endpoint-inventory' },
					{ text: 'Test scenarios', link: '/test-scenarios' },
					{ text: 'Developer guide', link: '/developer-guide' },
					{ text: 'Local smoke testing', link: '/local-smoke-testing' },
					{ text: 'Packaging and release', link: '/packaging' },
				],
			},
		],
		socialLinks: [
			{ icon: 'github', link: 'https://github.com/Automattic/wcpay-cli' },
		],
		search: {
			provider: 'local',
		},
		footer: {
			message: 'Released under the GPL-3.0-or-later license.',
			copyright: 'Copyright Automattic',
		},
	},
});
