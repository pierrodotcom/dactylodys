import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { toGraphemes } from '../src/lib/engine/graphemes';
import type { StarCount } from '../src/lib/engine/progression/types';
import type { Profile } from '../src/lib/state/types';
import {
	advancedProfile,
	answerCheckKey,
	installProfile,
	keyboardCheckKeys,
	loadMessages,
	openPage,
	readJson,
	reloadPage,
	shortenRewards,
	throughStory
} from './support';

/**
 * The game never lets go of the child (audit of ergonomics, E-01, E-02, E-03 d, E-12): Tab and
 * Shift + Tab do not stop the typing, the Back button of the browser does not lose a game, every
 * screen opens at its top, and a screen reader hears each thing once.
 */

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const PLAY_URL = /\/jouer$/;
const HOME_URL = /\/$/;
const PLAYER_NAME = 'Lou';
const PASSED_STARS: StarCount = 3;
/** A laptop screen: a page taller than it scrolls. */
const LAPTOP = { width: 1280, height: 720 } as const;
const FAR_DOWN = 100_000;
/** Groups a test may type before it meets the character it looks for. */
const GROUP_BUDGET = 6;
const SKIP_KEY = 'Enter';
/** Stands for a parameter of a message whose value a test does not know. */
const ANYTHING = 'ANYTHINGTOKEN';
/** Time given to a reward to give way to the next group or to the result. */
const STEP_TIMEOUT = 15_000;
const CIRCUMFLEX_LETTER = 'ê';
/** Where the circumflex is on a French keyboard: a dead key, which writes nothing by itself. */
const DEAD_KEY_CODE = 'BracketLeft';

interface Lesson {
	id: string;
	title: string;
	newChars: string[];
	repair?: unknown;
}

