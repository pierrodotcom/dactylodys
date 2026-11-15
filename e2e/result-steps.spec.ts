import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { parsePhraseBank, parseTextBank, parseWordBank } from '../src/lib/engine/progression/banks';
import { parseProgression } from '../src/lib/engine/progression/definition';
import { generateExercise } from '../src/lib/engine/progression/exercise';
import { aidedContext } from '../src/lib/engine/progression/support';
import { seededRng } from '../src/lib/engine/progression/test-support';
import type { StarCount } from '../src/lib/engine/progression/types';
import { parseWordLimitRules, wordLimits } from '../src/lib/engine/progression/word-limits';
import { parseRewardCatalogue } from '../src/lib/engine/rewards';
import { withCompanion, withEarnedRewards } from '../src/lib/state/profile';
import type { Profile } from '../src/lib/state/types';
import {
	advancedProfile,
	installProfile,
	loadMessages,
	openPage,
	readJson,
	reloadPage,
	shortenRewards,
	storedRecord,
	throughResult,
	throughStory
} from './support';

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;
/** A laptop screen, and the room a browser really leaves on a laptop of 1366 × 768 (audit E-03). */
const SCREENS = [
	{ width: 1280, height: 720 },
	{ width: 1366, height: 625 }
] as const;
const PASSED_STARS: StarCount = 3;
const PRESS_BUDGET = 40;
const STEP_TIMEOUT = 15_000;
/** A letter no lesson of the first world asks for. */
const WRONG_KEY = 'x';
/** Enough mistakes to stay well under the accuracy that opens the next lesson. */
const MANY_MISTAKES = 20;
/** The hand shows a key that is not new only after this long in a play that is not aided. */
const BEFORE_HESITATION_MS = 1500;
const COMPANION_NAME = 'Pistache';
const AIDED_SEED = 7;
const KEYS_TOKEN = 'KEYSTOKEN';

interface Lesson {
	id: string;
	title: string;
	newChars: string[];
}

interface World {
	id: string;
	themeId: string;
	gameIds: string[];
	lessons: Lesson[];
}

const { message, plural, templateRegex } = loadMessages();
const progressionData = readJson<{ worlds: World[] }>(
	'content/fr/progression/azerty-decouverte.json'
);
const progression = parseProgression(progressionData);
const worlds = progressionData.worlds;
const allLessons = worlds.flatMap((world) => world.lessons);
const world = worlds[0] as World;
const [FIRST, SECOND] = world.lessons as [Lesson, Lesson];
/** The first lesson with words: the hand shows only its new keys in a play that is not aided. */
const WORDS_LESSON = world.lessons[4] as Lesson;
const catalogue = parseRewardCatalogue(readJson('content/fr/rewards/azerty-decouverte.json'));
const resultRules = readJson<{ support: { afterFailedPlays: number } }>(
	'content/common/result-rules.json'
);
const playRules = readJson<{ sessionLengths: { normal: { clockMinutes: number } } }>(
	'content/common/play-rules.json'
);

