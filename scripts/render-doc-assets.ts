import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import figlet from 'figlet';

const chrome = findChrome();
const logo = figlet.textSync('wcpay', { font: 'ANSI Shadow' }).trimEnd();

const css = `
	:root {
		color-scheme: dark;
		--bg: #090b10;
		--panel: #14171f;
		--panel-2: #1f232d;
		--border: rgba( 255, 255, 255, 0.13 );
		--text: #f7f7f8;
		--muted: #9ca3af;
		--cyan: #22d3ee;
		--green: #4ade80;
		--yellow: #facc15;
	}

	* { box-sizing: border-box; }

	body {
		margin: 0;
		width: 100vw;
		height: 100vh;
		background:
			radial-gradient( circle at 18% 8%, rgba( 34, 211, 238, 0.18 ), transparent 28% ),
			radial-gradient( circle at 90% 18%, rgba( 74, 222, 128, 0.12 ), transparent 30% ),
			linear-gradient( 135deg, #07080d 0%, #10131c 45%, #080a0f 100% );
		color: var( --text );
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
		font-size: 20px;
		font-weight: 620;
		letter-spacing: -0.03em;
		-webkit-font-smoothing: antialiased;
		text-rendering: geometricPrecision;
	}

	.stage {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 36px;
	}

	.window {
		width: 100%;
		height: 100%;
		overflow: hidden;
		border: 1px solid var( --border );
		border-radius: 28px;
		background: rgba( 20, 23, 31, 0.96 );
		box-shadow: 0 44px 120px rgba( 0, 0, 0, 0.62 );
	}

	.titlebar {
		height: 58px;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 24px;
		background: rgba( 255, 255, 255, 0.065 );
		border-bottom: 1px solid var( --border );
		color: var( --muted );
		font-size: 15px;
		letter-spacing: 0;
	}

	.dot { width: 14px; height: 14px; border-radius: 999px; display: inline-block; }
	.red { background: #ff5f57; }
	.yellowdot { background: #ffbd2e; }
	.green { background: #28c840; }
	.title { margin-left: 16px; }

	.terminal {
		padding: 42px 52px 50px;
		line-height: 1.38;
		white-space: pre-wrap;
	}

	.logo {
		color: var( --cyan );
		font-size: 11px;
		font-weight: 800;
		line-height: 1.02;
		letter-spacing: 0;
		margin-bottom: 30px;
		text-shadow: 0 0 28px rgba( 34, 211, 238, 0.18 );
	}

	.prompt { color: #71717a; }
	.cyan { color: var( --cyan ); }
	.greenText { color: var( --green ); }
	.yellow { color: var( --yellow ); }
	.muted { color: var( --muted ); }
	.bold { font-weight: 850; color: #ffffff; }
	.cmd { color: var( --cyan ); }
	.small { font-size: 18px; }
	.tiny { font-size: 16px; }
	.json { font-size: 17px; line-height: 1.38; letter-spacing: -0.02em; }
`;

const screenshots = [
	{
		output: 'docs/assets/welcome.png',
		title: 'wcpay',
		size: '1280,780',
		body: `<div class="logo">${escapeHtml(logo)}</div><span class="bold">WooPayments CLI</span>

Inspect, debug, and safely exercise WooPayments stores from your terminal.

<span class="bold">Start by connecting a store:</span>
  <span class="cmd">wcpay login --site https://store.example</span>

<span class="bold">Useful next commands:</span>
  <span class="cmd">wcpay doctor</span>
  <span class="cmd">wcpay mode</span>
  <span class="cmd">wcpay transactions list --limit 10</span>`,
	},
	{
		output: 'docs/assets/login-wizard.png',
		title: 'wcpay login',
		size: '1280,1160',
		body: `<span class="prompt">$</span> wcpay login --site https://store.example --name staging

<div class="logo">${escapeHtml(logo)}</div><span class="bold">Connect a WooPayments store</span>
<span class="muted small">Use WooCommerce REST API keys to inspect payments, deposits, disputes, and test-mode workflows.</span>

<span class="bold">WooCommerce REST API key required</span>
<span class="muted small">Create a Read/Write key for a user with manage_woocommerce capability:</span>

  <span class="cmd small">https://store.example/wp-admin/admin.php?page=wc-settings&amp;tab=advanced&amp;section=keys</span>

<span class="muted small">Then paste the generated consumer key and consumer secret below.</span>

<span class="greenText">?</span> Consumer key     <span class="muted">ck_••••••••••••••••••••</span>
<span class="greenText">?</span> Consumer secret  <span class="muted">**********************</span>

<span class="greenText">✔</span> Verified credentials
<span class="greenText">✔</span> Saved credentials in macOS Keychain

<span class="greenText">✓</span> Connected to staging
<span class="muted">Store: https://store.example</span>
<span class="muted">Credentials: macOS Keychain</span>
<span class="muted">Default profile: yes</span>

Try next:
  <span class="cmd">wcpay doctor</span>
  <span class="cmd">wcpay mode</span>
  <span class="cmd">wcpay transactions list --limit 10</span>`,
	},
	{
		output: 'docs/assets/dry-run.png',
		title: 'wcpay dry-run',
		size: '1280,940',
		body: `<span class="prompt">$</span> wcpay refunds create --order 123 --amount 500 --dry-run --json

<span class="json">{
  "ok": true,
  "data": {
    "method": "POST",
    "url": "http://localhost:8082/wp-json/wc/v3/payments/refund?oauth_consumer_key=%5Bredacted%5D&amp;oauth_signature=%5Bredacted%5D",
    "headers": {
      "Accept": "application/json",
      "User-Agent": "wcpay-cli/0.0.0",
      "Content-Type": "application/json; charset=utf-8"
    },
    "body": {
      "order_id": 123,
      "amount": 500,
      "reason": "Requested by WooPayments CLI."
    }
  }
}</span>`,
	},
];

for (const screenshot of screenshots) {
	const htmlPath = `/tmp/wcpay-cli-${screenshot.output.split('/').pop()}.html`;
	writeFileSync(htmlPath, renderHtml(screenshot.title, screenshot.body));
	execFileSync(
		chrome,
		[
			'--headless=new',
			'--disable-gpu',
			'--hide-scrollbars',
			'--force-device-scale-factor=2',
			`--window-size=${screenshot.size}`,
			`--screenshot=${resolve(screenshot.output)}`,
			`file://${htmlPath}`,
		],
		{ stdio: 'ignore' }
	);
	process.stdout.write(`${screenshot.output}\n`);
}

function renderHtml(title: string, body: string): string {
	return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><div class="stage"><div class="window"><div class="titlebar"><span class="dot red"></span><span class="dot yellowdot"></span><span class="dot green"></span><span class="title">${escapeHtml(title)}</span></div><div class="terminal">${body}</div></div></div></body></html>`;
}

function escapeHtml(value: string): string {
	return value.replace(
		/[&<>]/g,
		(char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char] ?? char
	);
}

function findChrome(): string {
	const candidates = [
		process.env.CHROME_BIN,
		'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
		'/Applications/Chromium.app/Contents/MacOS/Chromium',
		'/usr/bin/google-chrome',
		'/usr/bin/chromium',
		'/usr/bin/chromium-browser',
	].filter(Boolean) as string[];

	for (const candidate of candidates) {
		try {
			execFileSync(candidate, ['--version'], { stdio: 'ignore' });
			return candidate;
		} catch {
			// Try the next candidate.
		}
	}

	throw new Error('Could not find Chrome/Chromium. Set CHROME_BIN to render docs assets.');
}