const { message, templateRegex } = loadMessages();
const lessons = readJson<{ worlds: { lessons: Lesson[] }[] }>(
	'content/fr/progression/azerty-decouverte.json'
).worlds.flatMap((world) => world.lessons);
const FIRST = lessons[0] as Lesson;
const SECOND = lessons[1] as Lesson;
const CIRCUMFLEX = lessons.find((lesson) => lesson.newChars.includes(CIRCUMFLEX_LETTER)) as Lesson;
const REPAIR = lessons.find((lesson) => lesson.repair !== undefined) as Lesson;
const CHECK_KEYS = keyboardCheckKeys();
const GROUP_LABEL = templateRegex('ui_target_text_label');
const GROUP_DONE = templateRegex('ui_target_text_done');
const GROUP_ERASE = templateRegex('ui_target_text_erase');

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function groupLabel(page: Page): Locator {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

function field(page: Page): Locator {
	return page.locator('#game-input');
}

function doneCells(page: Page): Locator {
	return page.locator('.target-text [data-state="done"]');
}

function pauseButton(page: Page): Locator {
	return button(page, message('game_shared_pause'));
}

function pauseDialog(page: Page): Locator {
	return page.getByRole('dialog', { name: message('game_shared_pause_title') });
}

function keepTypingNotice(page: Page): Locator {
	return page.locator('[data-keep-typing]');
}

function announcement(page: Page): Locator {
	return page.locator('[data-game-announcement]');
}

/** A child who passed every lesson before this one. */
function childBefore(lesson: Lesson): Profile {
	const index = lessons.findIndex((item) => item.id === lesson.id);
	const passed = Object.fromEntries(lessons.slice(0, index).map((item) => [item.id, PASSED_STARS]));
	return advancedProfile({ name: PLAYER_NAME, passed });
}

/** Arrives on the map from the home page, as a child who clicks "Play": the history holds both. */
async function reachMapFromHome(page: Page, profile: Profile) {
	await openPage(page, '/');
	await installProfile(page, profile);
	await page.getByRole('link', { name: message('home_play'), exact: true }).click();
	await page.getByRole('button', { name: profile.name }).click();
	await expect(heading(page, message('play_map_title'))).toBeVisible();
}

async function openIntro(page: Page, lesson: Lesson) {
	await page.getByRole('button', { name: lesson.title }).click();
	await throughStory(page, heading(page, lesson.title));
}

async function startLesson(
	page: Page,
	lesson: Lesson,
	game = page.locator('button[data-proposed]')
) {
	await openIntro(page, lesson);
	await game.click();
	await expect(field(page)).toBeFocused();
}

async function currentGroup(page: Page): Promise<string> {
	const label = groupLabel(page);
	await expect(label).toHaveText(GROUP_LABEL);
	return GROUP_LABEL.exec((await label.textContent()) ?? '')?.groups?.['text'] ?? '';
}

/** Types the group on screen, then passes its reward with a key, up to the next group. */
async function typeGroupAndGoOn(page: Page, group: string) {
	await page.keyboard.type(group);
	await expect(groupLabel(page)).toHaveText(GROUP_DONE);
	await expect(async () => {
		await page.keyboard.press(SKIP_KEY);
		await expect(groupLabel(page)).toHaveText(GROUP_LABEL, { timeout: 500 });
	}).toPass();
}

/**
 * Types whole groups until one holds `char`, then that group up to it. Returns how many characters
 * of the group on screen are typed.
 */
async function typeUpTo(page: Page, char: string): Promise<number> {
	for (let played = 0; played < GROUP_BUDGET; played++) {
		const group = await currentGroup(page);
		const graphemes = toGraphemes(group);
		const position = graphemes.indexOf(char);
		if (position >= 0) {
			await page.keyboard.type(graphemes.slice(0, position).join(''));
			await expect(doneCells(page)).toHaveCount(position);
			return position;
		}
		await typeGroupAndGoOn(page, group);
	}
	throw new Error(`No group holds ${char} within ${GROUP_BUDGET} groups`);
}

/** Types every group up to the result; `beforeGroup` runs before each of them. */
async function typeToResult(page: Page, beforeGroup: () => Promise<void>) {
	const result = button(page, message('play_result_map'));
	const finale = button(page, message('game_shared_finale_continue'));
	for (;;) {
		await beforeGroup();
		await page.keyboard.type(await currentGroup(page));
		await page.keyboard.press(SKIP_KEY);
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
	if (await finale.isVisible()) await finale.click();
	await expect(result).toBeVisible();
}

function scrollTop(page: Page): Promise<number> {
	return page.evaluate(() => window.scrollY);
}

async function expectOpenedAtTop(page: Page) {
	await expect.poll(() => scrollTop(page)).toBe(0);
}

async function scrollFarDown(page: Page) {
	await page.evaluate((top) => window.scrollTo(0, top), FAR_DOWN);
}

async function expectNoAxeViolation(page: Page) {
	await page.evaluate(() => document.fonts.ready);
	const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
	expect(results.violations).toEqual([]);
}

/** A message whose parameters may hold anything. */
function anyParams(key: string, names: readonly string[]): RegExp {
	const filled = message(key, Object.fromEntries(names.map((name) => [name, ANYTHING])));
	const escaped = filled.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`^${escaped.replaceAll(ANYTHING, '.+')}$`, 's');
}

test.beforeEach(async ({ page }) => {
	await shortenRewards(page);
});

test.describe('Tab during a game', () => {
	test('goes to Pause, says how to go on, and gives the next letter back to the game', async ({
		page
	}) => {
		await reachMapFromHome(page, childBefore(FIRST));
		await startLesson(page, FIRST);
		const group = await currentGroup(page);
		const graphemes = toGraphemes(group);
		await expect(keepTypingNotice(page)).toHaveCount(0);

		await page.keyboard.press('Tab');
		await expect(pauseButton(page)).toBeFocused();
		await expect(keepTypingNotice(page)).toHaveText(message('game_shared_keep_typing'));
		await expect(announcement(page)).toHaveText(message('game_shared_keep_typing'));

		await page.keyboard.type(graphemes[0] ?? '');
		await expect(doneCells(page)).toHaveCount(1);
		await expect(field(page)).toBeFocused();
		await expect(keepTypingNotice(page)).toHaveCount(0);

		// Shift + Tab goes its way too, and the letter after it is not lost either.
		await page.keyboard.press('Shift+Tab');
		await expect(pauseButton(page)).toBeFocused();
		await page.keyboard.type(graphemes[1] ?? '');
		await expect(doneCells(page)).toHaveCount(2);
		await expect(field(page)).toBeFocused();

		// No trap: Tab is never held back, and from Pause it comes back to the field.
		await page.keyboard.press('Tab');
		await expect(pauseButton(page)).toBeFocused();
		await page.keyboard.press('Tab');
		await expect(field(page)).toBeFocused();
		await expect(doneCells(page)).toHaveCount(2);
	});

	test('leaves Enter and Space to the Pause button', async ({ page }) => {
		await reachMapFromHome(page, childBefore(FIRST));
		await startLesson(page, FIRST);
		await currentGroup(page);

		await page.keyboard.press('Tab');
		await expect(pauseButton(page)).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(pauseDialog(page)).toBeVisible();
		await expect(doneCells(page)).toHaveCount(0);
		await button(page, message('game_shared_resume')).click();
		await expect(field(page)).toBeFocused();

		await page.keyboard.press('Tab');
		await page.keyboard.press('Space');
		await expect(pauseDialog(page)).toBeVisible();
	});

	test('composes a letter with a dead key pressed after Tab', async ({ page }) => {
		await reachMapFromHome(page, childBefore(CIRCUMFLEX));
		await startLesson(page, CIRCUMFLEX);
		const position = await typeUpTo(page, CIRCUMFLEX_LETTER);

		await page.keyboard.press('Tab');
		await expect(pauseButton(page)).toBeFocused();
		// What a French keyboard sends for the circumflex: a key that writes nothing by itself...
		await page.evaluate((code) => {
			document.activeElement?.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'Dead', code, bubbles: true, cancelable: true })
			);
		}, DEAD_KEY_CODE);
		await expect(field(page)).toBeFocused();
		// ...then the composed letter, written by the next key.
		await page.keyboard.insertText(CIRCUMFLEX_LETTER);

		await expect(doneCells(page)).toHaveCount(position + 1);
		await expect(page.locator('.target-text [data-error]')).toHaveCount(0);
	});

	test('takes the key of the keyboard check wherever the focus is', async ({ page }) => {
		await openPage(page, '/jouer');
		await button(page, message('play_new_player')).click();
		await page.getByLabel(message('play_new_label')).fill(PLAYER_NAME);
		await button(page, message('play_new_submit')).click();
		await button(page, message('play_check_continue')).click();
		const wayOut = page.locator('[data-screen-back] button');
		const notFound = button(page, message('play_check_not_found'));
		// Tab from the field goes to the way out; Shift + Tab goes to the button just before it.
		const leaveField = [
			{ press: 'Tab', lands: wayOut },
			{ press: 'Shift+Tab', lands: notFound },
			{ press: 'Tab', lands: wayOut }
		];

		for (const [index, key] of CHECK_KEYS.entries()) {
			await expect(heading(page, message('play_check_prompt', { key: key.label }))).toBeVisible();
			await expect(page.locator('#keyboard-check-input')).toBeFocused();
			// A character the simulated keyboard has no key for is written as text: no key to take.
			const leave = leaveField[index % leaveField.length];
			if (key.pressable && leave) {
				await page.keyboard.press(leave.press);
				await expect(leave.lands).toBeFocused();
			}
			await answerCheckKey(page, key, 'same');
		}

		await expect(heading(page, message('play_check_ok_title'))).toBeVisible();
	});

	test('takes a letter pressed on the button of a key that is not found, and keeps Space for the button', async ({
		page
	}) => {
		const notFound = button(page, message('play_check_not_found'));
		const [first, second, third] = CHECK_KEYS;
		await openPage(page, '/jouer');
		await button(page, message('play_new_player')).click();
		await page.getByLabel(message('play_new_label')).fill(PLAYER_NAME);
		await button(page, message('play_new_submit')).click();
		await button(page, message('play_check_continue')).click();
		await expect(
			heading(page, message('play_check_prompt', { key: first?.label ?? '' }))
		).toBeVisible();

		// A letter typed while the focus is on the button is the answer, not lost.
		await notFound.focus();
		await page.keyboard.press(first?.letter ?? '');
		await expect(
			heading(page, message('play_check_prompt', { key: second?.label ?? '' }))
		).toBeVisible();
		await expect(page.locator('#keyboard-check-input')).toBeFocused();

		// Space on the button presses the button: the key is skipped, nothing is typed.
		await notFound.focus();
		await page.keyboard.press('Space');
		await expect(
			heading(page, message('play_check_prompt', { key: third?.label ?? '' }))
		).toBeVisible();
		await expect(page.locator('#keyboard-check-input')).toBeFocused();
		await expect(page.locator('#keyboard-check-input')).toHaveValue('');
	});
});

