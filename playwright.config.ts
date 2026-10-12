import { defineConfig, devices } from '@playwright/test';

const HOST = '127.0.0.1';
const PORT = 4273;
const IS_CI = Boolean(process.env.CI);
// axe audits the DOM and computed styles, which do not depend on the engine: one browser is enough.
const ACCESSIBILITY_AUDIT = /axe/i;

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
	forbidOnly: IS_CI,
	workers: 2,
	timeout: 60_000,
	retries: 0,
	reporter: IS_CI ? [['github'], ['html', { open: 'never' }]] : 'dot',
	use: {
		baseURL: `http://${HOST}:${PORT}`,
		trace: 'retain-on-failure'
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'firefox', grepInvert: ACCESSIBILITY_AUDIT, use: { ...devices['Desktop Firefox'] } },
		{ name: 'webkit', grepInvert: ACCESSIBILITY_AUDIT, use: { ...devices['Desktop Safari'] } }
	],
	webServer: {
		command: `npm run preview -- --host ${HOST} --port ${PORT} --strictPort`,
		url: `http://${HOST}:${PORT}`,
		stderr: 'ignore',
		reuseExistingServer: false,
		timeout: 60_000
	}
});
