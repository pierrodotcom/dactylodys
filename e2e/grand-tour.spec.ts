import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import type { StarCount } from '../src/lib/engine/progression/types';
import type { Profile } from '../src/lib/state/types';
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
	throughResult,
	throughStory
} from './support';

/*
 * The grand tour of a world (ADR-075, choice 3): at the end of the world, open once its way is
 * passed, never proposed, played like a lesson and rewarded by a stamp once its keys are tamed.
 */

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const STEP_TIMEOUT = 15_000;
const PASSED_STARS: StarCount = 2;

interface Lesson {
	id: string;
	title: string;
	intro: string;
	optional?: boolean;
	tour?: { worldId: string };
}

interface World {
	id: string;
	title: string;
	lessons: Lesson[];
}

interface Reward {
	id: string;
	title: string;
	condition: { kind: string; lessonId?: string };
}

const { message, templateRegex } = loadMessages();
const worlds = readJson<{ worlds: World[] }>(
	'content/fr/progression/azerty-decouverte.json'
).worlds;
const rewards = readJson<{ rewards: Reward[] }>(
	'content/fr/rewards/azerty-decouverte.json'
).rewards;
const [DINOS, KITCHEN] = worlds as [World, World];
const TOUR = DINOS.lessons.find((lesson) => lesson.tour !== undefined) as Lesson;
const WAY = DINOS.lessons.filter((lesson) => lesson.optional !== true);
const LAST_DINO = WAY.at(-1) as Lesson;
const FIRST_KITCHEN = KITCHEN.lessons[0] as Lesson;
const STAMP = rewards.find(
	(reward) => reward.condition.kind === 'tour-mastered' && reward.condition.lessonId === TOUR.id
) as Reward;
const GROUP_LABEL = templateRegex('ui_target_text_label');

function child(name: string, passed: readonly Lesson[]): Profile {
	return advancedProfile({
		name,
		passed: Object.fromEntries(passed.map((lesson) => [lesson.id, PASSED_STARS]))
	});
}

function row(page: Page, lesson: Lesson): Locator {
	return page.getByRole('listitem').filter({ hasText: lesson.title });
}

function lessonButton(page: Page, lesson: Lesson): Locator {
	return row(page, lesson).getByRole('button');
}

function groupLabel(page: Page): Locator {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

function mapHeading(page: Page): Locator {
	return page.getByRole('heading', { name: message('play_map_title') });
}

async function reachMap(page: Page, profile: Profile) {
	await openPage(page, '/jouer');
	await installProfile(page, profile);
	await reloadPage(page);
	await page.getByRole('button', { name: profile.name }).click();
	await expect(mapHeading(page)).toBeVisible();
}

/** Types every group at the keyboard until the result, its steps passed with Tab and Enter. */
async function typeToResult(page: Page) {
	const finale = page.getByRole('button', { name: message('game_shared_finale_continue') });
	const toMap = page.getByRole('button', { name: message('play_result_map') });
	for (;;) {
		const label = groupLabel(page);
		await expect(label).toHaveText(GROUP_LABEL);
		await page.keyboard.type(
			GROUP_LABEL.exec((await label.textContent()) ?? '')?.groups?.['text'] ?? ''
		);
		let over = false;
		await expect(async () => {
			over = (await toMap.isVisible()) || (await finale.isVisible());
			const next = (await groupLabel(page).allTextContents()).some((text) =>
				GROUP_LABEL.test(text)
			);
			expect(over || next).toBe(true);
		}).toPass({ timeout: STEP_TIMEOUT });
		if (over) break;
	}
	if (await finale.isVisible()) {
		await expect(finale).toBeFocused();
		await page.keyboard.press('Enter');
	}
	await throughResult(page, { keyboard: true });
}

test.beforeEach(async ({ page }) => {
	await setRewards(page, 'instant');
});

test.describe('the grand tour of a world (ADR-075, choice 3)', () => {
	test(
		'is opened and played to its result at the keyboard alone by a child who finished the world',
		CHROMIUM_ONLY,
		async ({ page }) => {
			await reachMap(page, child('Tao', WAY));

			// Never proposed: the companion waits at the first lesson of the next world.
			await expect(lessonButton(page, FIRST_KITCHEN)).toBeFocused();
			// At the end of its world, without a number, saying what it is and the stamp to win.
			const tour = row(page, TOUR);
			await expect(tour).toContainText(message('play_lesson_tour'));
			await expect(tour).toContainText(message('play_lesson_tour_open'));
			await expect(tour).toContainText(message('play_tour_prize'));
			await expect(tour).not.toContainText(/Leçon \d/);

			await page.keyboard.press('ArrowUp');
			await expect(lessonButton(page, TOUR)).toBeFocused();
			await page.keyboard.press('Enter');
			// No story: the tour goes over a world already told.
			await expect(page.getByRole('heading', { name: TOUR.title })).toBeVisible();
			await expect(page.getByText(TOUR.intro)).toBeVisible();
			await expect(page.getByText(message('play_lesson_tour'), { exact: true })).toBeVisible();
			await expect(page.locator('[data-prize]')).toContainText(STAMP.title);
			await expect(page.locator('button[data-proposed]')).toBeFocused();
			await page.keyboard.press('Enter');
			await expect(page.locator('#game-input')).toBeFocused();

			await typeToResult(page);
			await expect(page.locator('[data-result-step="result"]')).toBeVisible();
			// The way goes on after the tour: the next lesson is the first one of the next world.
			await expect(page.getByRole('button', { name: message('play_result_next') })).toBeVisible();
			await page.keyboard.press('Escape');
			await expect(mapHeading(page)).toBeVisible();
			await expect(row(page, TOUR)).toContainText(message('play_lesson_done'));
			await expect(lessonButton(page, FIRST_KITCHEN)).toBeFocused();
		}
	);

	test(
		'is said once by the result of the lesson that ends the world, never proposed by it',
		CHROMIUM_ONLY,
		async ({ page }) => {
			await reachMap(page, child('Noa', WAY.slice(0, -1)));
			await expect(row(page, TOUR)).toContainText(message('play_lesson_locked'));

			await lessonButton(page, LAST_DINO).click();
			await throughStory(page, page.getByRole('heading', { name: LAST_DINO.title }));
			await page.locator('button[data-proposed]').click();
			await typeToResult(page);

			await expect(page.locator('[data-tour-open]')).toHaveText(message('play_result_tour_open'));
			await page.getByRole('button', { name: message('play_result_next') }).click();
			// "Next lesson" goes on to the next world, through the end of the story of this one.
			await throughStory(page, page.getByRole('heading', { name: FIRST_KITCHEN.title }));
		}
	);

	test('passes axe on the map with an open grand tour, light and dark themes', async ({ page }) => {
		await reachMap(page, child('Lia', WAY));
		await page.keyboard.press('ArrowUp');
		await expect(lessonButton(page, TOUR)).toBeFocused();

		await expectNoAxeViolation(page);
	});
});