test.describe('the Back button of the browser', () => {
	test('leads from the lesson screen to the map, and from the map to the home page', async ({
		page
	}) => {
		await reachMapFromHome(page, childBefore(SECOND));
		await openIntro(page, SECOND);

		await page.goBack();
		await expect(heading(page, message('play_map_title'))).toBeVisible();
		await expect(page).toHaveURL(PLAY_URL);

		await page.goBack();
		await expect(page).toHaveURL(HOME_URL);
		await expect(page.getByRole('link', { name: message('home_play'), exact: true })).toBeVisible();
	});

	test('leaves the map in one press once a lesson was opened and closed with its own button', async ({
		page
	}) => {
		await reachMapFromHome(page, childBefore(SECOND));
		await openIntro(page, SECOND);
		await button(page, message('play_intro_back')).click();
		await expect(heading(page, message('play_map_title'))).toBeVisible();

		await page.goBack();

		await expect(page).toHaveURL(HOME_URL);
		await expect(page.getByRole('link', { name: message('home_play'), exact: true })).toBeVisible();
	});

	test('opens the pause of a game, which goes on at the same character', async ({ page }) => {
		await reachMapFromHome(page, childBefore(FIRST));
		await startLesson(page, FIRST);
		const group = await currentGroup(page);
		const first = toGraphemes(group)[0] ?? '';
		await page.keyboard.type(first);
		await expect(doneCells(page)).toHaveCount(1);

		await page.goBack();
		await expect(pauseDialog(page)).toBeVisible();
		await expect(page).toHaveURL(PLAY_URL);

		// Pressed again, Back changes nothing: the game waits for the child on its pause.
		await page.goBack();
		await expect(pauseDialog(page)).toBeVisible();
		await expect(page).toHaveURL(PLAY_URL);

		// Even a jump over the route in the history does not lose the game.
		await page.evaluate(() => history.go(-2));
		await expect(page.getByRole('link', { name: message('home_play'), exact: true })).toHaveCount(
			0
		);
		await expect(pauseDialog(page)).toBeVisible();
		await expect(page).toHaveURL(PLAY_URL);

		// From the settings opened over the pause, Back closes them, as their button does.
		await button(page, message('play_settings_open')).click();
		await expect(heading(page, message('settings_title'))).toBeVisible();
		await page.goBack();
		await expect(pauseDialog(page)).toBeVisible();

		await button(page, message('game_shared_resume')).click();
		await expect(field(page)).toBeFocused();
		await expect(doneCells(page)).toHaveCount(1);
		await page.keyboard.type(group.slice(first.length));
		await expect(groupLabel(page)).toHaveText(GROUP_DONE);

		// The child quits with the button of the pause; the map then leaves in one press.
		await page.keyboard.press('Escape');
		await button(page, message('game_shared_quit')).click();
		await expect(heading(page, message('play_map_title'))).toBeVisible();
		await page.goBack();
		await expect(page).toHaveURL(HOME_URL);
	});

	test('plays nothing again with Forward, and tells again a story left before its end', async ({
		page
	}) => {
		await reachMapFromHome(page, childBefore(FIRST));
		const lesson = page.getByRole('button', { name: FIRST.title });
		const proceed = page.locator('[data-story-continue]');

		// The opening of the first world is told on the way to its first lesson.
		await lesson.click();
		await expect(proceed).toBeVisible();
		await page.goBack();
		await expect(heading(page, message('play_map_title'))).toBeVisible();

		await page.goForward();
		await expect(heading(page, message('play_map_title'))).toBeVisible();
		await expect(proceed).toHaveCount(0);
		await expect(page).toHaveURL(PLAY_URL);

		await lesson.click();
		await expect(proceed).toBeVisible();
		await throughStory(page, heading(page, FIRST.title));
		await page.goBack();
		await expect(heading(page, message('play_map_title'))).toBeVisible();
	});
});

