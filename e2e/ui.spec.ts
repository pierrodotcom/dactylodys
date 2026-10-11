import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;
const PAGE_URL = '/dev/ui';
const INSTANT_SECONDS = 0.01;

function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')) as T;
}

const messages = readJson<Record<string, string>>('messages/fr.json');
const fingering = readJson<{ fingers: Record<string, string> }>(
	'layouts/fingering/ten-fingers-iso.json'
);
const geometry = readJson<{ rows: { keys: { code: string }[] }[] }>(
	'layouts/geometry/iso-105.json'
);

const KEY_COUNT = geometry.rows.reduce((total, row) => total + row.keys.length, 0);
const SAMPLE_GRAPHEMES = Array.from(
	new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(
		messages['dev_ui_sample_text'] ?? ''
	),
	(part) => part.segment
);

function message(key: string, params: Record<string, string | number> = {}): string {
	const template = messages[key] ?? key;
	return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''));
}

function fingerMessage(code: string): string {
	const finger = fingering.fingers[code] ?? '';
	return message(`ui_finger_${finger.replaceAll('-', '_')}`);
}

function hintPrefix(level: string): string {
	const keys: Record<string, string> = {
		base: 'ui_finger_hint',
		shift: 'ui_finger_hint_shift',
		altgr: 'ui_finger_hint_altgr',
		shiftAltgr: 'ui_finger_hint_shift_altgr'
	};
	return (messages[keys[level] ?? ''] ?? '').split('{key}')[0] ?? '';
}

/** Waits for the client-side code to be loaded, so that controls react as soon as they are used. */
async function openGallery(page: Page) {
	await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
}

function control(page: Page, labelKey: string) {
	return page.getByLabel(message(labelKey));
}

function fingerKeyboard(page: Page) {
	return page.getByTestId('keyboard-fingers');
}

async function optionValues(page: Page, labelKey: string): Promise<string[]> {
	return control(page, labelKey)
		.locator('option')
		.evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
}

async function animationSeconds(page: Page, selector: string): Promise<number> {
	return page
		.locator(selector)
		.first()
		.evaluate((element) => Number.parseFloat(getComputedStyle(element).animationDuration));
}

async function turnOnError(page: Page) {
	await page.getByRole('checkbox', { name: message('dev_ui_error_label') }).check();
}

