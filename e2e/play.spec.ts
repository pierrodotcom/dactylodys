import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { toGraphemes } from '../src/lib/engine/graphemes';
import {
	parsePhraseBank,
	parseWordBank,
	usablePhrases,
	usableWords
} from '../src/lib/engine/progression/banks';
import { learnedChars, parseProgression } from '../src/lib/engine/progression/definition';
import { generateExercise } from '../src/lib/engine/progression/exercise';
import { seededRng } from '../src/lib/engine/progression/test-support';
import type { ExerciseContext, StarCount } from '../src/lib/engine/progression/types';
import { MAX_NAME_LENGTH, MIN_NAME_LENGTH } from '../src/lib/state/profile';
import type { Profile } from '../src/lib/state/types';
import { LAST_PLAYER_KEY } from '../src/routes/jouer/last-player';
import {
	advancedProfile,
	installProfile,
	loadMessages,
	openPage,
	readJson,
	reloadPage
} from './support';

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;
const PLAY_URL = '/jouer';
const PLAYER_NAME = 'Mini';
const PRESS_BUDGET = 60;
/** A letter that no lesson of the first world asks for. */
const WRONG_KEY = 'x';
/** Enter is ignored while typing, and moves on to the next group while the reward is on screen. */
const SKIP_KEY = 'Enter';
/** Enough mistakes to lose at least one star whatever the length of the exercise. */
const FEW_MISTAKES = 5;
/** Enough mistakes to stay under the accuracy that opens the next lesson. */
const MANY_MISTAKES = 15;
/** Time given to a reward to give way to the next group or to the result. */
const STEP_TIMEOUT = 15_000;
const LAST_SEED = 500;
const PASSED_STARS: StarCount = 3;
const TOTAL_TOKEN = 'TOTALTOKEN';
/** The lessons of the first version of the progression, whose profiles must still open. */
const LEGACY_LESSON_STARS: Readonly<Record<string, StarCount>> = {
	'fr.lesson.oeufs-f-j': 3,
	'fr.lesson.saut-espace': 2,
	'fr.lesson.nid-d-k': 3,
	'fr.lesson.mare-s-l': 1,
	'fr.lesson.bras-q-m': 2,
	'fr.lesson.mots-e-i': 3
};

interface Lesson {
	id: string;
	title: string;
	intro: string;
	newChars: string[];
	words: string[];
	unlocks: string[];
}

interface World {
	id: string;
	title: string;
	themeId: string;
	gameIds: string[];
	lessons: Lesson[];
}

const { message, plural, templateRegex } = loadMessages();
const progressionData = readJson<{ worlds: World[] }>(
	'content/fr/progression/azerty-decouverte.json'
);
const progression = parseProgression(progressionData);
const wordBank = parseWordBank(readJson('content/fr/words/base.json'));
const phraseBank = parsePhraseBank(readJson('content/fr/phrases/base.json'));
const playRules = readJson<{
	breakAfterMinutes: number;
	maxWordLevel: 1 | 2 | 3;
	keyboardCheckCodes: string[];
}>('content/common/play-rules.json');
const azerty = readJson<{ keys: Record<string, { base?: string }> }>(
	'layouts/fr-fr-azerty-pc.json'
);

const worlds = progressionData.worlds;
const allLessons = worlds.flatMap((item) => item.lessons);
const world = worlds[0] ?? { id: '', title: '', themeId: '', gameIds: [], lessons: [] };
const [FIRST, SECOND] = world.lessons as [Lesson, Lesson];
const FIRST_GAME = world.gameIds[0] ?? '';
const NEXT_WORLD = worlds[1] ?? world;
const [NEXT_FIRST, NEXT_SECOND, NEXT_THIRD] = NEXT_WORLD.lessons as [Lesson, Lesson, Lesson];
const [DEFAULT_GAME = '', OTHER_GAME = ''] = NEXT_WORLD.gameIds;
const RECIPE = 'recipe';
const ROCKET = 'rocket';
const CHECK_KEYS = playRules.keyboardCheckCodes.map((code) => {
	const letter = azerty.keys[code]?.base ?? '';
	return { code, letter, label: letter.toLocaleUpperCase('fr') };
});

const GROUP_LABEL = templateRegex('ui_target_text_label');
const GROUP_DONE = templateRegex('ui_target_text_done');
const CAPITAL_SENTENCE = /^\p{Lu}.*[.?!]$/u;

function stars(count: number): string {
	return plural('ui_stars', count, { total: 3 });
}

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function lessonRow(page: Page, lesson: Lesson) {
	return page.getByRole('listitem').filter({ hasText: lesson.title });
}

