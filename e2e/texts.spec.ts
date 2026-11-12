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
 * The world of useful texts (ADR-057, proposal 10): after the fifth world, the child types short
 * texts of everyday life on several lines, with Enter between two lines.
 */

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const LINE_BREAK = String.fromCharCode(10);
const PLAYER_NAME = 'Lou';
const PASSED_STARS: StarCount = 2;
/** Time given to a reward to give way to the next group or to the result. */
const STEP_TIMEOUT = 15_000;

interface Lesson {
	id: string;
	title: string;
	newChars: string[];
}
interface World {
	id: string;
	title: string;
	lessons: Lesson[];
}

const { message, templateRegex } = loadMessages();
const worlds = readJson<{ worlds: World[] }>(
	'content/fr/progression/azerty-decouverte.json'
).worlds;
const texts = parseTextBank(readJson('content/fr/texts/base.json'));
const TEXT_WORLD = worlds.at(-1) as World;
const BEFORE = worlds.at(-2) as World;
const ENTER_LESSON = TEXT_WORLD.lessons[0] as Lesson;
/** The first play of a lesson ends with its first text (`dueText`). */
const FIRST_TEXT = texts.texts.find((entry) => entry.lessonId === ENTER_LESSON.id);
const GROUP_LABEL = templateRegex('ui_target_text_label');

function heading(page: Page, name: string, level = 1) {
	return page.getByRole('heading', { level, name });
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

function enterKey(page: Page): Locator {
	return page.locator('.keyboard .key[data-code="Enter"]');
}

/** A child who passed every lesson of the first five worlds. */
function childAfterFifthWorld(): Profile {
	const passed = Object.fromEntries(
		worlds
			.slice(0, -1)
			.flatMap((world) => world.lessons)
			.map((lesson) => [lesson.id, PASSED_STARS])
	);
	return advancedProfile({ name: PLAYER_NAME, passed });
}

async function reachMap(page: Page) {
	await openPage(page, '/jouer');
	await installProfile(page, childAfterFifthWorld());
	await reloadPage(page);
	await button(page, PLAYER_NAME).click();
	await expect(heading(page, message('play_map_title'))).toBeVisible();
}

async function startEnterLesson(page: Page) {
	await page.getByRole('button', { name: ENTER_LESSON.title }).click();
	await throughStory(page, heading(page, ENTER_LESSON.title), { keyboard: true });
	await page.locator('button[data-proposed]').click();
	await expect(page.locator('#game-input')).toBeFocused();
}

async function currentGroup(page: Page): Promise<string> {
	const label = groupLabel(page);
	await expect(label).toHaveText(GROUP_LABEL);
	return GROUP_LABEL.exec((await label.textContent()) ?? '')?.groups?.['text'] ?? '';
}

test.beforeEach(async ({ page }) => {
	await shortenRewards(page);
});

test.describe('the world of useful texts', () => {
	test('opens after the fifth world and plays its first lesson with Enter, up to the result', async ({
		page
	}) => {
		expect(ENTER_LESSON.newChars).toEqual([LINE_BREAK]);
		await reachMap(page);
		await expect(heading(page, TEXT_WORLD.title, 2)).toBeVisible();
		await expect(heading(page, BEFORE.title, 2)).toBeVisible();

		await page.getByRole('button', { name: ENTER_LESSON.title }).click();
		await throughStory(page, heading(page, ENTER_LESSON.title), { keyboard: true });
		// The new key of the lesson is Enter, shown on the keyboard of the lesson screen.
		await expect(enterKey(page)).toHaveAttribute('data-target', 'true');
		await page.locator('button[data-proposed]').click();
		await expect(page.locator('#game-input')).toBeFocused();

		const typed: string[] = [];
		for (;;) {
			const group = await currentGroup(page);
			if (group.at(-1) === LINE_BREAK) {
				const beforeEnter = group.slice(0, -1);
				await page.keyboard.type(beforeEnter);
				// Enter is the key to press now: the keyboard lights it and the hint names it.
				await expect(enterKey(page)).toHaveAttribute('data-target', 'true');
				await page.keyboard.press('Enter');
			} else {
				await page.keyboard.type(group);
			}
			typed.push(group);
			await expect(async () => {
				const ended = await resultButton(page).isVisible();
				// Never waits for the text zone: it is gone once the result is on screen.
				const label = (await groupLabel(page).allTextContents()).join('');
				const moved =
					GROUP_LABEL.test(label) && GROUP_LABEL.exec(label)?.groups?.['text'] !== group;
				expect(ended || moved).toBe(true);
			}).toPass({ timeout: STEP_TIMEOUT });
			if (await resultButton(page).isVisible()) break;
		}

		await expect(resultButton(page)).toBeVisible();
		const all = typed.join('');
		expect(all.split(LINE_BREAK).length - 1).toBeGreaterThanOrEqual(5);
		expect(FIRST_TEXT).toBeDefined();
		if (FIRST_TEXT) expect(all.endsWith(textOf(FIRST_TEXT))).toBe(true);
	});

	test('shows Enter at the end of its line, quieter than the letters, and the next line below', async ({
		page
	}) => {
		await reachMap(page);
		await startEnterLesson(page);

		for (;;) {
			const group = await currentGroup(page);
			const inside = group.slice(0, -1).includes(LINE_BREAK);
			if (inside) {
				const breaks = group.split(LINE_BREAK).length - 1;
				await expect(page.locator('.target-text [data-line-end]')).toHaveCount(breaks);
				const cells = page.locator('.target-text .cell');
				const firstLine = await cells.first().boundingBox();
				const secondLineStart = group.indexOf(LINE_BREAK) + 1;
				const secondLine = await cells.nth(secondLineStart).boundingBox();
				expect(secondLine?.y ?? 0).toBeGreaterThan(
					(firstLine?.y ?? 0) + (firstLine?.height ?? 0) / 2
				);
				// The symbol of Enter closes its line, on the same line as the word before it.
				const symbol = await cells.nth(secondLineStart - 1).boundingBox();
				expect(Math.abs((symbol?.y ?? 0) - (firstLine?.y ?? 0))).toBeLessThan(
					(firstLine?.height ?? 0) / 2
				);
				await expect(cells.nth(secondLineStart - 1)).toHaveText(message('ui_target_enter_symbol'));
				break;
			}
			await page.keyboard.type(group);
			await expect(async () => {
				const label = (await groupLabel(page).textContent()) ?? '';
				expect(GROUP_LABEL.exec(label)?.groups?.['text']).not.toBe(group);
				expect(label).toMatch(GROUP_LABEL);
			}).toPass({ timeout: STEP_TIMEOUT });
		}
	});

	test('has no axe violation on the game of a text lesson', async ({ page }) => {
		await reachMap(page);
		await startEnterLesson(page);
		let group = await currentGroup(page);
		// The text itself comes after the warm-up: play up to its first group of several lines.
		while (!group.slice(0, -1).includes(LINE_BREAK)) {
			await page.keyboard.type(group);
			await expect(async () => {
				const label = (await groupLabel(page).textContent()) ?? '';
				expect(GROUP_LABEL.exec(label)?.groups?.['text']).not.toBe(group);
				expect(label).toMatch(GROUP_LABEL);
			}).toPass({ timeout: STEP_TIMEOUT });
			group = await currentGroup(page);
		}
		await page.evaluate(() => document.fonts.ready);
		const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
		expect(results.violations).toEqual([]);
	});
});
