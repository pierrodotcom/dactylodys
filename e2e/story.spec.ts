import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { parseStory } from '../src/lib/engine/story';
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

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;
const PLAY_URL = '/jouer';
const PRESS_BUDGET = 80;
const STEP_TIMEOUT = 15_000;
const PASSED_STARS: StarCount = 3;

interface Lesson {
	id: string;
	title: string;
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
const story = parseStory(readJson('content/fr/story/azerty-decouverte.json'));
const [DINOS, KITCHEN] = worlds as [World, World];
const [TOLD_DINOS, TOLD_KITCHEN] = story.worlds as [
	(typeof story.worlds)[number],
	(typeof story.worlds)[number]
];
const FIRST = DINOS.lessons[0] as Lesson;
const SECOND = DINOS.lessons[1] as Lesson;
const LAST_DINO = DINOS.lessons.at(-1) as Lesson;
const FIRST_KITCHEN = KITCHEN.lessons[0] as Lesson;
const GROUP_LABEL = templateRegex('ui_target_text_label');

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function continueButton(page: Page) {
	return button(page, message('play_story_continue'));
}

function told(page: Page) {
	return page.locator('main figure[data-story-moment]');
}

function groupLabel(page: Page): Locator {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

function passed(lessons: readonly Lesson[]): Record<string, StarCount> {
	return Object.fromEntries(lessons.map((lesson) => [lesson.id, PASSED_STARS]));
}

async function reachMapAs(page: Page, profile: Profile) {
	await openPage(page, PLAY_URL);
	await installProfile(page, profile);
	await reloadPage(page);
	await page.getByRole('button', { name: profile.name }).click();
	await expect(heading(page, message('play_map_title'))).toBeVisible();
}

/**
 * `Shift+Tab` for what lies above the focus: Firefox leaves the page for its own interface after
 * the last element and does not come back (L-056).
 */
async function focusByTab(page: Page, target: Locator, key: 'Tab' | 'Shift+Tab' = 'Tab') {
	await expect(target).toBeVisible();
	for (let press = 0; press < PRESS_BUDGET; press++) {
		if (await target.evaluate((element) => element === document.activeElement)) return;
		await page.keyboard.press(key);
	}
	throw new Error(`The element cannot be reached with the ${key} key`);
}

async function currentGroup(page: Page): Promise<string> {
	const label = groupLabel(page);
	await expect(label).toHaveText(GROUP_LABEL);
	return GROUP_LABEL.exec((await label.textContent()) ?? '')?.groups?.['text'] ?? '';
}

/** Types every group without a mistake until the result. */
async function typeToResult(page: Page) {
	const finale = button(page, message('game_shared_finale_continue'));
	const end = button(page, message('play_result_map'));
	for (;;) {
		await page.keyboard.type(await currentGroup(page));
		await page.keyboard.press('Enter');
		const found: { over?: boolean } = {};
		await expect(async () => {
			if ((await end.isVisible()) || (await finale.isVisible())) found.over = true;
			else if ((await groupLabel(page).allTextContents()).some((text) => GROUP_LABEL.test(text)))
				found.over = false;
			expect(found.over).toBeDefined();
		}).toPass({ timeout: STEP_TIMEOUT });
		if (found.over) break;
	}
	if (await finale.isVisible()) await finale.click();
	await expect(end).toBeVisible();
}

/** The moment on screen: its picture and its sentence, then Enter on "Continue". */
async function expectToldThenContinue(page: Page, art: string, text: string, worldTitle: string) {
	await expect(told(page)).toHaveAttribute('data-art', art);
	await expect(told(page).locator(`[data-story-art="${art}"]`)).toBeAttached();
	await expect(told(page).getByText(text, { exact: true })).toBeVisible();
	await expect(heading(page, worldTitle)).toBeVisible();
	await expect(continueButton(page)).toBeFocused();
	await page.keyboard.press('Enter');
}

async function expectNoAxeViolation(page: Page) {
	await page.evaluate(() => document.fonts.ready);
	const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
	expect(results.violations).toEqual([]);
}

test.beforeEach(async ({ page }) => {
	await shortenRewards(page);
});

test.describe('the story between two exercises', () => {
	test('opens the first world, then tells the line of the passed lesson on the way to the next, with the keyboard alone', async ({
		page
	}) => {
		await reachMapAs(page, advancedProfile({ name: 'Noa', passed: {} }));

		await focusByTab(page, page.getByRole('button', { name: FIRST.title }));
		await page.keyboard.press('Enter');
		await expectToldThenContinue(page, TOLD_DINOS.openingArt, TOLD_DINOS.opening, DINOS.title);
		await expect(heading(page, FIRST.title)).toBeVisible();

		await page.locator('button[data-proposed]').click();
		await typeToResult(page);
		await expect(told(page)).toHaveCount(0);

		await focusByTab(page, button(page, message('play_result_next')));
		await page.keyboard.press('Enter');
		const line = TOLD_DINOS.lessons[0];
		await expectToldThenContinue(page, line?.art ?? '', line?.line ?? '', DINOS.title);
		await expect(heading(page, SECOND.title)).toBeVisible();
	});

	test('tells nothing more when a passed lesson is played again', async ({ page }) => {
		await reachMapAs(page, advancedProfile({ name: 'Eli', passed: passed([FIRST]) }));
		await page.getByRole('button', { name: FIRST.title }).click();
		await expect(heading(page, FIRST.title)).toBeVisible();
		await expect(told(page)).toHaveCount(0);

		await page.locator('button[data-proposed]').click();
		await typeToResult(page);
		await button(page, message('play_result_map')).click();
		await expect(heading(page, message('play_map_title'))).toBeVisible();
	});

	test('ends a world and opens the next one, after the line of its last lesson', async ({
		page
	}) => {
		test.slow();
		const before = DINOS.lessons.slice(0, -1);
		await reachMapAs(page, advancedProfile({ name: 'Sacha', passed: passed(before) }));
		await page.getByRole('button', { name: LAST_DINO.title }).click();
		await expect(heading(page, LAST_DINO.title)).toBeVisible();
		await page.locator('button[data-proposed]').click();
		await typeToResult(page);

		await button(page, message('play_result_next')).click();
		const line = TOLD_DINOS.lessons.at(-1);
		await expectToldThenContinue(page, line?.art ?? '', line?.line ?? '', DINOS.title);
		await expectToldThenContinue(page, TOLD_DINOS.endingArt, TOLD_DINOS.ending, DINOS.title);
		await expectToldThenContinue(
			page,
			TOLD_KITCHEN.openingArt,
			TOLD_KITCHEN.opening,
			KITCHEN.title
		);
		await expect(heading(page, FIRST_KITCHEN.title)).toBeVisible();
	});

	test('tells the line before the map, and before the game of a replay', async ({ page }) => {
		await reachMapAs(page, advancedProfile({ name: 'Ilan', passed: {} }));
		await page.getByRole('button', { name: FIRST.title }).click();
		await throughStory(page, heading(page, FIRST.title));
		await page.locator('button[data-proposed]').click();
		await typeToResult(page);

		await button(page, message('play_result_replay')).click();
		await expect(told(page)).toHaveAttribute('data-art', TOLD_DINOS.lessons[0]?.art ?? '');
		await continueButton(page).click();
		await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
	});
});

test.describe('the story so far', () => {
	test('shows a new child an empty notebook, and goes back to the map', async ({ page }) => {
		await reachMapAs(page, advancedProfile({ name: 'Lior', passed: {} }));
		await button(page, message('play_story_so_far_open')).click();
		await expect(heading(page, message('play_story_so_far_title'))).toBeVisible();
		await expect(page.getByText(message('play_story_so_far_empty'))).toBeVisible();
		await button(page, message('play_story_so_far_back')).click();
		await expect(heading(page, message('play_map_title'))).toBeVisible();
	});

	test('tells a child who passed lessons before the story what they already won, with the keyboard alone', async ({
		page
	}) => {
		await reachMapAs(
			page,
			advancedProfile({ name: 'Maé', passed: passed([...DINOS.lessons, FIRST_KITCHEN]) })
		);
		// The map opens with the focus on the proposed lesson, below the button of the story.
		await focusByTab(page, button(page, message('play_story_so_far_open')), 'Shift+Tab');
		await page.keyboard.press('Enter');
		await expect(heading(page, message('play_story_so_far_title'))).toBeVisible();

		const pages = page.locator('main section[aria-labelledby^="story-page-"]');
		await expect(pages).toHaveCount(2);
		await expect(pages.nth(0).getByRole('heading', { level: 2 })).toHaveText(DINOS.title);
		await expect(pages.nth(1).getByRole('heading', { level: 2 })).toHaveText(KITCHEN.title);
		const arts = await page
			.locator('main li[data-art]')
			.evaluateAll((items) => items.map((item) => item.getAttribute('data-art')));
		expect(arts).toEqual([
			TOLD_DINOS.openingArt,
			...TOLD_DINOS.lessons.map((line) => line.art),
			TOLD_DINOS.endingArt,
			TOLD_KITCHEN.openingArt,
			TOLD_KITCHEN.lessons[0]?.art
		]);
		await expect(page.getByText(TOLD_DINOS.ending, { exact: true })).toBeVisible();
		await expect(page.getByText(TOLD_KITCHEN.ending, { exact: true })).toHaveCount(0);

		await focusByTab(page, button(page, message('play_story_so_far_back')).first());
		await page.keyboard.press('Enter');
		await expect(heading(page, message('play_map_title'))).toBeVisible();
	});
});

test.describe('the story pages for developers', () => {
	test('draws every picture of the story', async ({ page }) => {
		await openPage(page, '/dev/recit');
		const moments = story.worlds.flatMap((world) => [
			world.openingArt,
			...world.lessons.map((line) => line.art),
			world.endingArt
		]);
		await expect(page.locator('li[data-art]')).toHaveCount(moments.length);
		for (const art of moments) {
			await expect(page.locator(`li[data-art="${art}"] [data-story-art="${art}"]`)).toBeAttached();
		}
	});
});

for (const colorScheme of COLOR_SCHEMES) {
	test.describe(`the story, ${colorScheme} theme`, () => {
		test.use({ colorScheme });

		test('has no axe violation on a moment of the story and on the story so far', async ({
			page
		}) => {
			await reachMapAs(page, advancedProfile({ name: 'Axel', passed: passed(DINOS.lessons) }));
			await button(page, message('play_story_so_far_open')).click();
			await expect(page.locator('main li[data-art]')).toHaveCount(DINOS.lessons.length + 2);
			await expectNoAxeViolation(page);

			await button(page, message('play_story_so_far_back')).first().click();
			await page.getByRole('button', { name: FIRST_KITCHEN.title }).click();
			await expect(told(page)).toHaveAttribute('data-art', TOLD_KITCHEN.openingArt);
			await expect(continueButton(page)).toBeFocused();
			await expectNoAxeViolation(page);
		});
	});
}
