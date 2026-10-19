import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import type { StarCount } from '../src/lib/engine/progression/types';
import type { Profile } from '../src/lib/state/types';
import {
	advancedProfile,
	installProfile,
	loadMessages,
	openPage,
	readJson,
	reloadPage,
	throughStory
} from './support';

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;
const PLAY_URL = '/jouer';
const PASSED_STARS: StarCount = 2;
/** How far, in pixels, the middle of the companion may sit from the middle of its lesson. */
const LEVEL_TOLERANCE = 2;

interface Lesson {
	id: string;
	title: string;
}

const { message } = loadMessages();
const worlds = readJson<{ worlds: { lessons: Lesson[] }[] }>(
	'content/fr/progression/azerty-decouverte.json'
).worlds;
const lessons = worlds.flatMap((world) => world.lessons);
const firstWorldSize = worlds[0]?.lessons.length ?? 0;
/** The whole first world and the first lesson of the second are passed: eight lessons are open. */
const PASSED = lessons.slice(0, firstWorldSize + 1);
const OPEN = lessons.slice(0, PASSED.length + 1);

function lessonAt(index: number): Lesson {
	const lesson = OPEN[index];
	if (!lesson) throw new Error(`No open lesson at ${index}`);
	return lesson;
}

const FIRST = lessonAt(0);
const PROPOSED = lessonAt(OPEN.length - 1);
const LAST_OF_FIRST_WORLD = lessonAt(firstWorldSize - 1);
const FIRST_OF_SECOND_WORLD = lessonAt(firstWorldSize);

function profileOf(name: string, edit: (profile: Profile) => Profile = (profile) => profile) {
	return edit(
		advancedProfile({
			name,
			passed: Object.fromEntries(PASSED.map((lesson) => [lesson.id, PASSED_STARS]))
		})
	);
}

async function reachMapAs(page: Page, profile: Profile) {
	await openPage(page, PLAY_URL);
	await installProfile(page, profile);
	await reloadPage(page);
	await page.getByRole('button', { name: profile.name }).click();
	await expect(page.getByRole('heading', { name: message('play_map_title') })).toBeVisible();
}

function lessonButton(page: Page, lesson: Lesson): Locator {
	return page.getByRole('listitem').filter({ hasText: lesson.title }).getByRole('button');
}

function walker(page: Page): Locator {
	return page.locator('[data-map-companion]');
}

/** The companion stands on this lesson: its stop is marked, and it is drawn level with it. */
async function expectCompanionOn(page: Page, lesson: Lesson) {
	const stop = page.locator('li[data-companion]');
	await expect(stop).toHaveCount(1);
	await expect(stop).toContainText(lesson.title);
	await expect
		.poll(async () => {
			const [own, beside] = await Promise.all([
				walker(page).boundingBox(),
				lessonButton(page, lesson).boundingBox()
			]);
			if (!own || !beside) return Infinity;
			return Math.abs(own.y + own.height / 2 - (beside.y + beside.height / 2));
		})
		.toBeLessThanOrEqual(LEVEL_TOLERANCE);
}

async function expectChosen(page: Page, lesson: Lesson) {
	await expect(lessonButton(page, lesson)).toBeFocused();
	await expectCompanionOn(page, lesson);
}

test.describe('map walked with the arrows', () => {
	test('opens on the proposed lesson, focused, with the companion beside it', async ({ page }) => {
		await reachMapAs(page, profileOf('Lumi'));

		await expectChosen(page, PROPOSED);
		await expect(walker(page)).toBeVisible();
		await expect(page.getByText(message('play_map_keys_hint'))).toHaveCount(1);
	});

	test('walks the focus and the companion with the arrows, from one world to the next', async ({
		page
	}) => {
		await reachMapAs(page, profileOf('Lumi'));

		await page.keyboard.press('ArrowLeft');
		await expectChosen(page, FIRST_OF_SECOND_WORLD);
		await page.keyboard.press('ArrowUp');
		await expectChosen(page, LAST_OF_FIRST_WORLD);
		await page.keyboard.press('ArrowRight');
		await expectChosen(page, FIRST_OF_SECOND_WORLD);
		await page.keyboard.press('ArrowDown');
		await expectChosen(page, PROPOSED);
	});

	test('steps over locked lessons and stops at the ends, Home and End going there', async ({
		page
	}) => {
		await reachMapAs(page, profileOf('Lumi'));

		await page.keyboard.press('ArrowRight');
		await expectChosen(page, PROPOSED);
		await page.keyboard.press('Home');
		await expectChosen(page, FIRST);
		await page.keyboard.press('ArrowLeft');
		await expectChosen(page, FIRST);
		await page.keyboard.press('End');
		await expectChosen(page, PROPOSED);
	});

	test('opens the lesson chosen with the arrows with Enter, and with Space', async ({ page }) => {
		const second = lessonAt(1);
		await reachMapAs(page, profileOf('Lumi'));

		await page.keyboard.press('Home');
		await page.keyboard.press('ArrowRight');
		await expectChosen(page, second);
		await page.keyboard.press('Enter');
		const title = page.getByRole('heading', { name: second.title });
		await throughStory(page, title, { keyboard: true });
		await expect(title).toBeVisible();

		await page.getByRole('button', { name: message('play_intro_back') }).click();
		await expectChosen(page, PROPOSED);
		await page.keyboard.press('ArrowLeft');
		await page.keyboard.press(' ');
		await throughStory(page, page.getByRole('heading', { name: FIRST_OF_SECOND_WORLD.title }));
	});

	test('puts the map in the Tab order once, on the lesson where the companion stands', async ({
		page
	}) => {
		await reachMapAs(page, profileOf('Lumi'));
		const reachable = page.locator('ol button[tabindex="0"]');
		await expect(reachable).toHaveCount(1);

		await page.keyboard.press('Home');
		await page.keyboard.press('ArrowRight');
		await page.keyboard.press('ArrowRight');
		const chosen = lessonAt(2);
		await expectChosen(page, chosen);
		await expect(reachable).toHaveCount(1);

		await page.keyboard.press('Shift+Tab');
		await expect(
			page.getByRole('button', { name: message('play_story_so_far_open') })
		).toBeFocused();
		await page.keyboard.press('Tab');
		await expectChosen(page, chosen);
		await page.keyboard.press('Tab');
		const leftTheMap = () =>
			page.evaluate(
				() => document.activeElement?.closest('ol') === null || !document.activeElement
			);
		await expect.poll(leftTheMap).toBe(true);
	});

	test('places the companion at once with calm motion, from the profile setting', async ({
		page
	}) => {
		await reachMapAs(
			page,
			profileOf('Calme', (profile) => ({
				...profile,
				settings: { ...profile.settings, motion: 'reduced' }
			}))
		);

		await expect(walker(page)).toHaveAttribute('data-still');
		await page.keyboard.press('Home');
		await expect(walker(page)).toHaveCSS('transition-property', 'none');
		await expectChosen(page, FIRST);
	});

	for (const colorScheme of COLOR_SCHEMES) {
		test(`passes axe with the walking companion and the key hint, ${colorScheme} theme`, async ({
			page
		}) => {
			await page.emulateMedia({ colorScheme });
			await reachMapAs(page, profileOf('Lumi'));
			await page.keyboard.press('ArrowLeft');
			await expectChosen(page, FIRST_OF_SECOND_WORLD);

			await page.evaluate(() => document.fonts.ready);
			const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
			expect(results.violations).toEqual([]);
		});
	}
});
