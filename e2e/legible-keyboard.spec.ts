import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { HAND_DRAWINGS, updateSettings } from '../src/lib/state/profile';
import type { HandDrawing, Profile, Settings } from '../src/lib/state/types';
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
 * the hand at rest is filled or a contour as the child chooses (version 20), and a soberer keyboard
 * can be chosen.
 */

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const LAPTOP = { width: 1280, height: 720 } as const;
/** A 1366 × 768 laptop once the task bar and the bars of the browser are taken (ADR-085). */
const SHORT_LAPTOP = { width: 1366, height: 625 } as const;
/** `font-size-lg`: what Floup says is never the smallest text of the screen (E-22). */
const FLOUP_SIZE_MIN = 24;
const FLOUP_LINES_MAX = 3;
const NAME = 'Lou';
const STEP_TIMEOUT = 15_000;

interface Lesson {
	id: string;
	title: string;
}

const { message, numbered, templateRegex } = loadMessages();
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

function child(settings: Partial<Settings> = {}): Profile {
	return updateSettings(advancedProfile({ name: NAME, passed: {} }), settings);
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

/** From the map to the game of the first lesson, at the keyboard; `before` looks at the lesson first. */
async function startFirstLesson(page: Page, before?: () => Promise<void>) {
	const lesson = page.getByRole('button', { name: FIRST.title });
	await lesson.focus();
	await page.keyboard.press('Enter');
	await throughStory(page, heading(page, FIRST.title), { keyboard: true });
	await before?.();
	await page.locator('button[data-proposed]').focus();
	await page.keyboard.press('Enter');
	await expect(page.locator('#game-input')).toBeFocused();
}

async function currentGroup(page: Page): Promise<string> {
	await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
	return GROUP_LABEL.exec((await groupLabel(page).textContent()) ?? '')?.groups?.['text'] ?? '';
}

/**
 * Types every group of the game up to the result of the lesson, after `check` looked at each one;
 * gives the number of groups typed.
 */
async function playToResult(page: Page, check: () => Promise<void>): Promise<number> {
	const result = button(page, message('play_result_map'));
	const finale = button(page, message('game_shared_finale_continue'));
	let groups = 0;
	for (;;) {
		const group = await currentGroup(page);
		await check();
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
	return groups;
}

/**
 * The hands on the keyboard of the screen rest as drawn: filled under their contour, or the contour
 * alone; the finger that shows the key is filled either way.
 */
async function expectHands(page: Page, drawing: HandDrawing) {
	const hands = page.locator('.keyboard [data-hand-guide]');
	await expect(hands).toHaveAttribute('data-hand-drawing', drawing);
	await expect(hands.locator('[data-hand-fill]')).toHaveCount(drawing === 'filled' ? 2 : 0);
	await expect(hands.locator('g[mask] [data-finger]')).not.toHaveCount(0);
	await expect(hands.locator('[data-active] .active-fill')).not.toHaveCount(0);
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

test(
	'writes what Floup says in large letters, on three lines at most, on the screens children play on',
	CHROMIUM_ONLY,
	async ({ page }) => {
		const said = [...numbered('game_dialogue_question_'), ...numbered('game_dialogue_quip_')].map(
			(key) => message(key)
		);
		for (const screen of [LAPTOP, SHORT_LAPTOP]) {
			await page.setViewportSize(screen);
			await startDevGame(page, 'dialogue');
			await page.evaluate(() => document.fonts.ready);
			// Every sentence of Floup in turn in the bubble of the game, measured where it is drawn.
			const measures = await page
				.locator('.dialogue-scene .host-line .speech')
				.evaluate((bubble, sentences) => {
					const text = [...bubble.childNodes].find(
						(node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
					);
					if (!text) throw new Error('No sentence in the bubble of Floup');
					const style = getComputedStyle(bubble);
					const frame = [
						style.paddingTop,
						style.paddingBottom,
						style.borderTopWidth,
						style.borderBottomWidth
					]
						.map((value) => Number.parseFloat(value))
						.reduce((sum, value) => sum + value, 0);
					const line = Number.parseFloat(style.lineHeight);
					return sentences.map((sentence) => {
						text.textContent = sentence;
						const lines = (bubble.getBoundingClientRect().height - frame) / line;
						return { sentence, size: Number.parseFloat(style.fontSize), lines: Math.round(lines) };
					});
				}, said);
			for (const { sentence, size, lines } of measures) {
				expect(size, sentence).toBeGreaterThanOrEqual(FLOUP_SIZE_MIN);
				expect(lines, `${sentence} (${screen.width} × ${screen.height})`).toBeLessThanOrEqual(
					FLOUP_LINES_MAX
				);
			}
		}
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
	const groups = await playToResult(page, async () => {
		// Only the keys of the finger that types keep their colour; the others are plain.
		const target = page.locator('.keyboard .key[data-target]');
		await expect(target).toHaveCount(1);
		const typing = await target.getAttribute('data-finger');
		expect(typing).not.toBeNull();
		expect(await colouredFingers(page)).toEqual([typing]);
	});
	expect(groups).toBeGreaterThan(1);
});

test('lets the child choose the hand « En contour » at the keyboard, then plays with it', async ({
	page
}) => {
	const profile = child();
	await reachMapAs(page, profile);
	const settings = button(page, message('play_settings_open'));
	await settings.focus();
	await page.keyboard.press('Enter');
	await expect(heading(page, message('settings_title'))).toBeVisible();

	const drawing = page.getByRole('group', { name: message('settings_hand_drawing_label') });
	const filled = drawing.getByRole('radio', { name: message('settings_hand_drawing_filled') });
	const outline = drawing.getByRole('radio', { name: message('settings_hand_drawing_outline') });
	await expect(filled).toBeChecked();
	// Its explanation is for the adult space: the child reads only the choices.
	await expect(page.getByText(message('settings_hand_drawing_hint'))).toHaveCount(0);
	await filled.focus();
	await page.keyboard.press('ArrowRight');
	await expect(outline).toBeChecked();
	await expect(page.getByRole('status')).toHaveText(message('settings_saved'));
	await expect
		.poll(async () => (await storedRecord(page, profile))?.['settings'])
		.toMatchObject({ handDrawing: 'outline' });
	await page.keyboard.press('Escape');
	await expect(heading(page, message('play_map_title'))).toBeVisible();

	await startFirstLesson(page, () => expectHands(page, 'outline'));
	await expectHands(page, 'outline');
	await page.keyboard.type(await currentGroup(page));
	await currentGroup(page);
	await expectHands(page, 'outline');
});

// The drawing does not depend on the engine: the choice at the keyboard is played on all three.
for (const drawing of HAND_DRAWINGS) {
	test(
		`draws the hand ${drawing} before the lesson and through a whole game`,
		CHROMIUM_ONLY,
		async ({ page }) => {
			await reachMapAs(page, child({ handDrawing: drawing }));
			await startFirstLesson(page, () => expectHands(page, drawing));
			const groups = await playToResult(page, () => expectHands(page, drawing));
			expect(groups).toBeGreaterThan(1);
		}
	);
}

test(
	'keeps the contour, the inside and the finger lit apart under forced colours, filled or in contour',
	CHROMIUM_ONLY,
	async ({ page }) => {
		for (const drawing of HAND_DRAWINGS) {
			await page.emulateMedia({ forcedColors: 'none' });
			await reachMapAs(page, child({ handDrawing: drawing }));
			await startFirstLesson(page);
			await currentGroup(page);
			await page.emulateMedia({ forcedColors: 'active' });
			await expectHands(page, drawing);
			const paints = await page.locator('.keyboard [data-hand-guide]').evaluate((hands) => {
				const stroke = (selector: string) => {
					const element = hands.querySelector(selector);
					return element ? getComputedStyle(element).stroke : null;
				};
				return {
					contour: stroke('g.outline line'),
					inside: stroke('[data-hand-fill="resting"] line'),
					finger: stroke('.active-fill')
				};
			});
			expect(paints.contour).not.toBeNull();
			expect(paints.finger).not.toBe(paints.contour);
			if (drawing === 'filled') {
				expect(paints.inside).not.toBe(paints.contour);
				expect(paints.inside).not.toBe(paints.finger);
			} else {
				expect(paints.inside).toBeNull();
			}
		}
	}
);

test('has no axe violation before a lesson and in a game with the hand filled, light and dark', async ({
	page
}) => {
	await reachMapAs(page, child());
	await startFirstLesson(page, async () => {
		await expectHands(page, 'filled');
		await expectNoAxeViolation(page);
	});
	await currentGroup(page);
	await expectHands(page, 'filled');
	await expectNoAxeViolation(page);
});

test(
	'has no axe violation on a game, every key coloured or only the finger that types, light and dark',
	CHROMIUM_ONLY,
	async ({ page }) => {
		for (const colors of ['all', 'finger'] as const) {
			await reachMapAs(page, child({ keyboardColors: colors }));
			await startFirstLesson(page);
			await currentGroup(page);
			const fingers = await colouredFingers(page);
			if (colors === 'finger') expect(fingers).toHaveLength(1);
			else expect(fingers.length).toBeGreaterThan(1);
			await expectNoAxeViolation(page);
		}
	}
);
