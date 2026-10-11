import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseTraceFile, replayTrace } from '../src/lib/keyboard/trace';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;
const PAGE_URL = '/dev/traces';
const FIRST_PROMPT_TEXT = 'la mer bleue';
const FILE_NAME = /^fr-fr-azerty-pc__[a-z0-9-]+-[a-z0-9-]+__\d{4}-\d{2}-\d{2}\.json$/;

const messages: Record<string, string> = JSON.parse(
	readFileSync(new URL('../messages/fr.json', import.meta.url), 'utf8')
);

function message(key: string, params: Record<string, string | number> = {}): string {
	const template = messages[key] ?? key;
	return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''));
}

function firstInput(page: Page) {
	return page.getByRole('textbox', {
		name: message('traces_prompt_input_label', { position: 1 }),
		exact: true
	});
}

function firstRebuilt(page: Page) {
	return page.getByTestId('rebuilt-text').first();
}

test.describe('trace recording page', () => {
	test('loads with its title, setup fields and prompts', async ({ page }) => {
		await page.goto(PAGE_URL);

		await expect(page).toHaveTitle(message('traces_title'));
		await expect(
			page.getByRole('heading', { level: 1, name: message('traces_title') })
		).toBeVisible();
		await expect(page.getByLabel(message('traces_layout_label'))).toHaveValue('fr-fr-azerty-pc');
		await expect(page.getByLabel(message('traces_browser_label'), { exact: true })).not.toHaveValue(
			''
		);
		await expect(page.getByRole('article')).toHaveCount(13);
		await expect(firstInput(page)).toBeVisible();
	});

	test('is not linked from the home page', async ({ page }) => {
		await page.goto('/');

		await expect(page.getByRole('link')).toHaveCount(0);
	});

	test('shows what the normalizer rebuilds while typing in the first prompt', async ({ page }) => {
		await page.goto(PAGE_URL);

		await firstInput(page).click();
		await page.keyboard.type('abc');

		await expect(firstRebuilt(page)).toHaveText('abc');
		await expect(page.getByRole('status').first()).toHaveText(
			new RegExp(message('traces_status_different'))
		);
	});

	test('reports a prompt as identical once the expected text is typed', async ({ page }) => {
		await page.goto(PAGE_URL);

		await firstInput(page).click();
		await page.keyboard.type(FIRST_PROMPT_TEXT);

		await expect(firstRebuilt(page)).toHaveText(FIRST_PROMPT_TEXT);
		await expect(page.getByRole('status').first()).toHaveText(
			new RegExp(message('traces_status_same'))
		);
	});

	test('can be driven with the keyboard alone, including restarting a prompt', async ({ page }) => {
		await page.goto(PAGE_URL);

		await firstInput(page).focus();
		await page.keyboard.type('abc');
		await page.keyboard.press('Tab');
		await expect(
			page.getByRole('button', {
				name: message('traces_prompt_restart_label', { position: 1 }),
				exact: true
			})
		).toBeFocused();
		await page.keyboard.press('Enter');

		await expect(firstRebuilt(page)).toHaveText('');
		await expect(firstInput(page)).toBeFocused();
		await expect(firstInput(page)).toHaveValue('');
	});

	test('applies Backspace to the rebuilt text', async ({ page }) => {
		await page.goto(PAGE_URL);

		await firstInput(page).click();
		await page.keyboard.type('abcd');
		await page.keyboard.press('Backspace');

		await expect(firstRebuilt(page)).toHaveText('abc');
	});

	test('keeps the download disabled until something is typed', async ({ page }) => {
		await page.goto(PAGE_URL);
		const button = page.getByRole('button', { name: message('traces_download_button') });

		await expect(button).toBeDisabled();
		await firstInput(page).click();
		await page.keyboard.type('a');
		await expect(button).toBeEnabled();
	});

	test('downloads one valid JSON file of real recordings and sends nothing over the network', async ({
		page,
		baseURL
	}) => {
		const origin = new URL(baseURL ?? '').origin;
		const outgoing: string[] = [];
		page.on('request', (request) => {
			const url = new URL(request.url());
			if (/^https?:$/.test(url.protocol) && (url.origin !== origin || request.method() !== 'GET')) {
				outgoing.push(`${request.method()} ${request.url()}`);
			}
		});
		await page.goto(PAGE_URL);
		await page.getByLabel(message('traces_layout_label')).selectOption('fr-fr-azerty-pc');
		await page.getByLabel(message('traces_keyboard_label')).fill('test keyboard');

		await firstInput(page).click();
		await page.keyboard.type(FIRST_PROMPT_TEXT);
		const downloadPromise = page.waitForEvent('download');
		await page.getByRole('button', { name: message('traces_download_button') }).click();
		const download = await downloadPromise;

		expect(download.suggestedFilename()).toMatch(FILE_NAME);
		const path = await download.path();
		const traces = parseTraceFile(JSON.parse(readFileSync(path, 'utf8')));
		expect(traces).toHaveLength(1);
		expect(traces[0]).toMatchObject({
			layoutId: 'fr-fr-azerty-pc',
			expectedText: FIRST_PROMPT_TEXT,
			synthetic: false,
			environment: { keyboard: 'test keyboard' }
		});
		expect(replayTrace(traces[0]!)).toBe(FIRST_PROMPT_TEXT);
		await expect(
			page.getByText(message('traces_download_done', { filename: download.suggestedFilename() }))
		).toBeVisible();
		expect(outgoing).toEqual([]);
	});
});

for (const colorScheme of COLOR_SCHEMES) {
	test.describe(`trace recording page, ${colorScheme} theme`, () => {
		test.use({ colorScheme });

		test('has no axe violation for WCAG A and AA', async ({ page }) => {
			await page.goto(PAGE_URL);
			await page.evaluate(() => document.fonts.ready);

			const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

			expect(results.violations).toEqual([]);
		});

		test('has no axe violation once a prompt is filled in', async ({ page }) => {
			await page.goto(PAGE_URL);
			await firstInput(page).click();
			await page.keyboard.type('abc');
			await expect(firstRebuilt(page)).toHaveText('abc');
			await page.evaluate(() => document.fonts.ready);

			const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

			expect(results.violations).toEqual([]);
		});
	});
}
