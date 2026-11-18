import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { CHROMIUM_ONLY } from './e2e/engines';
import {
	E2E_HOSTS,
	markFileName,
	preferredPort,
	siteMark,
	siteOrigin,
	SITE_OUTPUT
} from './tools/lib/e2e-site.js';

// The site is served on both loopbacks and opened as localhost, reached on ::1 first
// (`tools/lib/e2e-site.js`): the IPv4 loopback held connections back for seconds on the machine of
// the project. Chromium and WebKit try ::1 first by themselves; Firefox, once told.
const HOSTS = E2E_HOSTS.join(',');
const FIREFOX_PREFERS_IPV6 = { 'network.dns.preferIPv6': true };
const ROOT = fileURLToPath(new URL('.', import.meta.url));
// Each copy of the repository asks for its own port (L-149), and Windows sometimes reserves the
// range it falls in (L-091, L-093): unless E2E_PORT names one, the port of the copy is taken when
// it can be bound, another free one otherwise, then stored in the environment so that every worker,
// which reloads this config, keeps the same one.
process.env['E2E_PORT'] ??= execFileSync(
	process.execPath,
	[
		fileURLToPath(new URL('tools/e2e-port.js', import.meta.url)),
		HOSTS,
		String(preferredPort(ROOT))
	],
	{ encoding: 'utf8' }
).trim();
const PORT = Number(process.env['E2E_PORT']);
const ORIGIN = siteOrigin(PORT);
// The site of this copy serves its mark, the site of another copy does not: Playwright waits for it
// before the first test, and never runs on another site (L-149).
const SITE_MARK = markFileName(siteMark(ROOT));
if (!existsSync(join(ROOT, SITE_OUTPUT, SITE_MARK))) {
	throw new Error(
		'The site of the tests is not built in this copy: run `npm run build:e2e` first.'
	);
}
const IS_CI = Boolean(process.env.CI);
/** Tests run at once on this machine; E2E_WORKERS sets another number. */
const WORKERS = Number(process.env['E2E_WORKERS']) || 2;
// axe audits the DOM and computed styles, which do not depend on the engine: one browser is enough,
// as for every test tagged CHROMIUM_ONLY (`e2e/engines.ts`).
const CHROMIUM_ONLY_TESTS = [/axe/i, new RegExp(CHROMIUM_ONLY.tag)];

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
	forbidOnly: IS_CI,
	workers: WORKERS,
	timeout: 60_000,
	retries: 0,
	reporter: IS_CI ? [['github'], ['html', { open: 'never' }]] : 'dot',
	use: {
		baseURL: ORIGIN,
		// The service worker answers from its cache, out of reach of `page.route` and of the tests that
		// count network requests: only `offline.spec.ts` lets it in.
		serviceWorkers: 'block',
		trace: 'retain-on-failure'
	},
	// One WebKit at a time, from the start, beside the other engines: two of them at once ran short
	// of memory on a busy machine (« Target crashed », tests twice as slow). Listed first, it takes
	// one worker while the others play Firefox and Chromium, instead of a WebKit phase at the end.
	projects: [
		{
			name: 'webkit',
			grepInvert: CHROMIUM_ONLY_TESTS,
			workers: 1,
			use: { ...devices['Desktop Safari'] }
		},
		{
			name: 'firefox',
			grepInvert: CHROMIUM_ONLY_TESTS,
			use: {
				...devices['Desktop Firefox'],
				launchOptions: { firefoxUserPrefs: FIREFOX_PREFERS_IPV6 }
			}
		},
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }
	],
	// The built site served as GitHub Pages serves it (`tools/e2e-server.js`): it starts at once and
	// spends nothing per request, where `vite preview` took half a minute and compressed every file.
	webServer: {
		command: `node tools/e2e-server.js ${HOSTS} ${PORT}`,
		url: `${ORIGIN}/${SITE_MARK}`,
		reuseExistingServer: false,
		timeout: 60_000
	}
});
