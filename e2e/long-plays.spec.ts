import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { seededRng } from '../src/lib/engine/progression/test-support';
import { withGhost } from '../src/lib/state/profile';
import type { Profile, SessionRecord } from '../src/lib/state/types';
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
 * Plays that last (ADR-075, choice 4): a child whose latest plays were fast gets a longer play, by
 * whole groups, never anything said about speed. It is played to the result with the keyboard in
 * two games, and the game stays in view on a laptop screen, race included.
 */

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const LAPTOP = { width: 1280, height: 720 } as const;
const SKIP_KEY = 'Enter';
/** Time given to a reward to give way to the next group or to the result. */
const STEP_TIMEOUT = 15_000;
const PLAYER_NAME = 'Lou';
/** Correct characters per minute of the latest plays: a fast child, as the journal measures it. */
const FAST_PACE = 70;
/** Any seed: the exercise of the page is then the same at every run. */
const SEED = 7;
const TOTAL_TOKEN = '__total__';

interface Lesson {
	id: string;
	title: string;
	groupCount: number;
}
interface World {
	id: string;
	gameIds: string[];
	lessons: Lesson[];
}

const { message, plural, templateRegex } = loadMessages();
const progression = readJson<{
	rules: { maxGroupCount: number; paceRecentPlays: number };
	worlds: World[];
}>('content/fr/progression/azerty-decouverte.json');
const [DINOSAURS, KITCHEN] = progression.worlds as [World, World];
const LESSON = KITCHEN.lessons[0] as Lesson;
const GROUP_LABEL = templateRegex('ui_target_text_label');
const [RACING_GAME, OTHER_GAME] = ['tower', 'river'];

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function groupLabel(page: Page): Locator {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

function finaleButton(page: Page) {
	return button(page, message('game_shared_finale_continue'));
}

/** The name of the picture of the progress of a game, with the total of groups captured. */
function progressPattern(gameId: string, done: number): RegExp {
	const text = plural(`game_${gameId}_progress`, done, { done, total: TOTAL_TOKEN });
	const escaped = text
		.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		.replace(TOTAL_TOKEN, '(?<total>\\d+)');
	return new RegExp(`^${escaped}$`);
}

/** How many groups the exercise of the game on screen holds. */
async function groupTotal(page: Page, gameId: string): Promise<number> {
	const picture = page.getByRole('img', { name: progressPattern(gameId, 0) });
	await expect(picture).toBeVisible();
	const label = (await picture.getAttribute('aria-label')) ?? '';
	return Number(progressPattern(gameId, 0).exec(label)?.groups?.['total']);
}

async function currentGroup(page: Page): Promise<string> {
	const label = groupLabel(page);
	await expect(label).toHaveText(GROUP_LABEL);
	return GROUP_LABEL.exec((await label.textContent()) ?? '')?.groups?.['text'] ?? '';
}

/** Waits until the next group is on screen or the exercise is over. */
async function nextStep(page: Page): Promise<'group' | 'over'> {
	const found: { step?: 'group' | 'over' } = {};
	await expect(async () => {
		const ended =
			(await button(page, message('play_result_map')).isVisible()) ||
			(await finaleButton(page).isVisible());
		if (ended) {
			found.step = 'over';
		} else if ((await groupLabel(page).allTextContents()).some((text) => GROUP_LABEL.test(text))) {
			found.step = 'group';
		}
		expect(found.step).toBeDefined();
	}).toPass({ timeout: STEP_TIMEOUT });
	return found.step ?? 'over';
}

/** Types every group, from the one on screen, until the result; gives the groups typed. */
async function typeToResult(page: Page): Promise<string[]> {
	const typed: string[] = [];
	for (;;) {
		const group = await currentGroup(page);
		await page.keyboard.type(group);
		typed.push(group);
		await page.keyboard.press(SKIP_KEY);
		if ((await nextStep(page)) === 'over') break;
	}
	if (await finaleButton(page).isVisible()) await finaleButton(page).click();
	await expect(button(page, message('play_result_map'))).toBeVisible();
	return typed;
}

/** Makes the exercises of the page the same at every run. */
async function seedExercises(page: Page) {
	await page.evaluate(
		([source, value]) => {
			Math.random = new Function(`return (${source})`)()(value);
		},
		[seededRng.toString(), SEED] as const
	);
}

/**
 * Lou has passed the first world and the first lesson of the kitchen, and her latest plays were
 * fast; a slow ghost of that lesson waits for a race, so that the race stays on screen to the end.
 */
function fastChild(): Profile {
	const passed = Object.fromEntries(
		[...DINOSAURS.lessons, LESSON].map((lesson) => [lesson.id, 2 as const])
	);
	const child = advancedProfile({ name: PLAYER_NAME, passed });
	const now = Date.now();
	const sessions = Array.from(
		{ length: progression.rules.paceRecentPlays },
		(_, index): SessionRecord => ({
			lessonId: LESSON.id,
			gameId: OTHER_GAME,
			finishedAt: now - (progression.rules.paceRecentPlays - index) * 60_000,
			utcOffsetMinutes: 0,
			durationMs: 60_000,
			totalKeystrokes: FAST_PACE,
			correctKeystrokes: FAST_PACE,
			errorCount: 0,
			accuracy: 100,
			correctCharsPerMinute: FAST_PACE,
			stars: 3,
			passed: true,
			speedRule: 2
		})
	);
	return withGhost({ ...child, sessions }, LESSON.id, {
		recordedAt: 1,
		charCount: 20,
		activeMs: 600_000,
		points: [{ correctChars: 20, activeMs: 600_000 }]
	});
}

async function openLesson(page: Page) {
	await page.getByRole('button', { name: LESSON.title }).click();
	await throughStory(page, heading(page, LESSON.title));
	await seedExercises(page);
}

test.use({ viewport: LAPTOP });

test.beforeEach(async ({ page }) => {
	await shortenRewards(page);
});

test('gives a fast child a longer play, typed to the result in two games, the game in view', async ({
	page
}) => {
	test.slow();
	await openPage(page, '/jouer');
	await installProfile(page, fastChild());
	await reloadPage(page);
	await button(page, PLAYER_NAME).click();
	await expect(heading(page, message('play_map_title'))).toBeVisible();

	// The tower, the widest row of progress, with the race above the game.
	await openLesson(page);
	await page.getByRole('checkbox', { name: new RegExp(message('play_intro_race')) }).check();
	await button(page, message(`game_${RACING_GAME}_play`)).click();
	await expect(page.locator('#game-input')).toBeFocused();
	const total = await groupTotal(page, RACING_GAME);
	expect(total).toBeGreaterThan(LESSON.groupCount);
	expect(total).toBeLessThanOrEqual(progression.rules.maxGroupCount);
	await expect(page.locator('[data-ghost-track]')).toBeInViewport({ ratio: 1 });
	await expect(page.locator('.text-zone')).toBeInViewport({ ratio: 1 });
	expect(await typeToResult(page)).toHaveLength(total);

	// Another game of the same lesson, as long.
	await button(page, message('play_result_map')).click();
	await throughStory(page, heading(page, message('play_map_title')));
	await openLesson(page);
	await button(page, message(`game_${OTHER_GAME}_play`)).click();
	await expect(page.locator('#game-input')).toBeFocused();
	const otherTotal = await groupTotal(page, OTHER_GAME);
	expect(otherTotal).toBeGreaterThan(LESSON.groupCount);
	await expect(page.locator('.text-zone')).toBeInViewport({ ratio: 1 });
	await expect(page.locator('.keyboard')).toBeInViewport({ ratio: 1 });
	expect(await typeToResult(page)).toHaveLength(otherTotal);
});
