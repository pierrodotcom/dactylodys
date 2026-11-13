import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { toGraphemes } from '../src/lib/engine/graphemes';
import type { StarCount } from '../src/lib/engine/progression/types';
import type { ErrorPolicy } from '../src/lib/engine/types';
import { updateSettings } from '../src/lib/state/profile';
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
 * The lesson of repairs (ADR-057, proposal 10, end of the useful texts): groups arrive begun, with
 * a mistake already written at their end. The child erases it with Backspace, then types the rest,
 * whatever the adult chose for Backspace; the drawn keyboard lights Backspace meanwhile.
 */

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const LINE_BREAK = String.fromCharCode(10);
const PLAYER_NAME = 'Lou';
const PASSED_STARS: StarCount = 2;
const STEP_TIMEOUT = 15_000;
const POLICIES: readonly ErrorPolicy[] = ['retry', 'backspace'];

interface Lesson {
	id: string;
	title: string;
	repair?: unknown;
}

const { message, templateRegex } = loadMessages();
const lessons = readJson<{ worlds: { lessons: Lesson[] }[] }>(
	'content/fr/progression/azerty-decouverte.json'
).worlds.flatMap((world) => world.lessons);
const REPAIR_LESSON = lessons.find((lesson) => lesson.repair !== undefined) as Lesson;
const GROUP_LABEL = templateRegex('ui_target_text_label');
const GROUP_ERASE = templateRegex('ui_target_text_erase');

/** A child who passed every lesson before the lesson of repairs, that of @ included. */
function child(errorPolicy: ErrorPolicy): Profile {
	const index = lessons.findIndex((lesson) => lesson.id === REPAIR_LESSON.id);
	const passed = Object.fromEntries(
		lessons.slice(0, index).map((lesson) => [lesson.id, PASSED_STARS])
	);
	return updateSettings(advancedProfile({ name: PLAYER_NAME, passed }), { errorPolicy });
}

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function groupLabel(page: Page): Locator {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

function cells(page: Page, state: 'done' | 'wrong'): Locator {
	return page.locator(`.target-text .cell[data-state="${state}"]`);
}

function resultButton(page: Page) {
	return button(page, message('play_result_map'));
}

function finaleButton(page: Page) {
	return button(page, message('game_shared_finale_continue'));
}

async function startLesson(page: Page, errorPolicy: ErrorPolicy) {
	await openPage(page, '/jouer');
	await installProfile(page, child(errorPolicy));
	await reloadPage(page);
	await button(page, PLAYER_NAME).click();
	await expect(
		page.getByRole('heading', { level: 1, name: message('play_map_title') })
	).toBeVisible();
	await page.getByRole('button', { name: REPAIR_LESSON.title }).click();
	await throughStory(page, page.getByRole('heading', { level: 1, name: REPAIR_LESSON.title }), {
		keyboard: true
	});
	await page.locator('button[data-proposed]').click();
	await expect(page.locator('#game-input')).toBeFocused();
}

/** The group on screen: its text, the graphemes already written right and the wrong ones after. */
async function currentGroup(page: Page) {
	const label = groupLabel(page);
	await expect(label).toHaveText(new RegExp(`${GROUP_LABEL.source}|${GROUP_ERASE.source}`, 's'));
	const text = (await label.textContent()) ?? '';
	const begun = GROUP_ERASE.test(text);
	const group = (begun ? GROUP_ERASE : GROUP_LABEL).exec(text)?.groups?.['text'] ?? '';
	return {
		group,
		typed: begun ? await cells(page, 'done').count() : 0,
		pending: begun ? await cells(page, 'wrong').count() : 0
	};
}

/** Types graphemes, Enter for a line break. */
async function typeText(page: Page, graphemes: readonly string[]) {
	for (const part of graphemes.join('').split(LINE_BREAK).entries()) {
		const [index, line] = part;
		if (index > 0) await page.keyboard.press('Enter');
		if (line !== '') await page.keyboard.type(line);
	}
}

async function waitForNext(page: Page, group: string) {
	await expect(async () => {
		const ended = (await resultButton(page).isVisible()) || (await finaleButton(page).isVisible());
		const label = (await groupLabel(page).allTextContents()).join('');
		const shown =
			GROUP_ERASE.exec(label)?.groups?.['text'] ?? GROUP_LABEL.exec(label)?.groups?.['text'];
		expect(ended || (shown !== undefined && shown !== group)).toBe(true);
	}).toPass({ timeout: STEP_TIMEOUT });
}

/** Plays the lesson to its result, erasing each planted mistake first; returns how many there were. */
async function playToResult(page: Page): Promise<number> {
	let repaired = 0;
	for (;;) {
		const { group, typed, pending } = await currentGroup(page);
		if (pending > 0) {
			await expect(page.locator('.key[data-code="Backspace"]')).toHaveAttribute(
				'data-target',
				'true'
			);
			for (let i = 0; i < pending; i++) await page.keyboard.press('Backspace');
			await expect(cells(page, 'wrong')).toHaveCount(0);
			repaired += 1;
		}
		await typeText(page, toGraphemes(group).slice(typed));
		await waitForNext(page, group);
		if (await finaleButton(page).isVisible()) {
			await finaleButton(page).click();
			await expect(resultButton(page)).toBeVisible();
		}
		if (await resultButton(page).isVisible()) break;
	}
	return repaired;
}

test.beforeEach(async ({ page }) => {
	await shortenRewards(page);
});

test.describe('the lesson of repairs', () => {
	for (const errorPolicy of POLICIES) {
		test(`erases the planted mistakes, then types the rest, up to the result (${errorPolicy})`, async ({
			page
		}) => {
			await startLesson(page, errorPolicy);
			const repaired = await playToResult(page);

			expect(repaired).toBeGreaterThan(0);
			await expect(resultButton(page)).toBeVisible();
		});
	}

	test('takes no right key before the mistake is erased', async ({ page }) => {
		await startLesson(page, 'retry');
		const { group, typed, pending } = await currentGroup(page);
		expect(pending).toBeGreaterThan(0);
		const expected = toGraphemes(group)[typed] ?? '';

		await page.keyboard.type(expected);

		await expect(cells(page, 'wrong')).toHaveCount(pending + 1);
		await expect(cells(page, 'done')).toHaveCount(typed);
		for (let i = 0; i <= pending; i++) await page.keyboard.press('Backspace');
		await expect(cells(page, 'wrong')).toHaveCount(0);
		await page.keyboard.type(expected);
		await expect(cells(page, 'done')).toHaveCount(typed + 1);
	});

	test('has no axe violation on a group to repair', async ({ page }) => {
		await startLesson(page, 'retry');
		const { pending } = await currentGroup(page);
		expect(pending).toBeGreaterThan(0);
		await page.evaluate(() => document.fonts.ready);
		const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
		expect(results.violations).toEqual([]);
	});
});
