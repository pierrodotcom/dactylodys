import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { updateSettings } from '../src/lib/state/profile';
import type { Profile, Settings } from '../src/lib/state/types';
import { CHROMIUM_ONLY } from './engines';
import {
	advancedProfile,
	expectNoAxeViolation,
	installProfile,
	loadMessages,
	openPage,
	readJson,
	reloadPage,
	storedRecord
} from './support';

/**
 * The settings of the child, tidied up (ADR-075): families, one line per setting, every group of
 * choices on the same vertical, a chosen option that does not look like a button, "Calm
 * everything" that can be undone, and the keyboard layout left to the adult space.
 */

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const LAPTOP = { width: 1280, height: 720 } as const;
/** 1280 pixels at 400 % zoom: the width WCAG 1.4.10 asks for. */
const NARROW = { width: 320, height: 640 } as const;
const SCREENS_AT_MOST = 2;
const TOUCH_TARGET = 48;
/** Boxes are compared to the pixel: engines round sub-pixels differently. */
const PIXEL = 1;
const OTHER_LAYOUT = 'fr-fr-azerty-mac';

const { message } = loadMessages();
const gateNumbers = readJson<{ numbers: { value: number; words: string }[] }>(
	'content/fr/adult/gate-numbers.json'
).numbers;

const NAME = 'Lou';
const FAMILIES = [
	'settings_family_sound',
	'settings_family_screen',
	'settings_family_text',
	'settings_family_keyboard',
	'settings_family_player'
].map((key) => message(key));
/** Every line of the settings of the child, in order, by the name written on its left. */
const CHILD_LINES = [
	'settings_calm_button',
	'settings_sound_label',
	'settings_voice_label',
	'settings_ambience_label',
	'settings_theme_label',
	'settings_motion_label',
	'settings_effects_label',
	'settings_scale_label',
	'settings_spacing_label',
	'settings_sample_label',
	'settings_keyboard_label',
	'settings_hand_label',
	'settings_age_label'
].map((key) => message(key));

function child(patch: Partial<Settings> = {}): Profile {
	return updateSettings(advancedProfile({ name: NAME, passed: {} }), patch);
}

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function group(page: Page, legend: string): Locator {
	return page.getByRole('group', { name: legend });
}

function choice(page: Page, legend: string, option: string): Locator {
	return group(page, legend).getByRole('radio', { name: option });
}

async function openChildSettings(page: Page, profile: Profile) {
	await openPage(page, '/jouer');
	await installProfile(page, profile);
	await reloadPage(page);
	await button(page, NAME).click();
	await expect(heading(page, message('play_map_title'))).toBeVisible();
	await button(page, message('play_settings_open')).click();
	await expect(heading(page, message('settings_title'))).toBeVisible();
}

async function openAdultSettings(page: Page, profile: Profile) {
	await openPage(page, '/jouer');
	await installProfile(page, profile);
	await openPage(page, '/adulte');
	const words = (await page.locator('[data-gate-words]').textContent())?.trim();
	const number = gateNumbers.find((entry) => entry.words === words);
	if (!number) throw new Error(`unknown gate number: ${words}`);
	await page.locator('[data-gate-answer]').fill(String(number.value));
	await page.keyboard.press('Enter');
	await expect(page.locator('[data-adult-home]')).toBeVisible();
	await button(page, NAME).click();
	await page.locator('[data-child-settings]').focus();
	await page.keyboard.press('Enter');
	await expect(heading(page, message('adult_settings_title', { name: NAME }))).toBeVisible();
}

interface Line {
	readonly name: string;
	readonly nameLeft: number;
	readonly nameBottom: number;
	readonly choicesLeft: number;
	readonly choicesTop: number;
	/** The left edge of the first choice: the same as the column when nothing is centred. */
	readonly firstLeft: number;
}

