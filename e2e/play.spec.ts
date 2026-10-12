import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { MAX_NAME_LENGTH, MIN_NAME_LENGTH } from '../src/lib/state/profile';
import { LAST_PLAYER_KEY } from '../src/routes/jouer/last-player';
import { openPage, reloadPage } from './support';

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;
const PLAY_URL = '/jouer';
const PLAYER_NAME = 'Mini';
const PRESS_BUDGET = 60;
/** A letter that no lesson of the first world asks for. */
const WRONG_KEY = 'x';
/** Enter is ignored while typing, and moves on to the next egg while the baby dino is out. */
const SKIP_KEY = 'Enter';
/** Enough mistakes to lose at least one star whatever the length of the exercise. */
const FEW_MISTAKES = 5;
/** Enough mistakes to stay under the accuracy that opens the next lesson. */
const MANY_MISTAKES = 15;

interface Lesson {
	id: string;
	title: string;
	intro: string;
	newChars: string[];
	groupCount: number;
}

function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')) as T;
}

const messages = readJson<Record<string, string>>('messages/fr.json');
const progression = readJson<{ worlds: { title: string; lessons: Lesson[] }[] }>(
	'content/fr/progression/azerty-decouverte.json'
);
const playRules = readJson<{ breakAfterMinutes: number; keyboardCheckCodes: string[] }>(
	'content/common/play-rules.json'
);
const azerty = readJson<{ keys: Record<string, { base?: string }> }>(
	'layouts/fr-fr-azerty-pc.json'
);

const world = progression.worlds[0] ?? { title: '', lessons: [] };
const [FIRST, SECOND] = world.lessons as [Lesson, Lesson];
const CHECK_KEYS = playRules.keyboardCheckCodes.map((code) => {
	const letter = azerty.keys[code]?.base ?? '';
	return { code, letter, label: letter.toLocaleUpperCase('fr') };
});

function message(key: string, params: Record<string, string | number> = {}): string {
	const template = messages[key] ?? key;
	return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''));
}

function plural(key: string, count: number, params: Record<string, string | number> = {}): string {
	const form = new Intl.PluralRules('fr').select(count) === 'one' ? 'one' : 'other';
	return message(`${key}_${form}`, { count, ...params });
}

function templateRegex(key: string): RegExp {
	const escaped = (messages[key] ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const pattern = escaped.replace('\\{text\\}', '(?<text>.*)').replace('\\{char\\}', '.*');
	return new RegExp(`^${pattern}$`, 's');
}

const GROUP_LABEL = templateRegex('ui_target_text_label');
const GROUP_DONE = templateRegex('ui_target_text_done');

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

async function startLesson(page: Page, lesson: Lesson) {
	await page.getByRole('button', { name: lesson.title }).click();
	await expect(heading(page, lesson.title)).toBeVisible();
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
	/** Press a key while the baby dino is out, which moves on without waiting. */
	skipDelay?: boolean;
	onGroupDone?: (index: number) => Promise<void>;
}

/** Types the groups shown on screen from `start` on. Returns how many characters were expected. */
async function typeFrom(page: Page, lesson: Lesson, start: number, options: PlayOptions = {}) {
	let typed = 0;
	for (let index = start; index < lesson.groupCount; index++) {
		const group = await currentGroup(page);
		await page.keyboard.type(group);
		typed += [...group].length;
		await expect(groupLabel(page)).toHaveText(GROUP_DONE);
		await options.onGroupDone?.(index);
		if (index < lesson.groupCount - 1 && options.skipDelay) await page.keyboard.press(SKIP_KEY);
	}
	return typed;
}

function typeAllGroups(page: Page, lesson: Lesson, options: PlayOptions = {}) {
	return typeFrom(page, lesson, 0, options);
}

async function reachResult(page: Page) {
	await reachMap(page);
	await startLesson(page, FIRST);
	await typeAllGroups(page, FIRST, { skipDelay: true });
	await expect(button(page, message('play_result_map'))).toBeVisible();
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
		await expect(page.getByRole('list', { name: world.title })).toBeVisible();
		await expect(page.getByRole('listitem')).toHaveCount(world.lessons.length);
		await expect(page.getByRole('button', { name: FIRST.title })).toBeVisible();
		for (const lesson of world.lessons.slice(1)) {
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
		await expect(button(page, message('play_intro_start'))).toBeFocused();
		await page.keyboard.press('Enter');

		await expect(
			page.getByRole('img', {
				name: plural('game_hatching_progress', 0, { hatched: 0, total: FIRST.groupCount })
			})
		).toBeVisible();
		const typed = await typeAllGroups(page, FIRST, {
			onGroupDone: async (index) => {
				const hatched = index + 1;
				await expect(
					page.getByRole('img', {
						name: plural('game_hatching_progress', hatched, {
							hatched,
							total: FIRST.groupCount
						})
					})
				).toBeVisible();
				if (index < 3) {
					await expect(page.locator('.bubble')).toHaveText(message(`game_hatching_cry_${hatched}`));
				}
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

		await typeAllGroups(page, FIRST, { skipDelay: true });
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
		await typeFrom(page, FIRST, 1, { skipDelay: true });

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
		await typeAllGroups(page, FIRST, { skipDelay: true });

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
		await typeFrom(page, FIRST, 1, { skipDelay: true });

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
		await typeAllGroups(page, FIRST, { skipDelay: true });
		await expect(button(page, message('play_result_map'))).toBeVisible();
		await expect(page.getByText(message('play_break_suggest'))).toHaveCount(0);
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

			await typeFrom(page, FIRST, 1, { skipDelay: true });
			await expect(button(page, message('play_result_map'))).toBeVisible();
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
			await typeAllGroups(page, FIRST, { skipDelay: true });

			await expect(button(page, message('play_break_button'))).toBeVisible();
			await expectNoAxeViolation(page);
			await button(page, message('play_break_button')).click();
			await expect(heading(page, message('play_break_title'))).toBeVisible();
			await expectNoAxeViolation(page);
		});
	});
}
