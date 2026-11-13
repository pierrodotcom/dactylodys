import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { parseTextBank, textOf } from '../src/lib/engine/progression/banks';
import type { StarCount } from '../src/lib/engine/progression/types';
import type { Profile } from '../src/lib/state/types';
import {
	advancedProfile,
	installProfile,
	loadMessages,
	openPage,
	readJson,
	reloadPage,
	shortenRewards,
	throughStory
} from './support';

/**
 * The digits and @ (ADR-057, proposal 10, second part): at the end of the world of useful texts,
 * the child types hours, scores, dates and invented addresses. The drawn keyboard lights Shift for
 * a digit and AltGr for @, as the layout says. Playwright types the characters with its own
 * layout: what is checked is the character produced and what the keyboard shows.
 */

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const LINE_BREAK = String.fromCharCode(10);
const PLAYER_NAME = 'Lou';
const PASSED_STARS: StarCount = 2;
const STEP_TIMEOUT = 15_000;

interface Lesson {
	id: string;
	title: string;
	newChars: string[];
	warmUp?: string[];
}
interface World {
	id: string;
	lessons: Lesson[];
}
interface LayoutKey {
	base?: unknown;
	shift?: unknown;
	altgr?: unknown;
}

const { message, templateRegex } = loadMessages();
const lessons = readJson<{ worlds: World[] }>(
	'content/fr/progression/azerty-decouverte.json'
).worlds.flatMap((world) => world.lessons);
const texts = parseTextBank(readJson('content/fr/texts/base.json'));
const layoutKeys = readJson<{ keys: Record<string, LayoutKey> }>(
	'layouts/fr-fr-azerty-pc.json'
).keys;
const GROUP_LABEL = templateRegex('ui_target_text_label');

const DIGITS_LESSON = lessons.find((lesson) => lesson.newChars.includes('1')) as Lesson;
const AT_LESSON = lessons.find((lesson) => lesson.newChars.includes('@')) as Lesson;

/** The key that gives a character on the layout of the profile, and the level it is on. */
function keyOf(char: string): { code: string; level: 'base' | 'shift' | 'altgr' } {
	for (const [code, key] of Object.entries(layoutKeys)) {
		for (const level of ['base', 'shift', 'altgr'] as const) {
			if (key[level] === char) return { code, level };
		}
	}
	throw new Error(`No key gives "${char}"`);
}

/** A child who passed every lesson before this one. */
function childBefore(lesson: Lesson): Profile {
	const index = lessons.findIndex((candidate) => candidate.id === lesson.id);
	const passed = Object.fromEntries(
		lessons.slice(0, index).map((candidate) => [candidate.id, PASSED_STARS])
	);
	return advancedProfile({ name: PLAYER_NAME, passed });
}

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function groupLabel(page: Page): Locator {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

function resultButton(page: Page) {
	return button(page, message('play_result_map'));
}

function gameKey(page: Page, code: string): Locator {
	return page.locator(`.keyboard .key[data-code="${code}"]`);
}

async function startLesson(page: Page, lesson: Lesson) {
	await openPage(page, '/jouer');
	await installProfile(page, childBefore(lesson));
	await reloadPage(page);
	await button(page, PLAYER_NAME).click();
	await expect(
		page.getByRole('heading', { level: 1, name: message('play_map_title') })
	).toBeVisible();
	await page.getByRole('button', { name: lesson.title }).click();
	await throughStory(page, page.getByRole('heading', { level: 1, name: lesson.title }), {
		keyboard: true
	});
	await page.locator('button[data-proposed]').click();
	await expect(page.locator('#game-input')).toBeFocused();
}

async function currentGroup(page: Page): Promise<string> {
	const label = groupLabel(page);
	await expect(label).toHaveText(GROUP_LABEL);
	return GROUP_LABEL.exec((await label.textContent()) ?? '')?.groups?.['text'] ?? '';
}

async function typeGroup(page: Page, group: string) {
	if (group.at(-1) === LINE_BREAK) {
		await page.keyboard.type(group.slice(0, -1));
		await page.keyboard.press('Enter');
	} else {
		await page.keyboard.type(group);
	}
}

function finaleButton(page: Page) {
	return button(page, message('game_shared_finale_continue'));
}

async function waitForNext(page: Page, group: string) {
	await expect(async () => {
		// Some games close on a finale of their own before the result.
		const ended = (await resultButton(page).isVisible()) || (await finaleButton(page).isVisible());
		const label = (await groupLabel(page).allTextContents()).join('');
		const moved = GROUP_LABEL.test(label) && GROUP_LABEL.exec(label)?.groups?.['text'] !== group;
		expect(ended || moved).toBe(true);
	}).toPass({ timeout: STEP_TIMEOUT });
}

/** Plays the lesson up to its result; checks the key and its modifier for the first new key. */
async function playToResult(page: Page, lesson: Lesson, modifier: 'shift' | 'altgr') {
	const typed: string[] = [];
	let checked = false;
	for (;;) {
		const group = await currentGroup(page);
		const first = [...group][0] ?? '';
		if (!checked && lesson.newChars.includes(first)) {
			const { code, level } = keyOf(first);
			expect(level).toBe(modifier);
			await expect(gameKey(page, code)).toHaveAttribute('data-target', 'true');
			const modifiers = page.locator('.keyboard .key[data-modifier]');
			await expect(modifiers).toHaveCount(1);
			const modifierCode = await modifiers.getAttribute('data-code');
			expect(modifierCode).toMatch(modifier === 'shift' ? /^Shift(Left|Right)$/ : /^AltRight$/);
			checked = true;
		}
		await typeGroup(page, group);
		typed.push(group);
		await waitForNext(page, group);
		if (await finaleButton(page).isVisible()) {
			await finaleButton(page).click();
			await expect(resultButton(page)).toBeVisible();
		}
		if (await resultButton(page).isVisible()) break;
	}
	expect(checked).toBe(true);
	return typed;
}

test.beforeEach(async ({ page }) => {
	await shortenRewards(page);
});

test.describe('the digits and @', () => {
	test('plays the lesson of the digits with Shift, from its warm-up to the result', async ({
		page
	}) => {
		await startLesson(page, DIGITS_LESSON);
		const typed = await playToResult(page, DIGITS_LESSON, 'shift');

		await expect(resultButton(page)).toBeVisible();
		expect(typed.slice(0, DIGITS_LESSON.warmUp?.length)).toEqual(DIGITS_LESSON.warmUp);
		const first = texts.texts.find((entry) => entry.lessonId === DIGITS_LESSON.id);
		expect(first).toBeDefined();
		if (first) expect(typed.join('').endsWith(textOf(first))).toBe(true);
	});

	test('plays the lesson of @ with AltGr, up to an invented address and the result', async ({
		page
	}) => {
		await startLesson(page, AT_LESSON);
		const typed = await playToResult(page, AT_LESSON, 'altgr');

		await expect(resultButton(page)).toBeVisible();
		expect(typed.slice(0, AT_LESSON.warmUp?.length)).toEqual(AT_LESSON.warmUp);
		expect(typed.join('')).toMatch(/[a-z]+@exemple\.(org|com)/);
	});

	test('has no axe violation on the game of the digits lesson', async ({ page }) => {
		await startLesson(page, DIGITS_LESSON);
		await currentGroup(page);
		await page.evaluate(() => document.fonts.ready);
		const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
		expect(results.violations).toEqual([]);
	});
});