/** Every line of the settings: the box of its name and the box of what is beside or under it. */
async function settingLines(page: Page): Promise<Line[]> {
	await page.evaluate(() => document.fonts.ready);
	return page.locator('[data-choices]').evaluateAll((columns) =>
		columns.map((column) => {
			const name = column.previousElementSibling;
			if (!name) throw new Error('A column of choices without its name');
			const nameBox = name.getBoundingClientRect();
			const box = column.getBoundingClientRect();
			const first = column.querySelector('label') ?? column.firstElementChild ?? column;
			return {
				name: name.textContent?.trim() ?? '',
				nameLeft: nameBox.left,
				nameBottom: nameBox.bottom,
				choicesLeft: box.left,
				choicesTop: box.top,
				firstLeft: first.getBoundingClientRect().left
			};
		})
	);
}

async function familyLefts(page: Page): Promise<number[]> {
	return page
		.getByRole('heading', { level: 2 })
		.evaluateAll((titles) => titles.map((title) => title.getBoundingClientRect().left));
}

function expectOneVertical(values: readonly number[], expected: number) {
	for (const value of values) expect(Math.abs(value - expected)).toBeLessThanOrEqual(PIXEL);
}

test.describe('settings of the child on a laptop', () => {
	test.use({ viewport: LAPTOP });

	test(
		'starts every group of choices on the same vertical, beside its name',
		CHROMIUM_ONLY,
		async ({ page }) => {
			await openChildSettings(page, child());

			const lines = await settingLines(page);
			expect(lines.map((line) => line.name)).toEqual(CHILD_LINES);
			const [first] = lines as [Line, ...Line[]];
			expectOneVertical(
				lines.map((line) => line.nameLeft),
				first.nameLeft
			);
			expectOneVertical(
				lines.map((line) => line.choicesLeft),
				first.choicesLeft
			);
			expect(first.choicesLeft).toBeGreaterThan(first.nameLeft);
			for (const line of lines) {
				// Nothing is centred in its column, and the choices sit on the line of their name.
				expect(Math.abs(line.firstLeft - line.choicesLeft)).toBeLessThanOrEqual(PIXEL);
				expect(line.choicesTop).toBeLessThan(line.nameBottom);
			}
			expectOneVertical(await familyLefts(page), first.nameLeft);
		}
	);

	test(
		'names the families in order and fits in two screens at most',
		CHROMIUM_ONLY,
		async ({ page }) => {
			await openChildSettings(page, child());

			await expect(page.getByRole('heading', { level: 2 })).toHaveText(FAMILIES);
			const height = await page.evaluate(() => document.documentElement.scrollHeight);
			expect(height).toBeLessThanOrEqual(SCREENS_AT_MOST * LAPTOP.height);
			// The sample sits right under the two settings it shows.
			const names = (await settingLines(page)).map((line) => line.name);
			expect(names.indexOf(message('settings_sample_label'))).toBe(
				names.indexOf(message('settings_spacing_label')) + 1
			);
		}
	);

	test(
		'marks the chosen option with a check and a thick frame, not with a filled shape',
		CHROMIUM_ONLY,
		async ({ page }) => {
			await openChildSettings(page, child({ soundEnabled: true }));

			const look = (option: string) =>
				choice(page, message('settings_sound_label'), option).evaluate((radio) => {
					const label = radio.closest('label');
					if (!label) throw new Error('A choice without its label');
					const style = getComputedStyle(label);
					return {
						background: style.backgroundColor,
						frame: Number.parseFloat(style.borderTopWidth),
						check: label.querySelector('svg') !== null,
						height: label.getBoundingClientRect().height
					};
				});
			const chosen = await look(message('settings_on'));
			const other = await look(message('settings_off'));

			expect(chosen.check).toBe(true);
			expect(other.check).toBe(false);
			expect(chosen.frame).toBeGreaterThan(other.frame);
			expect(chosen.background).toBe(other.background);
			// Choosing does not make the option taller than its neighbours.
			expect(Math.abs(chosen.height - other.height)).toBeLessThanOrEqual(PIXEL);
			const heights = await page
				.locator('[data-choices] label')
				.evaluateAll((labels) => labels.map((label) => label.getBoundingClientRect().height));
			expect(Math.min(...heights)).toBeGreaterThanOrEqual(TOUCH_TARGET);
		}
	);

	test('is walked with the keyboard alone: the way out, calm, then each setting in turn', async ({
		page
	}) => {
		const profile = child({ soundEnabled: true, voiceEnabled: true });
		await openChildSettings(page, profile);

		await expect(heading(page, message('settings_title'))).toBeFocused();
		await page.keyboard.press('Tab');
		await expect(page.locator('[data-screen-back] button')).toBeFocused();
		await page.keyboard.press('Tab');
		await expect(button(page, message('settings_calm_button'))).toBeFocused();
		await page.keyboard.press('Tab');
		const soundOn = choice(page, message('settings_sound_label'), message('settings_on'));
		await expect(soundOn).toBeFocused();

		// The arrows move the choice inside a setting, and the change is kept at once.
		await page.keyboard.press('ArrowRight');
		await expect(
			choice(page, message('settings_sound_label'), message('settings_off'))
		).toBeChecked();
		await expect(page.getByRole('status')).toHaveText(message('settings_saved'));
		await expect
			.poll(async () => (await storedRecord(page, profile))?.['settings'])
			.toMatchObject({ soundEnabled: false });

		await page.keyboard.press('Tab');
		await expect(
			choice(page, message('settings_voice_label'), message('settings_on'))
		).toBeFocused();
		await page.keyboard.press('Escape');
		await expect(heading(page, message('play_map_title'))).toBeVisible();
	});

	test('puts the three settings back as they were after "Calm everything", keyboard only', async ({
		page
	}) => {
		const profile = child({
			motion: 'full',
			effects: true,
			soundEnabled: true,
			voiceEnabled: true
		});
		await openChildSettings(page, profile);
		const calm = button(page, message('settings_calm_button'));
		const undo = page.locator('[data-calm-undo]');
		await expect(undo).toHaveCount(0);

		await calm.focus();
		await page.keyboard.press('Enter');
		await expect(page.locator('[data-calm-status]')).toContainText(message('settings_calm_done'));
		await expect(undo).toHaveText(message('settings_calm_undo'));
		await expect
			.poll(async () => (await storedRecord(page, profile))?.['settings'])
			.toMatchObject({ motion: 'reduced', effects: false, soundEnabled: false });

		// Pressed again, nothing changes, and what was there before can still be given back.
		await page.keyboard.press('Enter');
		await expect(page.locator('[data-calm-status]')).toHaveText(message('settings_calm_already'));
		await expect(undo).toBeVisible();

		await undo.focus();
		await page.keyboard.press('Enter');
		await expect(page.locator('[data-calm-restored]')).toHaveText(message('settings_calm_undone'));
		await expect(page.locator('[data-calm-status]')).toHaveCount(0);
		await expect(undo).toHaveCount(0);
		// The button is gone: the focus is back on "Calm everything", not lost.
		await expect(calm).toBeFocused();
		await expect(
			choice(page, message('settings_motion_label'), message('settings_motion_full'))
		).toBeChecked();
		await expect(
			choice(page, message('settings_effects_label'), message('settings_on'))
		).toBeChecked();
		await expect(
			choice(page, message('settings_sound_label'), message('settings_on'))
		).toBeChecked();
		await expect
			.poll(async () => (await storedRecord(page, profile))?.['settings'])
			.toMatchObject({ motion: 'full', effects: true, soundEnabled: true, voiceEnabled: true });
		await expect(page.locator('html')).not.toHaveAttribute('data-effects', 'off');
	});

	test(
		'gives back a setting that followed the device, and nothing once a setting is changed by hand',
		CHROMIUM_ONLY,
		async ({ page }) => {
			// The sounds are already cut: they stay cut once the rest is given back.
			const profile = child({ motion: 'system', effects: true, soundEnabled: false });
			await openChildSettings(page, profile);
			const calm = button(page, message('settings_calm_button'));
			const undo = page.locator('[data-calm-undo]');

			await calm.click();
			await expect(undo).toBeVisible();
			await undo.click();
			await expect
				.poll(async () => (await storedRecord(page, profile))?.['settings'])
				.toMatchObject({ motion: 'system', effects: true, soundEnabled: false });

			await calm.click();
			await expect(undo).toBeVisible();
			await choice(page, message('settings_voice_label'), message('settings_off')).check();
			await expect(undo).toHaveCount(0);
			await expect(page.getByRole('status')).toHaveText(message('settings_saved'));

			// Everything is calm already: there is nothing to give back.
			await calm.click();
			await expect(page.locator('[data-calm-status]')).toHaveText(message('settings_calm_already'));
			await expect(undo).toHaveCount(0);
		}
	);
});