test.describe('component gallery', () => {
	test('loads with its title, every section and the whole keyboard', async ({ page }) => {
		await openGallery(page);

		await expect(page).toHaveTitle(message('dev_ui_title'));
		await expect(
			page.getByRole('heading', { level: 1, name: message('dev_ui_title') })
		).toBeVisible();
		for (const heading of [
			'dev_ui_controls_heading',
			'dev_ui_buttons_heading',
			'dev_ui_target_text_heading',
			'dev_ui_keyboard_heading',
			'dev_ui_finger_hint_heading',
			'dev_ui_stars_heading',
			'dev_ui_companion_heading'
		]) {
			await expect(page.getByRole('heading', { level: 2, name: message(heading) })).toBeVisible();
		}
		await expect(fingerKeyboard(page).locator('[data-code]')).toHaveCount(KEY_COUNT);
	});

	test('is not linked from the home page', async ({ page }) => {
		await page.goto('/');

		await expect(page.getByRole('link')).toHaveCount(0);
	});

	test('keeps the keyboard decorative for screen readers', async ({ page }) => {
		await openGallery(page);

		await expect(fingerKeyboard(page).locator('.keyboard')).toHaveAttribute('aria-hidden', 'true');
	});

	test('highlights the target key and announces its finger for every target', async ({ page }) => {
		await openGallery(page);
		const values = await optionValues(page, 'dev_ui_target_label');
		expect(values.length).toBeGreaterThan(2);
		const hint = page.getByTestId('finger-hint');

		for (const value of values) {
			const [code = '', level = ''] = value.split(':');
			await control(page, 'dev_ui_target_label').selectOption(value);

			await expect(fingerKeyboard(page).locator('[data-target]')).toHaveCount(1);
			await expect(fingerKeyboard(page).locator(`[data-code="${code}"]`)).toHaveAttribute(
				'data-target',
				'true'
			);
			await expect(hint).toContainText(fingerMessage(code));
			await expect(hint).toContainText(hintPrefix(level));
			await expect(fingerKeyboard(page).locator('[data-modifier]')).toHaveCount(
				level === 'base' ? 0 : level === 'shiftAltgr' ? 2 : 1
			);
		}
	});

	test('changes the announced finger when another key is targeted', async ({ page }) => {
		await openGallery(page);
		const hint = page.getByTestId('finger-hint');

		await control(page, 'dev_ui_target_label').selectOption('KeyF:base');
		const first = await hint.innerText();
		await control(page, 'dev_ui_target_label').selectOption('KeyJ:base');

		await expect(hint).not.toHaveText(first);
	});

	test('colors keys by finger only when asked, and marks the home keys', async ({ page }) => {
		await openGallery(page);

		await expect(page.getByTestId('keyboard-plain').locator('[data-finger]')).toHaveCount(0);
		await expect(fingerKeyboard(page).locator('[data-finger="left-index"]').first()).toBeVisible();
		await expect(fingerKeyboard(page).locator('.home-mark')).toHaveCount(2);
	});

	test('marks the wrong key without moving the target', async ({ page }) => {
		await openGallery(page);

		await control(page, 'dev_ui_wrong_label').selectOption('KeyD');

		await expect(fingerKeyboard(page).locator('[data-wrong]')).toHaveCount(1);
		await expect(fingerKeyboard(page).locator('[data-code="KeyD"]')).toHaveAttribute(
			'data-wrong',
			'true'
		);
		await expect(fingerKeyboard(page).locator('[data-target]')).toHaveCount(1);
	});

	test('follows the position in the target text and describes it to screen readers', async ({
		page
	}) => {
		await openGallery(page);
		const live = page.getByTestId('target-text-live');
		const position = 3;
		const expected = SAMPLE_GRAPHEMES[position] ?? '';

		await page.getByRole('slider').fill(String(position));

		await expect(live.locator('[data-state="current"]')).toHaveText(expected);
		await expect(live.locator('[data-state="done"]')).toHaveCount(position);
		await expect(live.locator('.dd-visually-hidden')).toHaveText(
			message('ui_target_text_label', { text: SAMPLE_GRAPHEMES.join(''), char: expected })
		);
	});

	test('draws spaces with a visible symbol', async ({ page }) => {
		await openGallery(page);
		const live = page.getByTestId('target-text-live');
		const spaces = SAMPLE_GRAPHEMES.filter((grapheme) => grapheme === ' ').length;

		await expect(live.getByText(message('ui_target_space_symbol'))).toHaveCount(spaces);
	});

	test('outlines the faulty character', async ({ page }) => {
		await openGallery(page);
		const live = page.getByTestId('target-text-live');

		await expect(live.locator('[data-error]')).toHaveCount(0);
		await turnOnError(page);

		await expect(live.locator('[data-error]')).toHaveCount(1);
		await expect(live.locator('[data-error]')).toHaveCSS('border-top-style', 'dashed');
	});

	test('describes the star count and the mood of the companion', async ({ page }) => {
		await openGallery(page);

		await control(page, 'dev_ui_count_label').selectOption('3');
		await expect(
			page
				.getByTestId('stars-live')
				.getByRole('img', { name: message('ui_stars_other', { count: 3, total: 3 }) })
		).toBeVisible();
		await control(page, 'dev_ui_count_label').selectOption('1');
		await expect(
			page
				.getByTestId('stars-live')
				.getByRole('img', { name: message('ui_stars_one', { count: 1, total: 3 }) })
		).toBeVisible();

		await control(page, 'dev_ui_mood_label').selectOption('oops');
		await expect(
			page.getByTestId('companion-live').getByRole('img', { name: message('ui_companion_oops') })
		).toBeVisible();
	});

	test('applies the text scale and spacing set on the page root', async ({ page }) => {
		await openGallery(page);
		const typingSize = () =>
			page.evaluate(() =>
				getComputedStyle(document.documentElement)
					.getPropertyValue('--dd-typing-size-current')
					.trim()
			);
		const sizeOf = (name: string) =>
			page.evaluate(
				(property) => getComputedStyle(document.documentElement).getPropertyValue(property).trim(),
				name
			);

		await control(page, 'dev_ui_scale_label').selectOption('xl');
		await expect(page.locator('html')).toHaveAttribute('data-text-scale', 'xl');
		expect(await typingSize()).toBe(await sizeOf('--dd-typing-size-xl'));

		await control(page, 'dev_ui_spacing_label').selectOption('wider');
		await expect(page.locator('html')).toHaveAttribute('data-text-spacing', 'wider');
		expect(await sizeOf('--dd-typing-letter-spacing-current')).toBe(
			await sizeOf('--dd-typing-letter-spacing-wider')
		);
		expect(await sizeOf('--dd-typing-word-spacing-current')).toBe(
			await sizeOf('--dd-typing-word-spacing-wider')
		);
	});

	test('can be driven with the keyboard alone', async ({ page }) => {
		await openGallery(page);
		const selector = 'main button:not(:disabled), main select, main input';
		const total = await page.locator(selector).count();
		expect(total).toBeGreaterThan(10);
		const visited = new Set<number>();

		await page.locator(selector).first().focus();
		for (let step = 0; step < total; step++) {
			visited.add(
				await page.evaluate(
					(css) =>
						Array.from(document.querySelectorAll(css)).indexOf(document.activeElement as Element),
					selector
				)
			);
			if (step < total - 1) await page.keyboard.press('Tab');
		}
		expect(visited.has(-1)).toBe(false);
		expect(visited.size).toBe(total);

		await page.getByRole('checkbox', { name: message('dev_ui_error_label') }).focus();
		await page.keyboard.press('Space');
		await expect(page.getByTestId('target-text-live').locator('[data-error]')).toHaveCount(1);

		await page.getByRole('slider').focus();
		await page.keyboard.press('Home');
		await expect(page.getByTestId('target-text-live').locator('[data-state="current"]')).toHaveText(
			SAMPLE_GRAPHEMES[0] ?? ''
		);
	});

	test('gives every button a touch target of at least 48 pixels', async ({ page }) => {
		await openGallery(page);
		const buttons = page.locator('main button');
		const count = await buttons.count();
		expect(count).toBe(6);

		for (let index = 0; index < count; index++) {
			const box = await buttons.nth(index).boundingBox();
			expect(box?.height ?? 0).toBeGreaterThanOrEqual(48);
			expect(box?.width ?? 0).toBeGreaterThanOrEqual(48);
		}
	});
});

