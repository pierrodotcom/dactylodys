import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { updateSettings } from '../src/lib/state/profile';
import type { KeyboardColors, Profile } from '../src/lib/state/types';
import { CHROMIUM_ONLY } from './engines';
import {
	advancedProfile,
	expectNoAxeViolation,
	installProfile,
	loadMessages,
	openPage,
	readJson,
	reloadPage,
	setRewards,
	storedRecord,
	throughStory
} from './support';

/*
 * A drawn keyboard that helps without crowding (audit E-06, E-07, E-11, E-21, E-22, E-24): the key
 * lit carries the sign asked for, shows in both themes and in the forced colours of the system,
 * the hand at rest is a contour, and a soberer keyboard can be chosen.
 */

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const LAPTOP = { width: 1280, height: 720 } as const;
const NAME = 'Lou';
const STEP_TIMEOUT = 15_000;

interface Lesson {
	id: string;
	title: string;
}

const { message, templateRegex } = loadMessages();
const GROUP_LABEL = templateRegex('ui_target_text_label');
const FIRST = readJson<{ worlds: { lessons: Lesson[] }[] }>(
	'content/fr/progression/azerty-decouverte.json'
).worlds[0]?.lessons[0] as Lesson;

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function groupLabel(page: Page): Locator {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

function child(colors: KeyboardColors = 'all'): Profile {
	return updateSettings(advancedProfile({ name: NAME, passed: {} }), { keyboardColors: colors });
}

/** A game of the trial page, its first group on screen. */
async function startDevGame(page: Page, gameId: string) {
	await openPage(page, '/dev/jeux');
	await page.getByRole('radio', { name: message(`game_${gameId}_title`) }).check();
	await button(page, message('dev_games_play')).click();
	await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
}

/** The map of this profile; a page that has shown a map already goes back to the last player. */
async function reachMapAs(page: Page, profile: Profile) {
	await openPage(page, '/jouer');
	await installProfile(page, profile);
	await reloadPage(page);
	const map = heading(page, message('play_map_title'));
	const player = button(page, profile.name);
	await expect(map.or(player)).toBeVisible();
	if (await player.isVisible()) await player.click();
	await expect(map).toBeVisible();
}

/** From the map to the game of the first lesson, at the keyboard. */
async function startFirstLesson(page: Page) {
	const lesson = page.getByRole('button', { name: FIRST.title });
	await lesson.focus();
	await page.keyboard.press('Enter');
	await throughStory(page, heading(page, FIRST.title), { keyboard: true });
	await page.locator('button[data-proposed]').focus();
	await page.keyboard.press('Enter');
	await expect(page.locator('#game-input')).toBeFocused();
}

async function currentGroup(page: Page): Promise<string> {
	await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
	return GROUP_LABEL.exec((await groupLabel(page).textContent()) ?? '')?.groups?.['text'] ?? '';
}

/** The fingers whose keys keep their colour on the keyboard drawn. */
function colouredFingers(page: Page): Promise<string[]> {
	return page
		.locator('.keyboard .key[data-finger]')
		.evaluateAll((keys) => [...new Set(keys.map((key) => key.getAttribute('data-finger') ?? ''))]);
}

test.beforeEach(async ({ page }) => {
	await page.setViewportSize(LAPTOP);
	await setRewards(page, 'instant');
});

test(
	'frames only the character to type, in the colour of a selection, under forced colours',
	CHROMIUM_ONLY,
	async ({ page }) => {
		await startDevGame(page, 'hatching');
		await page.emulateMedia({ forcedColors: 'active' });

		const colours = await page.evaluate(() => {
			const probe = document.createElement('span');
			document.body.append(probe);
			const system = (name: string) => {
				probe.style.color = name;
				return getComputedStyle(probe).color;
			};
			const canvas = system('Canvas');
			const highlight = system('Highlight');
			probe.remove();
			const style = (selector: string) => {
				const element = document.querySelector(selector);
				if (!element) throw new Error(`Nothing matches ${selector}`);
				return getComputedStyle(element);
			};
			return {
				canvas,
				highlight,
				next: style('.target-text [data-state="next"]').borderTopColor,
				current: style('.target-text [data-state="current"]').borderTopColor,
				currentOutline: style('.target-text [data-state="current"]').outlineColor,
				key: style('.keyboard .key[data-target]').outlineColor
			};
		});

		expect(colours.highlight).not.toBe(colours.canvas);
		// A letter still to type has no frame to see: it is drawn in the colour of the page.
		expect(colours.next).toBe(colours.canvas);
		expect(colours.current).toBe(colours.highlight);
		expect(colours.currentOutline).toBe(colours.highlight);
		expect(colours.key).toBe(colours.highlight);
	}
);

test('lets the child choose « Le doigt qui tape » at the keyboard, then plays with it', async ({
	page
}) => {
	const profile = child();
	await reachMapAs(page, profile);
	const settings = button(page, message('play_settings_open'));
	await settings.focus();
	await page.keyboard.press('Enter');
	await expect(heading(page, message('settings_title'))).toBeVisible();

	const colors = page.getByRole('group', { name: message('settings_keyboard_colors_label') });
	const every = colors.getByRole('radio', { name: message('settings_keyboard_colors_all') });
	const finger = colors.getByRole('radio', { name: message('settings_keyboard_colors_finger') });
	await expect(every).toBeChecked();
	await every.focus();
	await page.keyboard.press('ArrowRight');
	await expect(finger).toBeChecked();
	await expect(page.getByRole('status')).toHaveText(message('settings_saved'));
	await expect
		.poll(async () => (await storedRecord(page, profile))?.['settings'])
		.toMatchObject({ keyboardColors: 'finger' });
	await page.keyboard.press('Escape');
	await expect(heading(page, message('play_map_title'))).toBeVisible();

	await startFirstLesson(page);
	const result = button(page, message('play_result_map'));
	const finale = button(page, message('game_shared_finale_continue'));
	let groups = 0;
	for (;;) {
		const group = await currentGroup(page);
		// Only the keys of the finger that types keep their colour; the others are plain.
		const target = page.locator('.keyboard .key[data-target]');
		await expect(target).toHaveCount(1);
		const typing = await target.getAttribute('data-finger');
		expect(typing).not.toBeNull();
		expect(await colouredFingers(page)).toEqual([typing]);
		await page.keyboard.type(group);
		groups += 1;
		const over = { value: false };
		await expect(async () => {
			over.value = (await result.isVisible()) || (await finale.isVisible());
			const shown = (await groupLabel(page).allTextContents()).some((text) =>
				GROUP_LABEL.test(text)
			);
			expect(over.value || shown).toBe(true);
		}).toPass({ timeout: STEP_TIMEOUT });
		if (over.value) break;
	}
	if (await finale.isVisible()) {
		await finale.focus();
		await page.keyboard.press('Enter');
	}
	await expect(result).toBeVisible();
	expect(groups).toBeGreaterThan(1);
});

test(
	'has no axe violation on a game, every key coloured or only the finger that types, light and dark',
	CHROMIUM_ONLY,
	async ({ page }) => {
		for (const colors of ['all', 'finger'] as const) {
			await reachMapAs(page, child(colors));
			await startFirstLesson(page);
			await currentGroup(page);
			const fingers = await colouredFingers(page);
			if (colors === 'finger') expect(fingers).toHaveLength(1);
			else expect(fingers.length).toBeGreaterThan(1);
			await expectNoAxeViolation(page);
		}
	}
);