test.describe('settings of the child at 320 pixels', CHROMIUM_ONLY, () => {
	test.use({ viewport: NARROW });

	test('puts the choices under their name, both on the left edge, without scrolling sideways', async ({
		page
	}) => {
		await openChildSettings(page, child());

		const lines = await settingLines(page);
		expect(lines.map((line) => line.name)).toEqual(CHILD_LINES);
		const [first] = lines as [Line, ...Line[]];
		for (const line of lines) {
			expect(Math.abs(line.nameLeft - first.nameLeft)).toBeLessThanOrEqual(PIXEL);
			expect(Math.abs(line.choicesLeft - first.nameLeft)).toBeLessThanOrEqual(PIXEL);
			expect(Math.abs(line.firstLeft - first.nameLeft)).toBeLessThanOrEqual(PIXEL);
			expect(line.choicesTop).toBeGreaterThanOrEqual(line.nameBottom);
		}
		expectOneVertical(await familyLefts(page), first.nameLeft);
		const sideways = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(sideways).toBeLessThanOrEqual(0);
	});
});

test.describe('keyboard layout', () => {
	test('is not among the settings of the child', CHROMIUM_ONLY, async ({ page }) => {
		await openChildSettings(page, child());

		await expect(group(page, message('settings_age_label'))).toBeVisible();
		await expect(group(page, message('settings_layout_label'))).toHaveCount(0);
		await expect(group(page, message('settings_backspace_label'))).toHaveCount(0);
	});

	test('is chosen by the adult, for one child, with the keyboard alone', async ({ page }) => {
		const profile = child();
		await openAdultSettings(page, profile);

		const layout = group(page, message('settings_layout_label'));
		const current = layout.getByRole('radio', {
			name: message(`play_layout_${profile.settings.layoutId.replaceAll('-', '_')}`)
		});
		await expect(current).toBeChecked();
		const other = layout.getByRole('radio', {
			name: message(`play_layout_${OTHER_LAYOUT.replaceAll('-', '_')}`)
		});
		await other.focus();
		await page.keyboard.press('Space');
		await expect(other).toBeChecked();
		await expect(page.getByRole('status')).toHaveText(message('settings_saved'));
		await expect
			.poll(async () => (await storedRecord(page, profile))?.['settings'])
			.toMatchObject({ layoutId: OTHER_LAYOUT });
	});

	test(
		'keeps the lines of the adult on the same vertical, their explanation under the choices',
		CHROMIUM_ONLY,
		async ({ page }) => {
			await page.setViewportSize(LAPTOP);
			await openAdultSettings(page, child());

			const lines = await settingLines(page);
			const [first] = lines as [Line, ...Line[]];
			expectOneVertical(
				lines.map((line) => line.choicesLeft),
				first.choicesLeft
			);
			const hint = page.getByText(message('settings_backspace_hint'));
			const hintLeft = await hint.evaluate((element) => element.getBoundingClientRect().left);
			expect(Math.abs(hintLeft - first.choicesLeft)).toBeLessThanOrEqual(PIXEL);
			await expect(group(page, message('settings_backspace_label'))).toHaveAccessibleDescription(
				message('settings_backspace_hint')
			);
		}
	);
});

test.describe('settings, light and dark themes', () => {
	test('has no axe violation on the settings of the child, calm and wide then narrow', async ({
		page
	}) => {
		await page.setViewportSize(LAPTOP);
		await openChildSettings(page, child({ motion: 'full' }));
		await expectNoAxeViolation(page);

		await button(page, message('settings_calm_button')).click();
		await expect(page.locator('[data-calm-undo]')).toBeVisible();
		await expectNoAxeViolation(page);

		await page.setViewportSize(NARROW);
		await expectNoAxeViolation(page);
	});

	test('has no axe violation on the settings of a child in the adult space', async ({ page }) => {
		await openAdultSettings(page, child());
		await expectNoAxeViolation(page);
	});
});