test.describe('every screen', () => {
	test('opens at its top, whatever the screen before was scrolled to', async ({ page }) => {
		await page.setViewportSize(LAPTOP);
		await reachMapFromHome(page, childBefore(SECOND));

		// The map and the screens that offer games are left out: they bring the lesson to play, or
		// the games, into view themselves.
		const opened: [open: string, title: string, close: string][] = [
			['play_story_so_far_open', 'play_story_so_far_title', 'play_story_so_far_back'],
			['play_companion_open', 'play_companion_title', 'play_companion_back'],
			['play_hideout_open', 'play_hideout_title', 'play_hideout_back'],
			['play_settings_open', 'settings_title', 'settings_back']
		];
		for (const [open, title, close] of opened) {
			await scrollFarDown(page);
			expect(await scrollTop(page)).toBeGreaterThan(0);
			await button(page, message(open)).dispatchEvent('click');
			await expect(heading(page, message(title))).toBeVisible();
			await expectOpenedAtTop(page);
			await button(page, message(close)).click();
			await expect(heading(page, message('play_map_title'))).toBeVisible();
		}

		// The game, from a lesson screen scrolled to its bottom.
		await openIntro(page, SECOND);
		await scrollFarDown(page);
		await page.locator('button[data-proposed]').dispatchEvent('click');
		await expect(field(page)).toBeFocused();
		await expectOpenedAtTop(page);

		// The result, from a game scrolled as far as it goes.
		await typeToResult(page, () => scrollFarDown(page));
		await expectOpenedAtTop(page);
	});
});