function groupLabel(page: Page): Locator {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

function gameTitle(gameId: string): string {
	return message(`game_${gameId}_title`);
}

/** The name of the picture of the progress of a game, with the total of groups captured. */
function progressPattern(gameId: string, done: number): RegExp {
	const text = plural(`game_${gameId}_progress`, done, {
		hatched: done,
		reached: done,
		done,
		total: TOTAL_TOKEN
	});
	const escaped = text
		.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		.replace(TOTAL_TOKEN, '(?<total>\\d+)');
	return new RegExp(`^${escaped}$`);
}

function progressPicture(page: Page, gameId: string, done: number): Locator {
	return page.getByRole('img', { name: progressPattern(gameId, done) });
}

/** How many groups the exercise of the game on screen holds. */
async function groupTotal(page: Page, gameId: string): Promise<number> {
	const picture = progressPicture(page, gameId, 0);
	await expect(picture).toBeVisible();
	const label = (await picture.getAttribute('aria-label')) ?? '';
	return Number(progressPattern(gameId, 0).exec(label)?.groups?.['total']);
}

/** The lessons up to and including `lessonId`, as already passed. */
function passedThrough(lessonId: string): Record<string, StarCount> {
	const position = allLessons.findIndex((lesson) => lesson.id === lessonId);
	if (position < 0) throw new Error(`Unknown lesson: ${lessonId}`);
	return Object.fromEntries(
		allLessons.slice(0, position + 1).map((lesson) => [lesson.id, PASSED_STARS])
	);
}

function lastLessonOf(item: World): Lesson {
	const last = item.lessons[item.lessons.length - 1];
	if (!last) throw new Error(`The world ${item.id} has no lesson`);
	return last;
}

function lessonAfter(lessonId: string): Lesson {
	const next = allLessons[allLessons.findIndex((lesson) => lesson.id === lessonId) + 1];
	if (!next) throw new Error(`No lesson after ${lessonId}`);
	return next;
}

function worldOf(lessonId: string): World {
	const found = worlds.find((item) => item.lessons.some((lesson) => lesson.id === lessonId));
	if (!found) throw new Error(`No world for ${lessonId}`);
	return found;
}

function profileAfter(lessonId: string, name = PLAYER_NAME): Profile {
	return advancedProfile({ name, passed: passedThrough(lessonId) });
}

/** What the child can meet in an exercise of the lesson: its own words, and the banks' entries. */
function typableEntries(lesson: Lesson) {
	const learned = learnedChars(progression, lesson.id);
	const options = { maxLevel: playRules.maxWordLevel };
	const bankWords = usableWords(wordBank, learned, options).map((entry) => entry.text);
	return {
		learned: new Set(learned),
		bankWords: new Set(bankWords),
		words: new Set([...lesson.words, ...bankWords]),
		phrases: new Set(usablePhrases(phraseBank, learned, options).map((entry) => entry.text))
	};
}

/** The first seed whose exercise holds a sentence with a capital and a final punctuation mark. */
function exerciseWithCapitalSentence(lessonId: string, context: ExerciseContext) {
	for (let seed = 1; seed <= LAST_SEED; seed++) {
		const exercise = generateExercise(progression, lessonId, seededRng(seed), context);
		if (exercise.groups.some((group) => CAPITAL_SENTENCE.test(group))) return { seed, exercise };
	}
	throw new Error(`No exercise of ${lessonId} holds a capital sentence within ${LAST_SEED} seeds`);
}

async function openPlay(page: Page) {
	await openPage(page, PLAY_URL);
	await expect(heading(page, message('play_players_title'))).toBeVisible();
}

async function createPlayer(page: Page, name = PLAYER_NAME) {
	await button(page, message('play_new_player')).click();
	await page.getByLabel(message('play_new_label')).fill(name);
	await button(page, message('play_new_submit')).click();
	await expect(heading(page, message('play_check_title'))).toBeVisible();
}

/** `different` presses the keys of an American keyboard, which is what Playwright simulates. */
async function checkKeyboard(page: Page, kind: 'different' | 'same') {
	await button(page, message('play_check_continue')).click();
	for (const key of CHECK_KEYS) {
		await expect(heading(page, message('play_check_prompt', { key: key.label }))).toBeVisible();
		await page.keyboard.press(kind === 'same' ? key.code : key.letter);
	}
	const outcome = kind === 'same' ? 'play_check_ok_title' : 'play_check_diff_title';
	await expect(heading(page, message(outcome))).toBeVisible();
	await button(page, message('play_check_continue')).click();
	await expect(heading(page, message('play_map_title'))).toBeVisible();
}

async function reachMap(page: Page) {
	await openPlay(page);
	await createPlayer(page);
	await checkKeyboard(page, 'different');
}

/** Arrives on the map as a child whose profile was installed beforehand. */
async function reachMapAs(page: Page, profile: Profile) {
	await openPlay(page);
	await installProfile(page, profile);
	await reloadPage(page);
	await page.getByRole('button', { name: profile.name }).click();
	await expect(heading(page, message('play_map_title'))).toBeVisible();
}

async function openIntro(page: Page, lesson: Lesson) {
	await page.getByRole('button', { name: lesson.title }).click();
	await expect(heading(page, lesson.title)).toBeVisible();
}

async function startLesson(page: Page, lesson: Lesson) {
	await openIntro(page, lesson);
	await button(page, message('play_intro_start')).click();
	await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
}

async function currentGroup(page: Page): Promise<string> {
	const label = groupLabel(page);
	await expect(label).toHaveText(GROUP_LABEL);
	const text = (await label.textContent()) ?? '';
	return GROUP_LABEL.exec(text)?.groups?.['text'] ?? '';
}

interface PlayOptions {
	/** Press a key while the reward is on screen, which moves on without waiting. */
	skipDelay?: boolean;
	/** Index of the group on screen. */
	start?: number;
	onGroupDone?: (index: number, group: string) => Promise<void>;
}

interface Played {
	groups: string[];
	typed: number;
}

function finaleButton(page: Page) {
	return button(page, message('game_shared_finale_continue'));
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

/** Types every group, from the one on screen, until the result. */
async function typeToResult(page: Page, options: PlayOptions = {}): Promise<Played> {
	const played: Played = { groups: [], typed: 0 };
	for (let index = options.start ?? 0; ; index++) {
		const group = await currentGroup(page);
		await page.keyboard.type(group);
		played.groups.push(group);
		played.typed += toGraphemes(group).length;
		await options.onGroupDone?.(index, group);
		if (options.skipDelay) await page.keyboard.press(SKIP_KEY);
		if ((await nextStep(page)) === 'over') break;
	}
	if (await finaleButton(page).isVisible()) await finaleButton(page).click();
	await expect(button(page, message('play_result_map'))).toBeVisible();
	return played;
}

async function reachResult(page: Page) {
	await reachMap(page);
	await startLesson(page, FIRST);
	await typeToResult(page, { skipDelay: true });
}

async function expectNoAxeViolation(page: Page) {
	await page.evaluate(() => document.fonts.ready);
	const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
	expect(results.violations).toEqual([]);
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

test.describe('play route', () => {
	test('leads a child from the home page to a lesson passed with three stars', async ({
		page,
		baseURL
	}) => {
		const foreignRequests: string[] = [];
		const origin = new URL(baseURL ?? '').origin;
		page.on('request', (request) => {
			const url = new URL(request.url());
			if (/^https?:$/.test(url.protocol) && url.origin !== origin) {
				foreignRequests.push(request.url());
			}
		});

		await openPage(page, '/');
		await page.getByRole('link', { name: message('home_play'), exact: true }).click();
		await expect(page).toHaveURL(/\/jouer$/);
		await expect(heading(page, message('play_players_title'))).toBeVisible();
		await expect(page.getByText(message('play_players_empty'))).toBeVisible();

		await createPlayer(page);
		await expect(page.getByText(message('play_check_layout_intro'))).toBeVisible();
		await checkKeyboard(page, 'different');

		await expect(page.getByText(message('play_map_greeting', { name: PLAYER_NAME }))).toBeVisible();
		for (const item of worlds) {
			await expect(page.getByRole('list', { name: item.title })).toBeVisible();
		}
		await expect(page.getByRole('listitem')).toHaveCount(allLessons.length);
		await expect(page.getByRole('button', { name: FIRST.title })).toBeVisible();
		for (const lesson of allLessons.slice(1)) {
			await expect(page.getByRole('button', { name: lesson.title })).toHaveCount(0);
			await expect(lessonRow(page, lesson)).toContainText(message('play_lesson_locked'));
		}
		await expect(button(page, message('play_settings_open'))).toBeVisible();
		await expect(button(page, message('play_change_player'))).toBeVisible();

		await page.getByRole('button', { name: FIRST.title }).click();
		await expect(heading(page, FIRST.title)).toBeVisible();
		await expect(page.getByText(FIRST.intro)).toBeVisible();
		await expect(
			page.getByRole('heading', {
				level: 2,
				name: plural('play_intro_keys', FIRST.newChars.length)
			})
		).toBeVisible();
		await expect(page.locator('[data-target]')).toHaveCount(FIRST.newChars.length);
		await expect(page.getByRole('radio')).toHaveCount(0);
		await expect(button(page, message('play_intro_start'))).toBeFocused();
		await page.keyboard.press('Enter');

		const total = await groupTotal(page, FIRST_GAME);
		const { typed } = await typeToResult(page, {
			onGroupDone: async (index) => {
				const hatched = index + 1;
				if (hatched <= 3 && hatched < total) {
					await expect(page.locator('.bubble')).toHaveText(
						message(`game_${FIRST_GAME}_cry_${hatched}`)
					);
				}
				await expect(progressPicture(page, FIRST_GAME, hatched)).toBeVisible();
			}
		});
		await expect(heading(page, message('play_result_headline_3'))).toBeVisible();

		await expect(page.getByRole('img', { name: stars(3) }).first()).toBeVisible();
		await expect(page.getByText(message('play_result_note_3'))).toBeVisible();
		await expect(
			page.getByText(plural('play_result_accuracy', typed, { correct: typed, total: typed }))
		).toBeVisible();
		await expect(page.getByText(/%|mots? par minute|par minute/i)).toHaveCount(0);
		await expect(button(page, message('play_result_next'))).toBeVisible();
		await expect(button(page, message('play_result_replay'))).toBeVisible();
		await expect(page.getByText(message('play_break_suggest'))).toHaveCount(0);

		await button(page, message('play_result_map')).click();
		await expect(page.getByRole('button', { name: SECOND.title })).toBeVisible();
		await expect(lessonRow(page, FIRST).getByRole('img', { name: stars(3) })).toBeVisible();
		expect(foreignRequests).toEqual([]);
	});

	test('can be played with the keyboard alone, with reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await openPlay(page);

		await activateByTab(page, button(page, message('play_new_player')));
		await expect(heading(page, message('play_new_title'))).toBeVisible();
		await focusByTab(page, page.getByLabel(message('play_new_label')));
		await page.keyboard.type(PLAYER_NAME);
		await page.keyboard.press('Enter');

		await expect(heading(page, message('play_check_title'))).toBeVisible();
		const chosen = page.getByRole('radio', { checked: true });
		const chosenValue = (await chosen.getAttribute('value')) ?? '';
		const values = await page
			.getByRole('radio')
			.evaluateAll((radios) => radios.map((radio) => (radio as HTMLInputElement).value));
		const [forward, backward] =
			values.indexOf(chosenValue) < values.length - 1
				? ['ArrowRight', 'ArrowLeft']
				: ['ArrowLeft', 'ArrowRight'];
		await focusByTab(page, chosen);
		await page.keyboard.press(forward ?? '');
		await expect(chosen).not.toHaveAttribute('value', chosenValue);
		await page.keyboard.press(backward ?? '');
		await expect(chosen).toHaveAttribute('value', chosenValue);
		await activateByTab(page, button(page, message('play_check_continue')));
		for (const key of CHECK_KEYS) {
			await expect(heading(page, message('play_check_prompt', { key: key.label }))).toBeVisible();
			await page.keyboard.press(key.letter);
		}
		await expect(button(page, message('play_check_continue'))).toBeFocused();
		await page.keyboard.press('Enter');

		await expect(heading(page, message('play_map_title'))).toBeVisible();
		await activateByTab(page, page.getByRole('button', { name: FIRST.title }));
		await expect(button(page, message('play_intro_start'))).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
		await expect(page.locator('#game-input')).toBeFocused();

		await typeToResult(page, { skipDelay: true });
		await expect(heading(page, message('play_result_headline_3'))).toBeVisible();
		await activateByTab(page, button(page, message('play_result_map')));
		await expect(page.getByRole('button', { name: SECOND.title })).toBeVisible();
	});

	test('does not move on with a wrong key, flags it, and ends with fewer stars', async ({
		page
	}) => {
		await reachMap(page);
		await startLesson(page, FIRST);
		const group = await currentGroup(page);
		const first = [...group][0] ?? '';

		await page.keyboard.press(WRONG_KEY);

		await expect(page.locator('.target-text [data-error]')).toHaveCount(1);
		await expect(page.locator('.target-text [data-error]')).toHaveText(first);
		await expect(page.locator('.target-text [data-state="done"]')).toHaveCount(0);
		await expect(page.locator('.keyboard [data-wrong]')).toHaveAttribute('data-code', 'KeyX');
		await expect(page.locator('.keyboard [data-target]')).toHaveAttribute(
			'data-code',
			/^Key[A-Z]$/
		);
		await expect(page.getByRole('img', { name: message('ui_companion_oops') })).toBeVisible();
		await expect(page.locator('main')).not.toContainText(/%|\b(erreurs?|fautes?|score|vies?)\b/i);

		for (let mistake = 1; mistake < FEW_MISTAKES; mistake++) {
			await page.keyboard.press(WRONG_KEY);
		}
		await page.keyboard.type(group);
		await expect(groupLabel(page)).toHaveText(GROUP_DONE);
		await page.keyboard.press(SKIP_KEY);
		await typeToResult(page, { skipDelay: true, start: 1 });

		await expect(button(page, message('play_result_map'))).toBeVisible();
		await expect(heading(page, message('play_result_headline_3'))).toHaveCount(0);
		await expect(page.getByRole('img', { name: stars(3) })).toHaveCount(0);
		await expect(
			page.getByText(message('play_result_tame', { key: first.toLocaleUpperCase('fr') }))
		).toBeVisible();
	});

	test('encourages without blaming when the next lesson stays closed', async ({ page }) => {
		await reachMap(page);
		await startLesson(page, FIRST);

		for (let mistake = 0; mistake < MANY_MISTAKES; mistake++) {
			await page.keyboard.press(WRONG_KEY);
		}
		await typeToResult(page, { skipDelay: true });

		await expect(page.getByText(message('play_result_retry'))).toBeVisible();
		await expect(button(page, message('play_result_next'))).toHaveCount(0);
		await expect(button(page, message('play_result_replay'))).toBeVisible();
		await button(page, message('play_result_map')).click();
		await expect(page.getByRole('button', { name: SECOND.title })).toHaveCount(0);
	});

	test('pauses with Escape, resumes where it was, and quits without saving', async ({ page }) => {
		await reachMap(page);
		await startLesson(page, FIRST);
		const group = await currentGroup(page);
		const first = [...group][0] ?? '';
		await page.keyboard.type(first);
		await expect(page.locator('.target-text [data-state="done"]')).toHaveCount(1);

		await page.keyboard.press('Escape');

		const dialog = page.getByRole('dialog', { name: message('game_shared_pause_title') });
		await expect(dialog).toBeVisible();
		await expect(button(page, message('game_shared_resume'))).toBeFocused();
		await page.keyboard.press('Escape');
		await expect(dialog).toHaveCount(0);
		await expect(page.locator('#game-input')).toBeFocused();
		await expect(page.locator('.target-text [data-state="done"]')).toHaveCount(1);

		await button(page, message('game_shared_pause')).click();
		await expect(dialog).toBeVisible();
		await button(page, message('game_shared_resume')).click();
		await expect(dialog).toHaveCount(0);
		await page.keyboard.type(group.slice(first.length));
		await expect(groupLabel(page)).toHaveText(GROUP_DONE);

		await page.keyboard.press('Escape');
		await button(page, message('game_shared_quit')).click();

		await expect(heading(page, message('play_map_title'))).toBeVisible();
		await expect(page.getByRole('button', { name: SECOND.title })).toHaveCount(0);
		await expect(lessonRow(page, FIRST).getByRole('img', { name: stars(0) })).toBeVisible();

		await reloadPage(page);
		await expect(heading(page, message('play_map_title'))).toBeVisible();
		await expect(lessonRow(page, FIRST).getByRole('img', { name: stars(0) })).toBeVisible();
	});

	test('plays its sounds through one audio context from one game to the next', async ({ page }) => {
		await page.addInitScript(() => {
			const created: unknown[] = [];
			const param = { setValueAtTime() {}, linearRampToValueAtTime() {} };
			class FakeAudioContext {
				currentTime = 0;
				state = 'running';
				destination = {};
				constructor() {
					created.push(this);
				}
				createOscillator() {
					return { type: '', frequency: param, connect() {}, start() {}, stop() {} };
				}
				createGain() {
					return { gain: param, connect() {} };
				}
				resume() {
					return Promise.resolve();
				}
				close() {
					return Promise.resolve();
				}
			}
			Object.assign(window, { AudioContext: FakeAudioContext, createdAudioContexts: created });
		});
		await reachMap(page);
		await startLesson(page, FIRST);
		await page.keyboard.type((await currentGroup(page)).slice(0, 1));
		await page.keyboard.press('Escape');
		await button(page, message('game_shared_quit')).click();
		await expect(heading(page, message('play_map_title'))).toBeVisible();
		await startLesson(page, FIRST);
		await page.keyboard.type((await currentGroup(page)).slice(0, 1));
		await expect(page.locator('.target-text [data-state="done"]')).toHaveCount(1);

		const count = await page.evaluate(
			() => (window as unknown as { createdAudioContexts: unknown[] }).createdAudioContexts.length
		);
		expect(count).toBe(1);
	});

	test('moves on to the next egg at the next key', async ({ page }) => {
		await reachMap(page);
		await startLesson(page, FIRST);
		const first = await currentGroup(page);

		await page.keyboard.type(first);
		await expect(groupLabel(page)).toHaveText(GROUP_DONE);
		await page.keyboard.press(SKIP_KEY);

		await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
		await expect(page.locator('.target-text [data-state="done"]')).toHaveCount(0);
		await expect(page.locator('.target-text [data-error]')).toHaveCount(0);
	});

	test('explains Caps Lock when a lowercase letter is expected', async ({ page }) => {
		await reachMap(page);
		await startLesson(page, FIRST);
		await currentGroup(page);
		const field = page.locator('#game-input');

		await field.evaluate((element) => {
			element.dispatchEvent(
				new KeyboardEvent('keydown', {
					key: 'A',
					code: 'KeyA',
					modifierCapsLock: true,
					bubbles: true
				})
			);
		});
		await expect(page.getByText(message('game_shared_caps_lock'))).toBeVisible();

		await field.evaluate((element) => {
			element.dispatchEvent(
				new KeyboardEvent('keyup', { key: 'CapsLock', code: 'CapsLock', bubbles: true })
			);
		});
		await expect(page.getByText(message('game_shared_caps_lock'))).toHaveCount(0);
	});

	test('keeps the profile and its stars after a reload, without checking the keyboard again', async ({
		page
	}) => {
		await reachResult(page);
		await button(page, message('play_result_map')).click();

		await reloadPage(page);

		await expect(heading(page, message('play_map_title'))).toBeVisible();
		await expect(lessonRow(page, FIRST).getByRole('img', { name: stars(3) })).toBeVisible();
		await expect(page.getByRole('button', { name: SECOND.title })).toBeVisible();
	});

	test('resumes the last player on the map after a reload, and still lets another one in', async ({
		page
	}) => {
		await reachMap(page);
		await button(page, message('play_change_player')).click();
		await button(page, message('play_new_player')).click();
		await page.getByLabel(message('play_new_label')).fill('Zoé');
		await button(page, message('play_new_submit')).click();
		await checkKeyboard(page, 'same');

		await reloadPage(page);

		await expect(page.getByText(message('play_map_greeting', { name: 'Zoé' }))).toBeVisible();
		await button(page, message('play_change_player')).click();
		await expect(heading(page, message('play_players_title'))).toBeVisible();
		await page.getByRole('button', { name: PLAYER_NAME }).click();
		await expect(page.getByText(message('play_map_greeting', { name: PLAYER_NAME }))).toBeVisible();

		await reloadPage(page);

		await expect(page.getByText(message('play_map_greeting', { name: PLAYER_NAME }))).toBeVisible();
	});

	test('resumes on the keyboard check when the last player has not done it', async ({ page }) => {
		await openPlay(page);
		await createPlayer(page);

		await reloadPage(page);

		await expect(heading(page, message('play_check_title'))).toBeVisible();
		await button(page, message('play_change_player')).click();
		await expect(heading(page, message('play_players_title'))).toBeVisible();
		await expect(page.getByRole('button', { name: PLAYER_NAME })).toBeVisible();
	});

	test('goes back to the choice of the player when the remembered one is gone', async ({
		page
	}) => {
		await reachMap(page);
		await page.evaluate(
			([key, id]) => localStorage.setItem(key as string, id as string),
			[LAST_PLAYER_KEY, 'a-profile-that-does-not-exist']
		);

		await reloadPage(page);

		await expect(heading(page, message('play_players_title'))).toBeVisible();
		await page.getByRole('button', { name: PLAYER_NAME }).click();
		await expect(heading(page, message('play_map_title'))).toBeVisible();
	});

	test('works when the browser refuses to store anything locally', async ({ page }) => {
		await page.addInitScript((key) => {
			const real = window.localStorage;
			const refuse = () => {
				throw new DOMException('Access denied', 'SecurityError');
			};
			Object.defineProperty(window, 'localStorage', {
				value: {
					getItem: (name: string) => (name === key ? refuse() : real.getItem(name)),
					setItem: (name: string, value: string) =>
						name === key ? refuse() : real.setItem(name, value),
					removeItem: (name: string) => (name === key ? refuse() : real.removeItem(name))
				}
			});
		}, LAST_PLAYER_KEY);
		await reachMap(page);

		await reloadPage(page);

		await expect(heading(page, message('play_players_title'))).toBeVisible();
		await page.getByRole('button', { name: PLAYER_NAME }).click();
		await expect(heading(page, message('play_map_title'))).toBeVisible();
	});

	test('starts a game when the browser forbids any access to local storage', async ({ page }) => {
		const pageErrors: Error[] = [];
		page.on('pageerror', (error) => pageErrors.push(error));
		await page.addInitScript(() => {
			Object.defineProperty(window, 'localStorage', {
				get() {
					throw new DOMException('Access denied', 'SecurityError');
				}
			});
		});

		await openPage(page, '/');
		await expect(heading(page, message('home_title'))).toBeVisible();

		await reachMap(page);
		await startLesson(page, FIRST);
		await page.keyboard.type(await currentGroup(page));
		await expect(groupLabel(page)).toHaveText(GROUP_DONE);
		expect(pageErrors).toEqual([]);
	});

	test('offers a second player on the same device', async ({ page }) => {
		await reachMap(page);
		await button(page, message('play_change_player')).click();

		await expect(page.getByRole('button', { name: PLAYER_NAME })).toBeVisible();
		await button(page, message('play_new_player')).click();
		await page.getByLabel(message('play_new_label')).fill('Zoé');
		await button(page, message('play_new_submit')).click();
		await checkKeyboard(page, 'same');
		await expect(page.getByRole('button', { name: SECOND.title })).toHaveCount(0);
		await button(page, message('play_change_player')).click();
		await expect(page.getByRole('button', { name: PLAYER_NAME })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Zoé' })).toBeVisible();
	});

	test('answers a bad nickname with a kind message that helps to fix it', async ({ page }) => {
		await openPlay(page);
		await button(page, message('play_new_player')).click();
		const input = page.getByLabel(message('play_new_label'));

		await button(page, message('play_new_submit')).click();
		await expect(page.getByRole('alert')).toHaveText(message('play_new_error_empty'));
		await expect(input).toHaveAttribute('aria-invalid', 'true');

		await input.fill('a'.repeat(MAX_NAME_LENGTH + 1));
		await button(page, message('play_new_submit')).click();
		await expect(page.getByRole('alert')).toHaveText(
			message('play_new_error_invalid', { min: MIN_NAME_LENGTH, max: MAX_NAME_LENGTH })
		);

		await input.fill('a'.repeat(MAX_NAME_LENGTH));
		await button(page, message('play_new_submit')).click();
		await expect(heading(page, message('play_check_title'))).toBeVisible();
	});

	test('says the keyboard is ready when the physical keys are the expected ones', async ({
		page
	}) => {
		await openPlay(page);
		await createPlayer(page);

		await checkKeyboard(page, 'same');
	});

	test('applies a setting at once and keeps it after a reload', async ({ page }) => {
		await reachMap(page);
		await button(page, message('play_settings_open')).click();
		await expect(heading(page, message('settings_title'))).toBeVisible();
		const radio = (legend: string, label: string) =>
			page.getByRole('group', { name: legend }).getByRole('radio', { name: label });
		const root = page.locator('html');
		const property = (name: string) =>
			page.evaluate(
				(token) => getComputedStyle(document.documentElement).getPropertyValue(token).trim(),
				name
			);

		await radio(message('settings_theme_label'), message('settings_theme_dark')).check();
		await radio(message('settings_scale_label'), message('settings_scale_xl')).check();
		await radio(message('settings_spacing_label'), message('settings_spacing_wider')).check();

		await expect(root).toHaveAttribute('data-theme', 'dark');
		await expect(root).toHaveAttribute('data-text-scale', 'xl');
		await expect(root).toHaveAttribute('data-text-spacing', 'wider');
		await expect(page.getByText(message('settings_saved'))).toBeVisible();
		expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe(
			'dark'
		);
		expect(await property('--dd-typing-size-current')).toBe(await property('--dd-typing-size-xl'));

		await reloadPage(page);
		await expect(heading(page, message('play_map_title'))).toBeVisible();
		await expect(root).toHaveAttribute('data-theme', 'dark');
		await expect(root).toHaveAttribute('data-text-scale', 'xl');
		await button(page, message('play_settings_open')).click();
		await expect(
			radio(message('settings_theme_label'), message('settings_theme_dark'))
		).toBeChecked();
		await expect(
			radio(message('settings_scale_label'), message('settings_scale_xl'))
		).toBeChecked();
		await button(page, message('settings_back')).click();

		await button(page, message('play_change_player')).click();
		await expect(heading(page, message('play_players_title'))).toBeVisible();
		await expect(root).not.toHaveAttribute('data-theme', /.+/);
		await page.getByRole('button', { name: PLAYER_NAME }).click();
		await expect(root).toHaveAttribute('data-theme', 'dark');
	});

	test('hides the on-screen keyboard when asked to', async ({ page }) => {
		await reachMap(page);
		await button(page, message('play_settings_open')).click();
		await page
			.getByRole('group', { name: message('settings_keyboard_label') })
			.getByRole('radio', { name: message('settings_off') })
			.check();
		await button(page, message('settings_back')).click();

		await startLesson(page, FIRST);

		await expect(page.locator('.keyboard')).toHaveCount(0);
		await page.keyboard.type(await currentGroup(page));
		await expect(groupLabel(page)).toHaveText(GROUP_DONE);
	});

	test('suggests a break after the play time of the rules, and never before', async ({ page }) => {
		await page.clock.install();
		await reachMap(page);
		await startLesson(page, FIRST);
		await page.keyboard.type((await currentGroup(page)).slice(0, 1));

		await page.clock.fastForward(`${playRules.breakAfterMinutes + 1}:00`);
		await page.keyboard.type((await currentGroup(page)).slice(1));
		await expect(groupLabel(page)).toHaveText(GROUP_DONE);
		await page.keyboard.press(SKIP_KEY);
		await typeToResult(page, { skipDelay: true, start: 1 });

		await expect(page.getByText(message('play_break_suggest'), { exact: true })).toBeVisible();
		await expect(page.getByText(message('play_break_suggest_detail'))).toBeVisible();
		await expect(button(page, message('play_break_button'))).toBeVisible();
		await expect(button(page, message('play_result_replay'))).toBeVisible();
		await expect(button(page, message('play_result_map'))).toBeVisible();

		await button(page, message('play_break_button')).click();
		await expect(heading(page, message('play_break_title'))).toBeVisible();
		await button(page, message('play_break_return')).click();
		await expect(heading(page, message('play_map_title'))).toBeVisible();

		await startLesson(page, FIRST);
		await typeToResult(page, { skipDelay: true });
		await expect(button(page, message('play_result_map'))).toBeVisible();
		await expect(page.getByText(message('play_break_suggest'))).toHaveCount(0);
	});

	test('opens the second world once the first is done, and lets the child choose its game', async ({
		page
	}) => {
		await reachMapAs(page, profileAfter(lastLessonOf(world).id));

		for (const item of worlds) {
			await expect(page.getByRole('heading', { level: 2, name: item.title })).toBeVisible();
		}
		await expect(page.getByText(message('play_world_current'))).toHaveCount(1);
		await expect(
			page.getByRole('region', { name: NEXT_WORLD.title }).getByText(message('play_world_current'))
		).toBeVisible();
		await expect(lessonRow(page, FIRST).getByRole('img', { name: stars(3) })).toBeVisible();
		await expect(page.getByRole('button', { name: NEXT_FIRST.title })).toBeVisible();
		await expect(page.getByRole('button', { name: NEXT_SECOND.title })).toHaveCount(0);
		await expect(lessonRow(page, NEXT_SECOND)).toContainText(message('play_lesson_locked'));

		await openIntro(page, NEXT_FIRST);
		const radio = (gameId: string) => page.getByRole('radio', { name: gameTitle(gameId) });
		await expect(
			page.getByRole('group', { name: message('play_game_choice_legend') })
		).toBeVisible();
		await expect(page.getByRole('radio')).toHaveCount(NEXT_WORLD.gameIds.length);
		for (const gameId of NEXT_WORLD.gameIds) await expect(radio(gameId)).toBeVisible();
		await expect(radio(DEFAULT_GAME)).toBeChecked();

		await radio(DEFAULT_GAME).focus();
		await page.keyboard.press('ArrowDown');
		await expect(radio(OTHER_GAME)).toBeChecked();
		await expect(radio(DEFAULT_GAME)).not.toBeChecked();
		await activateByTab(page, button(page, message('play_intro_start')));

		await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
		await expect(progressPicture(page, OTHER_GAME, 0)).toBeVisible();
		await expect(progressPicture(page, DEFAULT_GAME, 0)).toHaveCount(0);
	});

	test('puts real words of the banks in the groups of a lesson that asks for words', async ({
		page
	}) => {
		const entries = typableEntries(NEXT_FIRST);
		await reachMapAs(page, profileAfter(lastLessonOf(world).id));
		await startLesson(page, NEXT_FIRST);

		const { groups } = await typeToResult(page, { skipDelay: true });

		expect(groups.some((group) => entries.bankWords.has(group))).toBe(true);
		expect(groups.some((group) => entries.words.has(group) || entries.phrases.has(group))).toBe(
			true
		);
		for (const group of groups) {
			for (const char of toGraphemes(group)) expect(entries.learned.has(char), group).toBe(true);
		}
	});

	test('plays a whole lesson of the second world with the recipe, up to the result', async ({
		page
	}) => {
		await reachMapAs(page, profileAfter(NEXT_FIRST.id));
		await openIntro(page, NEXT_SECOND);
		await page.getByRole('radio', { name: gameTitle(RECIPE) }).check();
		await button(page, message('play_intro_start')).click();
		await expect(progressPicture(page, RECIPE, 0)).toBeVisible();

		const { typed } = await typeToResult(page, { skipDelay: true });

		await expect(heading(page, message('play_result_headline_3'))).toBeVisible();
		await expect(
			page.getByText(plural('play_result_accuracy', typed, { correct: typed, total: typed }))
		).toBeVisible();
		await button(page, message('play_result_map')).click();
		await expect(lessonRow(page, NEXT_SECOND).getByRole('img', { name: stars(3) })).toBeVisible();
		await expect(page.getByRole('button', { name: NEXT_THIRD.title })).toBeVisible();
	});

	test('plays a lesson of the fourth world with the rocket and types a capital sentence', async ({
		page
	}) => {
		const uppercase = allLessons.find((lesson) => lesson.unlocks.includes('uppercase'));
		if (!uppercase) throw new Error('No lesson unlocks the capitals');
		const lesson = lessonAfter(uppercase.id);
		const profile = profileAfter(uppercase.id);
		const entries = typableEntries(lesson);
		const { seed, exercise } = exerciseWithCapitalSentence(lesson.id, {
			words: wordBank,
			phrases: phraseBank,
			progress: profile.progress,
			themeId: worldOf(lesson.id).themeId,
			maxLevel: playRules.maxWordLevel
		});
		await reachMapAs(page, profile);
		await openIntro(page, lesson);
		await page.getByRole('radio', { name: gameTitle(ROCKET) }).check();
		await page.evaluate(
			([source, value]) => {
				Math.random = new Function(`return (${source})`)()(value);
			},
			[seededRng.toString(), seed] as const
		);
		await button(page, message('play_intro_start')).click();
		await expect(progressPicture(page, ROCKET, 0)).toBeVisible();

		const { groups } = await typeToResult(page, { skipDelay: true });

		expect(groups).toEqual(exercise.groups);
		expect(groups.some((group) => CAPITAL_SENTENCE.test(group) && entries.phrases.has(group))).toBe(
			true
		);
		await expect(button(page, message('play_result_map'))).toBeVisible();
	});

	test('plays without the word bank when it cannot be loaded, and says so in the console', async ({
		page
	}) => {
		const errors: string[] = [];
		page.on('console', (entry) => {
			if (entry.type() === 'error') errors.push(entry.text());
		});
		await page.route('**/_app/immutable/**/*.js', async (route) => {
			const response = await route.fetch();
			const body = await response.text();
			if (body.includes(wordBank.id)) await route.abort();
			else await route.fulfill({ response, body });
		});
		await reachMapAs(page, profileAfter(lastLessonOf(world).id));

		await startLesson(page, NEXT_FIRST);
		await page.keyboard.type(await currentGroup(page));

		await expect(groupLabel(page)).toHaveText(GROUP_DONE);
		expect(errors.filter((text) => text.includes('word bank'))).toHaveLength(1);
		expect(errors.filter((text) => text.includes('phrase bank'))).toHaveLength(0);
	});

	test('opens a profile that only knows the first lessons and finds its stars', async ({
		page
	}) => {
		const failures: string[] = [];
		page.on('pageerror', (error) => failures.push(error.message));
		await reachMapAs(page, advancedProfile({ name: PLAYER_NAME, passed: LEGACY_LESSON_STARS }));

		await expect(page.getByRole('alert')).toHaveCount(0);
		for (const [index, lesson] of allLessons.entries()) {
			const earlier = allLessons[index - 1];
			const open = index === 0 || (earlier !== undefined && earlier.id in LEGACY_LESSON_STARS);
			const row = lessonRow(page, lesson);
			const legacyStars = LEGACY_LESSON_STARS[lesson.id];
			if (!open) {
				await expect(page.getByRole('button', { name: lesson.title })).toHaveCount(0);
				await expect(row).toContainText(message('play_lesson_locked'));
			} else if (legacyStars !== undefined) {
				await expect(row.getByRole('img', { name: stars(legacyStars) })).toBeVisible();
				await expect(row).toContainText(message('play_lesson_done'));
			} else {
				await expect(page.getByRole('button', { name: lesson.title })).toBeVisible();
				await expect(row).toContainText(message('play_lesson_current'));
			}
		}
		expect(failures).toEqual([]);
	});

	test('shows the stars of an old lesson again once the new lessons before it are passed', async ({
		page
	}) => {
		const old = allLessons.filter((lesson) => lesson.id in LEGACY_LESSON_STARS);
		const last = old[old.length - 1];
		if (!last) throw new Error('No lesson of the first version is left');
		const insertedBefore = allLessons[allLessons.indexOf(last) - 1];
		if (!insertedBefore) throw new Error('The last old lesson has no lesson before it');
		const passed = { ...passedThrough(insertedBefore.id), ...LEGACY_LESSON_STARS };
		await reachMapAs(page, advancedProfile({ name: PLAYER_NAME, passed }));

		for (const [id, count] of Object.entries(LEGACY_LESSON_STARS)) {
			const lesson = allLessons.find((item) => item.id === id);
			if (!lesson) throw new Error(`Unknown lesson: ${id}`);
			await expect(lessonRow(page, lesson).getByRole('img', { name: stars(count) })).toBeVisible();
		}
	});
});

for (const colorScheme of COLOR_SCHEMES) {
	test.describe(`play route, ${colorScheme} theme`, () => {
		test.use({ colorScheme });

		test('has no axe violation on the screens before the lesson', async ({ page }) => {
			test.slow();
			await openPlay(page);
			await expectNoAxeViolation(page);

			await button(page, message('play_new_player')).click();
			await expect(heading(page, message('play_new_title'))).toBeVisible();
			await expectNoAxeViolation(page);
			await button(page, message('play_new_submit')).click();
			await expect(page.getByRole('alert')).toHaveText(message('play_new_error_empty'));
			await expectNoAxeViolation(page);

			await page.getByLabel(message('play_new_label')).fill(PLAYER_NAME);
			await button(page, message('play_new_submit')).click();
			await expect(heading(page, message('play_check_title'))).toBeVisible();
			await expectNoAxeViolation(page);
			await button(page, message('play_check_continue')).click();
			for (const [index, key] of CHECK_KEYS.entries()) {
				await expect(heading(page, message('play_check_prompt', { key: key.label }))).toBeVisible();
				if (index === 0) await expectNoAxeViolation(page);
				await page.keyboard.press(key.letter);
			}
			await expect(heading(page, message('play_check_diff_title'))).toBeVisible();
			await expectNoAxeViolation(page);
			await button(page, message('play_check_continue')).click();

			await expect(heading(page, message('play_map_title'))).toBeVisible();
			await expectNoAxeViolation(page);

			await button(page, message('play_settings_open')).click();
			await expect(heading(page, message('settings_title'))).toBeVisible();
			await expectNoAxeViolation(page);
			await button(page, message('settings_back')).click();

			await page.getByRole('button', { name: FIRST.title }).click();
			await expect(heading(page, FIRST.title)).toBeVisible();
			await expectNoAxeViolation(page);
		});

		test('has no axe violation on the map of all the worlds and on the choice of the game', async ({
			page
		}) => {
			test.slow();
			await reachMapAs(page, profileAfter(lastLessonOf(world).id));
			await expect(
				page.getByRole('heading', { level: 2, name: worlds[worlds.length - 1]?.title })
			).toBeVisible();
			await expect(page.getByRole('list')).toHaveCount(worlds.length);
			await expectNoAxeViolation(page);

			await openIntro(page, NEXT_FIRST);
			await expect(page.getByRole('radio')).toHaveCount(NEXT_WORLD.gameIds.length);
			await expectNoAxeViolation(page);
		});

		test('has no axe violation in the game and on the result', async ({ page }) => {
			test.slow();
			await reachMap(page);
			await startLesson(page, FIRST);

			const group = await currentGroup(page);
			await expectNoAxeViolation(page);
			await page.keyboard.press(WRONG_KEY);
			await expect(page.locator('.target-text [data-error]')).toHaveCount(1);
			await expectNoAxeViolation(page);
			await page.keyboard.type(group);
			await expect(groupLabel(page)).toHaveText(GROUP_DONE);
			await expect(page.locator('.bubble')).toBeVisible();
			await expectNoAxeViolation(page);

			await page.keyboard.press('Escape');
			await expect(page.getByRole('dialog')).toBeVisible();
			await expectNoAxeViolation(page);
			await button(page, message('game_shared_resume')).click();

			await page.keyboard.press(SKIP_KEY);
			await typeToResult(page, { skipDelay: true, start: 1 });
			await expectNoAxeViolation(page);
		});

		test('has no axe violation on the result with a break and on the break screen', async ({
			page
		}) => {
			test.slow();
			await page.clock.install();
			await reachMap(page);
			await startLesson(page, FIRST);
			await page.clock.fastForward(`${playRules.breakAfterMinutes + 1}:00`);
			await typeToResult(page, { skipDelay: true });

			await expect(button(page, message('play_break_button'))).toBeVisible();
			await expectNoAxeViolation(page);
			await button(page, message('play_break_button')).click();
			await expect(heading(page, message('play_break_title'))).toBeVisible();
			await expectNoAxeViolation(page);
		});
	});
}