const GROUP_LABEL = templateRegex('ui_target_text_label');
const CONSOLIDATE = new RegExp(
	`^${message('play_result_consolidate', { keys: KEYS_TOKEN })
		.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		.replace(KEYS_TOKEN, '.+')}$`
);

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function groupLabel(page: Page): Locator {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

function step(page: Page, kind: 'reward' | 'name' | 'result'): Locator {
	return page.locator(`[data-result-step="${kind}"]`);
}

/** The picture of the progress of a game: it names the game being played. */
function progressPicture(page: Page, gameId: string): Locator {
	const text = plural(`game_${gameId}_progress`, 0, {
		hatched: 0,
		reached: 0,
		done: 0,
		total: KEYS_TOKEN
	});
	const pattern = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(KEYS_TOKEN, '\\d+');
	return page.getByRole('img', { name: new RegExp(`^${pattern}$`) });
}

function passedThrough(lesson: Lesson): Record<string, StarCount> {
	const until = allLessons.findIndex((item) => item.id === lesson.id);
	return Object.fromEntries(allLessons.slice(0, until + 1).map((item) => [item.id, PASSED_STARS]));
}

async function reachMapAs(page: Page, profile: Profile) {
	await openPage(page, '/jouer');
	await installProfile(page, profile);
	await reloadPage(page);
	await page.getByRole('button', { name: profile.name }).click();
	await expect(heading(page, message('play_map_title'))).toBeVisible();
}

async function openLesson(page: Page, lesson: Lesson) {
	await page.getByRole('button', { name: lesson.title }).click();
	await throughStory(page, heading(page, lesson.title));
}

async function currentGroup(page: Page): Promise<string> {
	const label = groupLabel(page);
	await expect(label).toHaveText(GROUP_LABEL);
	return GROUP_LABEL.exec((await label.textContent()) ?? '')?.groups?.['text'] ?? '';
}

/** Types every group up to the first step of the result; `mistakes` wrong keys before the first group. */
async function typeToResult(page: Page, mistakes = 0): Promise<string[]> {
	const groups: string[] = [];
	const finale = button(page, message('game_shared_finale_continue'));
	const anyStep = page.locator('[data-result-step]');
	for (let index = 0; ; index++) {
		const group = await currentGroup(page);
		if (index === 0) {
			for (let mistake = 0; mistake < mistakes; mistake++) await page.keyboard.press(WRONG_KEY);
		}
		await page.keyboard.type(group);
		groups.push(group);
		await page.keyboard.press('Enter');
		const found: { over?: boolean } = {};
		await expect(async () => {
			if ((await anyStep.isVisible()) || (await finale.isVisible())) found.over = true;
			else if ((await groupLabel(page).allTextContents()).some((text) => GROUP_LABEL.test(text)))
				found.over = false;
			expect(found.over).toBeDefined();
		}).toPass({ timeout: STEP_TIMEOUT });
		if (found.over) break;
	}
	if (await finale.isVisible()) await finale.click();
	await expect(anyStep).toBeVisible();
	return groups;
}

async function focusByTab(page: Page, target: Locator) {
	await expect(target).toBeVisible();
	for (let press = 0; press < PRESS_BUDGET; press++) {
		if (await target.evaluate((element) => element === document.activeElement)) return;
		await page.keyboard.press('Tab');
	}
	throw new Error('The element cannot be reached with the Tab key');
}

async function activateByTab(page: Page, target: Locator) {
	await focusByTab(page, target);
	await page.keyboard.press('Enter');
}

/** Everything the step shows is on the screen as it opens, without scrolling. */
async function expectWholeStepInView(page: Page, kind: 'reward' | 'name' | 'result') {
	const current = step(page, kind);
	await expect(current).toBeVisible();
	await page.evaluate(() => document.fonts.ready);
	expect(await page.evaluate(() => scrollY)).toBe(0);
	await expect(page.locator('main h1')).toBeInViewport({ ratio: 1 });
	await expect(page.locator('[data-screen-back] button')).toBeInViewport({ ratio: 1 });
	const parts = 'button, input, [role="img"], svg.companion, figure, li, p';
	for (const element of await current.locator(parts).all()) {
		if (!(await element.isVisible())) continue;
		await expect(element).toBeInViewport({ ratio: 1 });
	}
}

async function expectNoAxeViolation(page: Page) {
	await page.evaluate(() => document.fonts.ready);
	const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
	expect(results.violations).toEqual([]);
}

/** A child who has passed the first lesson, holds what it earned and named the companion. */
function veteran(name: string): Profile {
	const passed = advancedProfile({ name, passed: passedThrough(FIRST) });
	const necklace = catalogue.rewards.find(
		(reward) => reward.condition.kind === 'lesson-passed' && reward.condition.lessonId === FIRST.id
	);
	return withCompanion(withEarnedRewards(passed, necklace ? [necklace.id] : []), {
		name: COMPANION_NAME,
		colorId: null,
		wornItemIds: []
	});
}

test.beforeEach(async ({ page }) => {
	await shortenRewards(page);
});

test.describe('result in steps', () => {
	test('passes the three steps of a first lesson won with an item, with the keyboard alone, up to the next lesson', async ({
		page
	}) => {
		const child = advancedProfile({ name: 'Nova', passed: {} });
		await reachMapAs(page, child);
		await openLesson(page, FIRST);
		await page.locator('button[data-proposed]').click();
		await typeToResult(page);

		// 1. The item, alone: its title has the focus, « Le mettre » then « Continuer ».
		await expect(step(page, 'reward')).toBeVisible();
		await expect(heading(page, message('play_reward_new'))).toBeFocused();
		await expect(step(page, 'name')).toHaveCount(0);
		await expect(step(page, 'result')).toHaveCount(0);
		await activateByTab(page, button(page, message('play_reward_wear')));
		await expect(page.getByText(message('play_reward_worn'))).toBeVisible();
		await expect(page.locator('[data-reward-wearer] svg.companion')).toHaveAttribute(
			'data-items',
			/./
		);
		await expect(button(page, message('play_result_continue'))).toBeFocused();
		await page.keyboard.press('Enter');

		// 2. The name, alone.
		await expect(step(page, 'name')).toBeVisible();
		await expect(heading(page, message('play_reward_name_question'))).toBeFocused();
		await focusByTab(page, page.getByLabel(message('play_companion_name_label')));
		await page.keyboard.type(COMPANION_NAME);
		await page.keyboard.press('Enter');
		await expect(
			page.getByText(message('play_companion_named', { name: COMPANION_NAME }))
		).toBeVisible();
		await expect(button(page, message('play_result_continue'))).toBeFocused();
		await page.keyboard.press('Enter');

		// 3. The result: stars, one sentence, three facts, and what comes next.
		await expect(step(page, 'result')).toBeVisible();
		await expect(heading(page, message('play_result_headline_3'))).toBeFocused();
		await expect(page.locator('[data-result-step="result"] .facts li').first()).toBeVisible();
		await page.keyboard.press('Tab');
		await expect(page.locator('[data-screen-back] button')).toBeFocused();
		await activateByTab(page, button(page, message('play_result_next')));
		await throughStory(page, heading(page, SECOND.title), { keyboard: true });
	});

	test('shows one step only when a lesson passed again wins nothing new', async ({ page }) => {
		await reachMapAs(page, veteran('Lou'));
		await openLesson(page, FIRST);
		await page.locator('button[data-proposed]').click();
		await typeToResult(page);

		await expect(step(page, 'result')).toBeVisible();
		await expect(page.locator('[data-result-step]')).toHaveCount(1);
		await expect(heading(page, message('play_result_headline_3'))).toBeFocused();
		await expect(button(page, message('play_result_next'))).toBeVisible();
	});

	test('takes the way back to the map from a step, with Escape as with the button at the top', async ({
		page
	}) => {
		await reachMapAs(page, advancedProfile({ name: 'Sam', passed: {} }));
		await openLesson(page, FIRST);
		await page.locator('button[data-proposed]').click();
		await typeToResult(page);
		await expect(step(page, 'reward')).toBeVisible();
		await expect(page.locator('[data-screen-back] button')).toHaveText(message('play_result_map'));

		await page.keyboard.press('Escape');
		await expect(heading(page, message('play_map_title'))).toBeVisible();
	});

	test('proposes one more play to tame the new keys, plays it with another game, and keeps the next lesson open', async ({
		page
	}) => {
		await reachMapAs(page, advancedProfile({ name: 'Ali', passed: {} }));
		await openLesson(page, FIRST);
		const firstGame = (await page.locator('button[data-proposed]').getAttribute('data-game')) ?? '';
		await page.locator('button[data-proposed]').click();
		await typeToResult(page);
		await throughResult(page);

		// One play is too few for the new keys: one more is proposed first, nothing is locked.
		const tame = page.locator('[data-result-replay]');
		await expect(tame).toHaveAccessibleName(CONSOLIDATE);
		await expect(tame).toHaveAttribute('data-variant', 'primary');
		await expect(tame.locator('kbd').first()).toBeVisible();
		const next = button(page, message('play_result_next'));
		await expect(next).toBeEnabled();
		await expect(next).toHaveAttribute('data-variant', 'secondary');
		await expect(button(page, message('play_result_replay'))).toHaveCount(0);

		await tame.click();
		await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
		await expect(progressPicture(page, firstGame)).toHaveCount(0);
		const others = world.gameIds.filter((gameId) => gameId !== firstGame);
		await expect(
			progressPicture(page, others[0] ?? '').or(progressPicture(page, others[1] ?? ''))
		).toBeVisible();
		await typeToResult(page);
		await throughResult(page);
		await expect(button(page, message('play_result_next'))).toBeVisible();
	});

	test('aids the play that follows two plays under the threshold: every key shown, simplest words, another game', async ({
		page
	}) => {
		// Three whole plays of a lesson.
		test.slow();
		const child = advancedProfile({
			name: 'Eli',
			passed: passedThrough(world.lessons[3] as Lesson)
		});
		await reachMapAs(page, child);
		await openLesson(page, WORDS_LESSON);
		await page.locator('button[data-proposed]').click();

		// Plays far under the threshold: the result proposes to play again, more gently.
		const plays = resultRules.support.afterFailedPlays;
		for (let play = 1; play <= plays; play++) {
			await typeToResult(page, MANY_MISTAKES);
			await expect(step(page, 'result')).toBeVisible();
			await expect(page.getByText(message('play_result_retry'))).toBeVisible();
			await expect(button(page, message('play_result_next'))).toHaveCount(0);
			await expect
				.poll(async () => ((await storedRecord(page, child)) as unknown as Profile).sessions.length)
				.toBe(play);
			if (play < plays) await button(page, message('play_result_replay')).click();
		}

		// The aided play: the exercise of the simplest words, never one that grew with the pace.
		const stored = (await storedRecord(page, child)) as unknown as Profile;
		const lastGame = stored.lastGameByWorld[WORDS_LESSON.id] ?? '';
		const rules = parseWordLimitRules(readJson('content/common/play-rules.json'), 'playRules');
		const expected = generateExercise(
			progression,
			WORDS_LESSON.id,
			seededRng(AIDED_SEED),
			aidedContext(
				{
					words: parseWordBank(readJson('content/fr/words/base.json')),
					phrases: parsePhraseBank(readJson('content/fr/phrases/base.json')),
					texts: parseTextBank(readJson('content/fr/texts/base.json')),
					progress: stored.progress,
					themeId: world.themeId,
					...wordLimits(rules, progression, WORDS_LESSON.id, stored.settings.ageBand),
					ageBand: stored.settings.ageBand,
					paces: [90, 90, 90, 90, 90]
				},
				readJson<{ support: Parameters<typeof aidedContext>[1] }>(
					'content/common/result-rules.json'
				).support
			)
		);
		await page.evaluate(
			([source, value]) => {
				Math.random = new Function(`return (${source})`)()(value);
			},
			[seededRng.toString(), AIDED_SEED] as const
		);
		await button(page, message('play_result_replay')).click();
		await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
		// Another game than the last one played.
		await expect(progressPicture(page, lastGame)).toHaveCount(0);

		// Every key is shown at once, not only the new ones: a key that is not new, before any wait.
		const shown = page.locator('.keyboard [data-hand-guide] [data-active]');
		const notNew = (char: string) => /\p{L}/u.test(char) && !WORDS_LESSON.newChars.includes(char);
		const typed: string[] = [];
		const finale = button(page, message('game_shared_finale_continue'));
		let checked = false;
		for (;;) {
			const group = await currentGroup(page);
			const graphemes = [...group];
			const at = checked ? -1 : graphemes.findIndex((char, index) => index > 0 && notNew(char));
			if (at > 0) {
				await page.keyboard.type(graphemes.slice(0, at).join(''));
				await expect(shown).toHaveCount(1, { timeout: BEFORE_HESITATION_MS });
				await page.keyboard.type(graphemes.slice(at).join(''));
				checked = true;
			} else {
				await page.keyboard.type(group);
			}
			typed.push(group);
			await page.keyboard.press('Enter');
			const found: { over?: boolean } = {};
			await expect(async () => {
				if ((await page.locator('[data-result-step]').isVisible()) || (await finale.isVisible()))
					found.over = true;
				else if ((await groupLabel(page).allTextContents()).some((text) => GROUP_LABEL.test(text)))
					found.over = false;
				expect(found.over).toBeDefined();
			}).toPass({ timeout: STEP_TIMEOUT });
			if (found.over) break;
		}
		expect(checked).toBe(true);
		expect(typed).toEqual(expected.groups);
	});

	for (const screen of SCREENS) {
		test(`keeps each step in view without scrolling at ${screen.width} × ${screen.height}`, async ({
			page
		}) => {
			await page.setViewportSize(screen);
			await reachMapAs(page, advancedProfile({ name: 'Lou', passed: {} }));
			await openLesson(page, FIRST);
			await page.locator('button[data-proposed]').click();
			await typeToResult(page);

			await expectWholeStepInView(page, 'reward');
			await button(page, message('play_reward_wear')).click();
			await expectWholeStepInView(page, 'reward');
			await button(page, message('play_result_continue')).click();
			await expectWholeStepInView(page, 'name');
			await button(page, COMPANION_NAME).click();
			await expectWholeStepInView(page, 'name');
			await button(page, message('play_result_continue')).click();
			await expectWholeStepInView(page, 'result');
			await expect(page.locator('[data-result-replay]')).toHaveAccessibleName(CONSOLIDATE);
		});

		test(`keeps the result with a break in view without scrolling at ${screen.width} × ${screen.height}`, async ({
			page
		}) => {
			// A whole play, its item, then the result: as long as the other tests of a play.
			test.slow();
			await page.clock.install();
			await page.setViewportSize(screen);
			await reachMapAs(page, veteran('Lou'));
			await openLesson(page, SECOND);
			await page.locator('button[data-proposed]').click();
			const group = await currentGroup(page);
			await page.keyboard.type(group.slice(0, 1));
			await page.clock.fastForward(`${playRules.sessionLengths.normal.clockMinutes + 1}:00`);
			await page.keyboard.type(group.slice(1));
			await page.keyboard.press('Enter');
			await typeToResult(page);
			await throughResult(page);

			await expect(button(page, message('play_break_button'))).toBeVisible();
			await expectWholeStepInView(page, 'result');
		});
	}
});

for (const colorScheme of COLOR_SCHEMES) {
	test.describe(`result in steps, ${colorScheme} theme`, () => {
		test.use({ colorScheme });

		test('has no axe violation on the item, the name and the result', async ({ page }) => {
			test.slow();
			await reachMapAs(page, advancedProfile({ name: 'Lou', passed: {} }));
			await openLesson(page, FIRST);
			await page.locator('button[data-proposed]').click();
			await typeToResult(page);

			await expect(step(page, 'reward')).toBeVisible();
			await expectNoAxeViolation(page);
			await button(page, message('play_reward_wear')).click();
			await expect(page.getByText(message('play_reward_worn'))).toBeVisible();
			await expectNoAxeViolation(page);
			await button(page, message('play_result_continue')).click();
			await expect(step(page, 'name')).toBeVisible();
			await expectNoAxeViolation(page);
			await button(page, message('play_companion_name_submit')).click();
			await expect(page.getByRole('alert')).toHaveText(message('play_companion_name_error_empty'));
			await expectNoAxeViolation(page);
			await button(page, COMPANION_NAME).click();
			await expect(
				page.getByText(message('play_companion_named', { name: COMPANION_NAME }))
			).toBeVisible();
			await expectNoAxeViolation(page);
			await button(page, message('play_result_continue')).click();
			await expect(step(page, 'result')).toBeVisible();
			await expectNoAxeViolation(page);
		});

		test('has no axe violation on the result of a play under the threshold', async ({ page }) => {
			await reachMapAs(page, advancedProfile({ name: 'Lou', passed: {} }));
			await openLesson(page, FIRST);
			await page.locator('button[data-proposed]').click();
			await typeToResult(page, MANY_MISTAKES);

			await expect(step(page, 'result')).toBeVisible();
			await expect(page.getByText(message('play_result_retry'))).toBeVisible();
			await expectNoAxeViolation(page);
		});
	});
}