test.describe('motion settings', () => {
	test.describe('when the system reduces motion', () => {
		test.use({ reducedMotion: 'reduce' });

		test('plays no animation by default and plays them when forced to full', async ({ page }) => {
			await openGallery(page);
			await turnOnError(page);

			expect(await animationSeconds(page, '[data-error]')).toBeLessThan(INSTANT_SECONDS);

			await control(page, 'dev_ui_motion_label').selectOption('full');
			await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
			expect(await animationSeconds(page, '[data-error]')).toBeGreaterThan(INSTANT_SECONDS);
		});
	});

	test.describe('when the system allows motion', () => {
		test.use({ reducedMotion: 'no-preference' });

		test('plays animations by default and stops them when set to reduced', async ({ page }) => {
			await openGallery(page);
			await turnOnError(page);

			expect(await animationSeconds(page, '[data-error]')).toBeGreaterThan(INSTANT_SECONDS);

			await control(page, 'dev_ui_motion_label').selectOption('reduced');
			await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
			expect(await animationSeconds(page, '[data-error]')).toBeLessThan(INSTANT_SECONDS);
			await expect(page.locator('[data-error]').first()).toHaveCSS('border-top-style', 'dashed');
		});
	});
});

async function exerciseStates(page: Page) {
	await openGallery(page);
	await control(page, 'dev_ui_target_label').selectOption('KeyE:altgr');
	await control(page, 'dev_ui_wrong_label').selectOption('KeyD');
	await control(page, 'dev_ui_mood_label').selectOption('cheer');
	await control(page, 'dev_ui_count_label').selectOption('3');
	await turnOnError(page);
	await page.evaluate(() => document.fonts.ready);
}

async function expectNoViolation(page: Page) {
	const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
	expect(results.violations).toEqual([]);
}

for (const colorScheme of COLOR_SCHEMES) {
	test.describe(`component gallery, ${colorScheme} theme`, () => {
		test.use({ colorScheme });

		test('has no axe violation for WCAG A and AA', async ({ page }) => {
			await openGallery(page);
			await page.evaluate(() => document.fonts.ready);

			await expectNoViolation(page);
		});

		test('has no axe violation with a target, a wrong key and an error', async ({ page }) => {
			await exerciseStates(page);

			await expectNoViolation(page);
		});

		test('has no axe violation with the theme forced on the page root', async ({ page }) => {
			await openGallery(page);
			await control(page, 'dev_ui_theme_label').selectOption(
				colorScheme === 'light' ? 'dark' : 'light'
			);
			await page.evaluate(() => document.fonts.ready);

			await expectNoViolation(page);
		});
	});
}

test.describe('component gallery, reduced motion', () => {
	test.use({ reducedMotion: 'reduce' });

	test('has no axe violation', async ({ page }) => {
		await exerciseStates(page);

		await expectNoViolation(page);
	});
});

test.describe('component gallery, large and spaced text', () => {
	test('has no axe violation', async ({ page }) => {
		await openGallery(page);
		await control(page, 'dev_ui_scale_label').selectOption('xl');
		await control(page, 'dev_ui_spacing_label').selectOption('wider');
		await page.evaluate(() => document.fonts.ready);

		await expectNoViolation(page);
	});
});
