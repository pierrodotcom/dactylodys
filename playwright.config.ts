import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { CHROMIUM_ONLY } from './e2e/engines';
import { markFileName, preferredPort, siteMark, SITE_OUTPUT } from './tools/lib/e2e-site.js';

const HOST = '127.0.0.1';
const ROOT = fileURLToPath(new URL('.', import.meta.url));
// Each copy of the repository asks for its own port (L-149), and Windows sometimes reserves the
// range it falls in (L-091, L-093): unless E2E_PORT names one, the port of the copy is taken when
// it can be bound, another free one otherwise, then stored in the environment so that every worker,
// which reloads this config, keeps the same one.
process.env['E2E_PORT'] ??= execFileSync(
	process.execPath,
	[fileURLToPath(new URL('tools/e2e-port.js', import.meta.url)), HOST, String(preferredPort(ROOT))],
	{ encoding: 'utf8' }
).trim();
const PORT = Number(process.env['E2E_PORT']);
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
		baseURL: `http://${HOST}:${PORT}`,
		// The service worker answers from its cache, out of reach of `page.route` and of the tests that
		// count network requests: only `offline.spec.ts` lets it in.
		serviceWorkers: 'block',
		trace: 'retain-on-failure'
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'firefox', grepInvert: CHROMIUM_ONLY_TESTS, use: { ...devices['Desktop Firefox'] } },
		{ name: 'webkit', grepInvert: CHROMIUM_ONLY_TESTS, use: { ...devices['Desktop Safari'] } }
	],
	webServer: {
		command: `npm run preview -- --host ${HOST} --port ${PORT} --strictPort`,
		url: `http://${HOST}:${PORT}/${SITE_MARK}`,
		stderr: 'ignore',
		reuseExistingServer: false,
		timeout: 60_000
	}
});