test.describe('a screen reader', () => {
	test('hears Floup ask and what to erase first, from the one live region of the game', async ({
		page
	}) => {
		await reachMapFromHome(page, childBefore(REPAIR));
		await startLesson(page, REPAIR, button(page, message('game_dialogue_play')));
		await expect(groupLabel(page)).toHaveText(GROUP_ERASE);

		await expect(announcement(page)).toHaveText(
			anyParams('game_dialogue_announce_question_repair', ['question', 'text', 'char'])
		);
		await expect(page.getByRole('status')).toHaveCount(1);
	});
});

test.describe('keeps playing, accessibility', () => {
	test('has no axe violation on a game whose field lost the focus', async ({ page }) => {
		await reachMapFromHome(page, childBefore(FIRST));
		await startLesson(page, FIRST);
		await currentGroup(page);
		await page.keyboard.press('Tab');
		await expect(keepTypingNotice(page)).toBeVisible();

		await expectNoAxeViolation(page);
	});

	test('has no axe violation on the steps and the two results of the keyboard check', async ({
		page
	}) => {
		await openPage(page, '/jouer');
		await installProfile(page, { ...childBefore(FIRST), calibrated: false });
		await reloadPage(page);
		await page.getByRole('button', { name: PLAYER_NAME }).click();
		await expect(heading(page, message('play_check_title'))).toBeVisible();
		await expectNoAxeViolation(page);

		await button(page, message('play_check_continue')).click();
		const [first] = CHECK_KEYS;
		await expect(
			heading(page, message('play_check_prompt', { key: first?.label ?? '' }))
		).toBeVisible();
		await expectNoAxeViolation(page);

		// The keys write other letters, twice: the second result asks for an adult.
		for (const attempt of [1, 2]) {
			for (const key of CHECK_KEYS) {
				await expect(heading(page, message('play_check_prompt', { key: key.label }))).toBeVisible();
				// The key drawn with its two characters.
				if (!key.pressable) await expectNoAxeViolation(page);
				await answerCheckKey(page, key, 'different');
			}
			await expect(heading(page, message('play_check_diff_title'))).toBeVisible();
			await expect(page.getByText(message('play_check_diff_adult'))).toHaveCount(attempt - 1);
			await expectNoAxeViolation(page);
			await button(page, message('play_check_retry')).click();
		}

		for (const key of CHECK_KEYS) {
			await expect(heading(page, message('play_check_prompt', { key: key.label }))).toBeVisible();
			await answerCheckKey(page, key, 'same');
		}
		await expect(heading(page, message('play_check_ok_title'))).toBeVisible();
		await expectNoAxeViolation(page);
	});
});
