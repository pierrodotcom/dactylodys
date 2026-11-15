import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import type { StarCount } from '../src/lib/engine/progression/types';
import { seededRng } from '../src/lib/engine/progression/test-support';
import { GAMES } from '../src/lib/games/registry';
import { withAdultWords, withGhost } from '../src/lib/state/profile';
import type { Profile, SessionRecord } from '../src/lib/state/types';
import {
	advancedProfile,
	answerCheckKey,
	installProfile,
	keyboardCheckKeys,
	loadMessages,
	openPage,
	readJson,
	reloadPage,
	shortenRewards,
	throughStory
} from './support';

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

/** A laptop screen: the way out of every screen must be found without scrolling down. */
const LAPTOP = { width: 1280, height: 720 } as const;
/** How far from the top of the page the way out may start, in CSS pixels. */
const TOP_OF_PAGE = 200;
const PASSED_STARS: StarCount = 3;

interface Lesson {
	id: string;
	title: string;
}

const { message, plural, templateRegex } = loadMessages();
const progressionWorlds = readJson<{ worlds: { lessons: Lesson[] }[] }>(
	'content/fr/progression/azerty-decouverte.json'
).worlds;
const firstWorld = progressionWorlds[0];
const FIRST = firstWorld?.lessons[0] as Lesson;
const GROUP_LABEL = templateRegex('ui_target_text_label');
/** The reminder to look at the screen comes after this many groups (`lookReminderEveryGroups`). */
const REMINDER_EVERY = readJson<{ lookReminderEveryGroups: number }>(
	'content/common/play-rules.json'
).lookReminderEveryGroups;

const CHECK_KEYS = keyboardCheckKeys();

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

/** The way out of the screen: its label, and that it starts at the top of the page. */
async function expectWayOutAtTop(page: Page, label: string) {
	const back = page.locator('[data-screen-back] button');
	await expect(back).toHaveText(label);
	const top = await back.evaluate((element) => element.getBoundingClientRect().top + scrollY);
	expect(top).toBeLessThan(TOP_OF_PAGE);
}

test.beforeEach(async ({ page }) => {
	await page.setViewportSize(LAPTOP);
});

test('puts the way out of every screen at the top of the page', async ({ page }) => {
	const child = withAdultWords(
		advancedProfile({ name: 'Lou', passed: { [FIRST.id]: PASSED_STARS } }),
		['lune']
	);
	await openPage(page, '/jouer');
	await installProfile(page, child);
	await reloadPage(page);

	await button(page, message('play_new_player')).click();
	await expect(heading(page, message('play_new_title'))).toBeVisible();
	await expectWayOutAtTop(page, message('play_new_cancel'));
	await button(page, message('play_new_cancel')).click();

	await page.getByRole('button', { name: child.name }).click();
	await expect(heading(page, message('play_map_title'))).toBeVisible();

	await button(page, message('play_settings_open')).click();
	await expect(heading(page, message('settings_title'))).toBeVisible();
	await expectWayOutAtTop(page, message('settings_back'));
	await button(page, message('settings_back')).click();

	await button(page, message('play_companion_open')).click();
	await expect(heading(page, message('play_companion_title'))).toBeVisible();
	await expectWayOutAtTop(page, message('play_companion_back'));
	await button(page, message('play_companion_back')).click();

	await button(page, message('play_hideout_open')).click();
	await expect(heading(page, message('play_hideout_title'))).toBeVisible();
	await expectWayOutAtTop(page, message('play_hideout_back'));
	await button(page, message('play_hideout_back')).click();

	await button(page, message('play_story_so_far_open')).click();
	await expect(heading(page, message('play_story_so_far_title'))).toBeVisible();
	await expectWayOutAtTop(page, message('play_story_so_far_back'));
	// From the title the screen opens on, Tab reaches the way out first; Escape takes it too.
	await page.keyboard.press('Tab');
	await expect(page.locator('[data-screen-back] button')).toBeFocused();
	await page.keyboard.press('Escape');
	await expect(heading(page, message('play_map_title'))).toBeVisible();

	await button(page, message('play_free_open')).click();
	await expect(heading(page, message('play_free_title'))).toBeVisible();
	await expectWayOutAtTop(page, message('play_free_back'));
	await button(page, message('play_free_back')).click();

	await page.getByRole('button', { name: FIRST.title }).click();
	await throughStory(page, heading(page, FIRST.title));
	await expectWayOutAtTop(page, message('play_intro_back'));
});

test('gives the keyboard check a way out at the top of its steps and of its two results, and Escape takes it', async ({
	page
}) => {
	const wayOut = message('play_change_player');
	const firstKey = CHECK_KEYS[0]?.label ?? '';
	await openPage(page, '/jouer');
	await button(page, message('play_new_player')).click();
	await page.getByLabel(message('play_new_label')).fill('Lou');
	await button(page, message('play_new_submit')).click();

	await expect(heading(page, message('play_check_title'))).toBeVisible();
	await expectWayOutAtTop(page, wayOut);

	await button(page, message('play_check_continue')).click();
	await expect(heading(page, message('play_check_prompt', { key: firstKey }))).toBeVisible();
	await expectWayOutAtTop(page, wayOut);

	// The keys write other letters, twice: the result asks for an adult and still fits the screen.
	for (const attempt of [1, 2]) {
		for (const key of CHECK_KEYS) {
			await expect(heading(page, message('play_check_prompt', { key: key.label }))).toBeVisible();
			await answerCheckKey(page, key, 'different');
		}
		await expect(heading(page, message('play_check_diff_title'))).toBeVisible();
		await expectWayOutAtTop(page, wayOut);
		await expect(page.getByText(message('play_check_diff_adult'))).toHaveCount(attempt - 1);
		await expect(button(page, message('play_check_play_anyway'))).toBeInViewport({ ratio: 1 });
		await expect(page.getByText(message('play_check_play_anyway_note'))).toBeInViewport({
			ratio: 1
		});
		expect(await page.evaluate(() => scrollY)).toBe(0);
		await button(page, message('play_check_retry')).click();
	}

	for (const key of CHECK_KEYS) {
		await expect(heading(page, message('play_check_prompt', { key: key.label }))).toBeVisible();
		await expectWayOutAtTop(page, wayOut);
		await expect(button(page, message('play_check_not_found'))).toBeInViewport({ ratio: 1 });
		await answerCheckKey(page, key, 'same');
	}

	await expect(heading(page, message('play_check_ok_title'))).toBeVisible();
	await expectWayOutAtTop(page, wayOut);
	await page.keyboard.press('Escape');
	await expect(heading(page, message('play_players_title'))).toBeVisible();

	// The keyboard was not checked to the end: it is asked again, and Escape leaves the keys too.
	await page.getByRole('button', { name: 'Lou' }).click();
	await button(page, message('play_check_continue')).click();
	await expect(heading(page, message('play_check_prompt', { key: firstKey }))).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(heading(page, message('play_players_title'))).toBeVisible();
});

test('keeps the hideout in view while the child goes down the objects to set down', async ({
	page
}) => {
	const every = progressionWorlds.flatMap((world) => world.lessons);
	const child = advancedProfile({
		name: 'Lou',
		passed: Object.fromEntries(every.map((lesson) => [lesson.id, PASSED_STARS]))
	});
	await openPage(page, '/jouer');
	await installProfile(page, child);
	await reloadPage(page);
	await page.getByRole('button', { name: child.name }).click();
	await button(page, message('play_hideout_open')).click();
	await expect(heading(page, message('play_hideout_title'))).toBeVisible();

	// The places and the whole cabin fit a laptop screen without scrolling.
	const scene = page.locator('[data-hideout-scene]');
	const places = page.locator('button[data-place]');
	await expectInView(scene);
	await expectInView(places.last());

	await page.locator('button[data-place="pegs"]').click();
	const objects = page.locator('button[data-object]');
	await objects.first().focus();
	await page.keyboard.press('End');
	await expect(objects.last()).toBeFocused();
	await expectInView(objects.last());
	await expectInView(scene);
});

/** The element is entirely on the screen, as it is scrolled now. */
async function expectInView(element: Locator) {
	const box = await element.evaluate((node) => {
		const rect = node.getBoundingClientRect();
		return { top: rect.top, bottom: rect.bottom, height: innerHeight };
	});
	expect(box.top).toBeGreaterThanOrEqual(0);
	expect(box.bottom).toBeLessThanOrEqual(box.height);
}

test('puts the way out of the adult space at the top of each of its screens', async ({ page }) => {
	const child = advancedProfile({ name: 'Lou', passed: {} });
	const numbers = readJson<{ numbers: { value: number; words: string }[] }>(
		'content/fr/adult/gate-numbers.json'
	).numbers;
	await openPage(page, '/jouer');
	await installProfile(page, child);
	await reloadPage(page);
	await page.getByRole('link', { name: message('adult_entry_link') }).click();
	await expect(heading(page, message('adult_title'))).toBeVisible();
	await expectWayOutAtTop(page, message('adult_back_to_players'));

	const words = (await page.locator('[data-gate-words]').textContent())?.trim();
	const asked = numbers.find((number) => number.words === words)?.value;
	await page.getByLabel(message('adult_gate_answer_label')).fill(String(asked));
	await button(page, message('adult_gate_enter')).click();
	await expect(page.locator('[data-adult-home]')).toBeVisible();
	await expectWayOutAtTop(page, message('adult_back_to_players'));

	await page.getByRole('button', { name: child.name }).click();
	await expect(heading(page, message('adult_child_title', { name: child.name }))).toBeVisible();
	await expectWayOutAtTop(page, message('adult_back_to_list'));

	await page.locator('[data-child-settings]').click();
	await expect(heading(page, message('adult_settings_title', { name: child.name }))).toBeVisible();
	await expectWayOutAtTop(page, message('adult_settings_back', { name: child.name }));

	await page.keyboard.press('Escape');
	await page.locator('[data-child-sheet]').click();
	await expect(heading(page, message('adult_sheet_title', { name: child.name }))).toBeVisible();
	await expectWayOutAtTop(page, message('adult_sheet_back', { name: child.name }));
});

test('puts the way out of the pages for adults at the top of the page', async ({ page }) => {
	for (const key of [
		'info_link_adults',
		'info_link_professionals',
		'info_link_privacy',
		'info_link_accessibility',
		'info_link_credits'
	]) {
		await openPage(page, '/');
		await page
			.locator('footer')
			.getByRole('link', { name: message(key), exact: true })
			.click();
		await expect(heading(page, message(key))).toBeVisible();
		await expectWayOutAtTop(page, message('info_back_home'));
		await button(page, message('info_back_home')).click();
		await expect(heading(page, message('app_name'))).toBeVisible();
	}
});

test('keeps the race choice in view with the games, and the race above the game', async ({
	page
}) => {
	const racer = withGhost(
		advancedProfile({ name: 'Lou', passed: { [FIRST.id]: PASSED_STARS } }),
		FIRST.id,
		{
			recordedAt: 1,
			charCount: 20,
			activeMs: 600_000,
			points: [{ correctChars: 20, activeMs: 600_000 }]
		}
	);
	await openPage(page, '/jouer');
	await installProfile(page, racer);
	await reloadPage(page);
	await page.getByRole('button', { name: racer.name }).click();
	await page.getByRole('button', { name: FIRST.title }).click();
	await throughStory(page, heading(page, FIRST.title));

	const choice = page.locator('[data-race-choice]');
	const proposed = page.locator('button[data-proposed]');
	await expect(proposed).toBeInViewport();
	await expect(choice).toBeInViewport({ ratio: 1 });

	await page.getByRole('checkbox', { name: new RegExp(message('play_intro_race')) }).check();
	await proposed.click();
	const track = page.locator('[data-ghost-track]');
	await expect(track).toBeInViewport({ ratio: 1 });
	await expect(page.locator('.text-zone')).toBeInViewport({ ratio: 1 });
});

// The kitchen and space offer three games since the river came (ADR-057): the same room is needed.
for (const worldIndex of [1, 2]) {
	test(`keeps the three games and the race choice in view in world ${worldIndex + 1}`, async ({
		page
	}) => {
		const lessons = progressionWorlds.flatMap((world) => world.lessons);
		const lesson = progressionWorlds[worldIndex]?.lessons[0] as Lesson;
		const before = lessons.slice(
			0,
			lessons.findIndex((item) => item.id === lesson.id)
		);
		const racer = withGhost(
			advancedProfile({
				name: 'Lou',
				passed: Object.fromEntries(
					[...before, lesson].map((item) => [item.id, PASSED_STARS] as const)
				)
			}),
			lesson.id,
			{
				recordedAt: 1,
				charCount: 20,
				activeMs: 600_000,
				points: [{ correctChars: 20, activeMs: 600_000 }]
			}
		);
		await openPage(page, '/jouer');
		await installProfile(page, racer);
		await reloadPage(page);
		await page.getByRole('button', { name: racer.name }).click();
		await page.getByRole('button', { name: lesson.title }).click();
		await throughStory(page, heading(page, lesson.title));

		const games = page.locator('button[data-game]');
		await expect(games).toHaveCount(3);
		for (const game of await games.all()) await expect(game).toBeInViewport();
		await expect(page.locator('button[data-game="river"]')).toBeInViewport({ ratio: 1 });
		await expect(page.locator('[data-race-choice]')).toBeInViewport({ ratio: 1 });
	});
}

// The fifth lesson of the kitchen proposes the tower, whose text zone is the narrowest, and its
// game always has more groups than the reminder waits for (it never shows after the last one).
test('does not move the keyboard when the reminder to look at the screen shows', async ({
	page
}) => {
	await page.addInitScript(() => {
		document.addEventListener('DOMContentLoaded', () => {
			const style = document.createElement('style');
			style.textContent =
				':root{--dd-duration-reward-delay:1ms;--dd-duration-reward:1ms;--dd-duration-reminder:4000ms}';
			document.head.append(style);
		});
	});
	const lessons = progressionWorlds.flatMap((world) => world.lessons);
	const kitchen = progressionWorlds[1]?.lessons[4] as Lesson;
	const before = lessons.slice(
		0,
		lessons.findIndex((lesson) => lesson.id === kitchen.id)
	);
	const child = advancedProfile({
		name: 'Lou',
		passed: Object.fromEntries(before.map((lesson) => [lesson.id, PASSED_STARS]))
	});
	await openPage(page, '/jouer');
	await installProfile(page, child);
	await reloadPage(page);
	await page.getByRole('button', { name: child.name }).click();
	await page.getByRole('button', { name: kitchen.title }).click();
	await throughStory(page, page.locator('button[data-proposed]'));
	await page.locator('button[data-proposed]').click();

	const label = page.locator('.target-text > .dd-visually-hidden').first();
	const keyboard = page.locator('.keyboard');
	const settled = () =>
		page.evaluate(async () => {
			await document.fonts.ready;
			await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
		});
	let top: number | undefined;
	for (let group = 1; group <= REMINDER_EVERY; group++) {
		await expect(label).toHaveText(GROUP_LABEL);
		if (group === REMINDER_EVERY) {
			await settled();
			top = (await keyboard.boundingBox())?.y;
		}
		await page.keyboard.type(
			GROUP_LABEL.exec((await label.textContent()) ?? '')?.groups?.['text'] ?? ''
		);
		if (group === REMINDER_EVERY) break;
		await expect(async () => {
			await page.keyboard.press('Enter');
			await expect(label).toHaveText(GROUP_LABEL, { timeout: 500 });
		}).toPass();
	}
	await expect(page.getByText(message('game_shared_look_reminder'))).toBeVisible();
	// Measured once the page has laid the reminder out: a poll would take the first, unmoved value.
	await settled();
	expect((await keyboard.boundingBox())?.y).toBe(top);
});

/*
 * Everything essential on one screen (E-03, E-05, E-08, E-10, E-20): the screens a child plays on,
 * measured as they open. A layout measured in one engine holds in the others (choice 21 of the
 * owner, ADR-075): these checks run on Chromium only.
 */

/**
 * The screens a child plays on: a laptop window, and a 1366 × 768 laptop once the task bar and the
 * bars of the browser are taken (625 to 657 pixels are left; Chrome with its bookmarks: 625).
 */
const SCREENS = {
	laptop: { width: 1280, height: 720 },
	'short laptop': { width: 1366, height: 625 }
} as const;
/** A tall screen: the game sits in the middle of it, and its scene grows (E-20). */
const TALL_SCREEN = { width: 1920, height: 1080 } as const;
/** A laptop of 1280 × 720 at 200 % zoom (WCAG 1.4.4). */
const ZOOMED_LAPTOP = { width: 640, height: 360 } as const;
/** 1280 pixels at 400 % zoom (WCAG 1.4.10). */
const NARROW = { width: 320, height: 640 } as const;
/** A rounding of the browser, in CSS pixels. */
const SUBPIXEL = 1;
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const ERASE_LABEL = templateRegex('ui_target_text_erase');

const everyLesson = progressionWorlds.flatMap((world) => world.lessons);
const firstOfEachWorld = progressionWorlds.map((world) => world.lessons[0] as Lesson);
const playRules = readJson<{ rules: { maxGroupCount: number; paceRecentPlays: number } }>(
	'content/fr/progression/azerty-decouverte.json'
).rules;

function lessonNamed(id: string): Lesson {
	const lesson = everyLesson.find((item) => item.id === id);
	if (!lesson) throw new Error(`Unknown lesson ${id}`);
	return lesson;
}

const CAPITALS = lessonNamed('fr.lesson.grandes-majuscules');
const DIGITS = lessonNamed('fr.lesson.score-du-match');
const REPAIRS = lessonNamed('fr.lesson.reparer-message');
const TEXT_ONLY = lessonNamed('fr.lesson.message-t-rex');
const KITCHEN = progressionWorlds[1]?.lessons[0] as Lesson;
const CIRCUIT = progressionWorlds[4]?.lessons[0] as Lesson;

/** A child who has passed every lesson before this one: it is the lesson to play. */
function childBefore(lesson: Lesson, name = 'Lou'): Profile {
	const before = everyLesson.slice(
		0,
		everyLesson.findIndex((item) => item.id === lesson.id)
	);
	return advancedProfile({
		name,
		passed: Object.fromEntries(before.map((item) => [item.id, PASSED_STARS]))
	});
}

/** Correct characters per minute of the latest plays: a fast child gets the longest plays. */
const FAST_PACE = 100;
/** Seeds tried in turn for a play of the most groups: the number of groups depends on the draw. */
const SEEDS = [7, 1, 2, 3, 4, 5, 6, 8, 9, 10];

/**
 * A fast child who has passed the lesson, so that a play of it holds the most groups (ADR-084),
 * with a slow ghost of it to race.
 */
function fastChildThrough(lesson: Lesson): Profile {
	const before = childBefore(lesson);
	const child = {
		...before,
		progress: {
			...before.progress,
			lessons: {
				...before.progress.lessons,
				[lesson.id]: { bestAccuracy: 100, stars: PASSED_STARS, attempts: 1, lastPlayedAt: 1 }
			}
		}
	};
	const now = Date.now();
	const sessions = Array.from({ length: playRules.paceRecentPlays }, (_, index): SessionRecord => ({
		lessonId: lesson.id,
		gameId: 'tower',
		finishedAt: now - (playRules.paceRecentPlays - index) * 60_000,
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
	}));
	return withGhost({ ...child, sessions }, lesson.id, {
		recordedAt: 1,
		charCount: 20,
		activeMs: 600_000,
		points: [{ correctChars: 20, activeMs: 600_000 }]
	});
}

/** The map of this profile; a page that has shown a map already goes back to the last player. */
async function reachMapAs(page: Page, profile: Profile) {
	await openPage(page, '/jouer');
	await installProfile(page, profile);
	await reloadPage(page);
	const map = heading(page, message('play_map_title'));
	const player = page.getByRole('button', { name: profile.name, exact: true });
	await expect(map.or(player)).toBeVisible();
	if (await player.isVisible()) await player.click();
	await expect(map).toBeVisible();
}

async function openIntro(page: Page, lesson: Lesson) {
	await page.getByRole('button', { name: lesson.title }).click();
	await throughStory(page, heading(page, lesson.title));
}

/** Lets the page lay itself out: fonts loaded, two frames drawn. */
async function settle(page: Page) {
	await page.evaluate(async () => {
		await document.fonts.ready;
		await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
	});
}

/** The bottom of the bar of the player when it stays at the top of the page; 0 otherwise. */
function barBottom(page: Page): Promise<number> {
	return page.evaluate(() => {
		const bar = document.querySelector('[data-top-bar][data-sticky]');
		return bar ? bar.getBoundingClientRect().bottom : 0;
	});
}

/** The element is whole on the screen as it is scrolled now, and not under the bar of the player. */
async function expectInSight(page: Page, element: Locator, what: string) {
	await expect(element, what).toBeVisible();
	const top = await barBottom(page);
	const box = await element.evaluate((node) => {
		const rect = node.getBoundingClientRect();
		return { ...rect.toJSON(), screenWidth: innerWidth, screenHeight: innerHeight } as {
			top: number;
			bottom: number;
			left: number;
			right: number;
			screenWidth: number;
			screenHeight: number;
		};
	});
	expect(box.top, `${what}: top`).toBeGreaterThanOrEqual(top - SUBPIXEL);
	expect(box.bottom, `${what}: bottom`).toBeLessThanOrEqual(box.screenHeight + SUBPIXEL);
	expect(box.left, `${what}: left`).toBeGreaterThanOrEqual(-SUBPIXEL);
	expect(box.right, `${what}: right`).toBeLessThanOrEqual(box.screenWidth + SUBPIXEL);
}

/** The page opens at its top, or its bar stays in view at the top of the screen. */
async function expectOpenAtTop(page: Page) {
	const scrolled = await page.evaluate(() => Math.round(scrollY));
	if (scrolled === 0) return;
	await expectInSight(page, page.locator('[data-top-bar]'), 'bar of the player');
	expect(await barBottom(page), 'the bar stays at the top').toBeGreaterThan(0);
}

/** Nothing to scroll: the whole page holds on the screen. */
async function expectNoScroll(page: Page, what: string) {
	const sizes = await page.evaluate(() => ({
		page: document.documentElement.scrollHeight,
		screen: innerHeight,
		wide: document.documentElement.scrollWidth,
		width: innerWidth
	}));
	expect(sizes.page, `${what}: height of the page`).toBeLessThanOrEqual(sizes.screen + SUBPIXEL);
	expect(sizes.wide, `${what}: width of the page`).toBeLessThanOrEqual(sizes.width + SUBPIXEL);
}

function groupLabel(page: Page): Locator {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

/** A group to type is on screen, whole or begun with a mistake to erase. */
async function expectGroup(page: Page) {
	await expect(groupLabel(page)).toHaveText(
		new RegExp(`${GROUP_LABEL.source}|${ERASE_LABEL.source}`, 's')
	);
}

/** Pause, the text, the finger, the keyboard and the scene of a game, all in view at once. */
async function expectGameInSight(page: Page, what: string, options: { keyboard?: boolean } = {}) {
	await settle(page);
	expect(await page.evaluate(() => Math.round(scrollY)), `${what}: opened at its top`).toBe(0);
	await expectNoScroll(page, what);
	await expectInSight(page, button(page, message('game_shared_pause')), `${what}: Pause`);
	await expectInSight(page, page.locator('.stage > .scene'), `${what}: scene`);
	await expectInSight(page, page.locator('.text-zone'), `${what}: text`);
	if (options.keyboard === false) {
		await expect(page.locator('.keyboard')).toHaveCount(0);
		return;
	}
	// The finger to use, or what to erase first in a group that arrives with a mistake.
	await expectInSight(page, page.locator('.text-zone .slot'), `${what}: finger`);
	await expectInSight(page, page.locator('.keyboard'), `${what}: keyboard`);
}

async function startDevGame(page: Page, gameId: string, options: { keyboard?: boolean } = {}) {
	await openPage(page, '/dev/jeux');
	await page.getByRole('radio', { name: message(`game_${gameId}_title`) }).check();
	if (options.keyboard === false) {
		await page.getByRole('checkbox', { name: message('dev_games_keyboard_label') }).uncheck();
	}
	await button(page, message('dev_games_play')).click();
	await expectGroup(page);
}

/** Makes the exercises of the page the same at every run. */
async function seedExercises(page: Page, seed: number) {
	await page.evaluate(
		([source, value]) => {
			Math.random = new Function(`return (${source})`)()(value);
		},
		[seededRng.toString(), seed] as const
	);
}

/**
 * Starts the game of the lesson, race on, with a play of the most groups: the seeds are tried in
 * turn, the game left for the map between two.
 */
async function startLongestPlay(page: Page, lesson: Lesson, gameId: string) {
	const totals: number[] = [];
	for (const seed of SEEDS) {
		await openIntro(page, lesson);
		await seedExercises(page, seed);
		await page.getByRole('checkbox', { name: new RegExp(message('play_intro_race')) }).check();
		await page.locator(`button[data-game="${gameId}"]`).click();
		await expectGroup(page);
		const total = await groupTotal(page, gameId);
		if (total === playRules.maxGroupCount) return;
		totals.push(total);
		await page.keyboard.press('Escape');
		await button(page, message('game_shared_quit')).click();
		await expect(heading(page, message('play_map_title'))).toBeVisible();
	}
	throw new Error(
		`No play of ${playRules.maxGroupCount} groups of ${gameId}: ${totals.join(', ')}`
	);
}

const TOTAL_TOKEN = '__total__';

/** How many groups the exercise of the game on screen holds, read in the name of its progress. */
async function groupTotal(page: Page, gameId: string): Promise<number> {
	const text = plural(`game_${gameId}_progress`, 0, { done: 0, total: TOTAL_TOKEN });
	const pattern = new RegExp(
		`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(TOTAL_TOKEN, '(?<total>\\d+)')}$`
	);
	const picture = page.getByRole('img', { name: pattern });
	await expect(picture).toBeVisible();
	return Number(pattern.exec((await picture.getAttribute('aria-label')) ?? '')?.groups?.['total']);
}

test.describe('on the screens children play on', () => {
	test.skip(
		({ browserName }) => browserName !== 'chromium',
		'A layout measured once: it does not depend on the engine (choice 21 of the owner, ADR-075)'
	);

	test.beforeEach(async ({ page }) => {
		await shortenRewards(page);
	});

	for (const [screenName, screen] of Object.entries(SCREENS)) {
		test.describe(`on a ${screenName} screen (${screen.width} × ${screen.height})`, () => {
			test.beforeEach(async ({ page }) => {
				await page.setViewportSize(screen);
			});

			for (const game of GAMES) {
				test(`shows Pause, the text, the finger, the keyboard and the scene of ${game.id} at once`, async ({
					page
				}) => {
					await startDevGame(page, game.id);
					await expectGameInSight(page, game.id);

					// The largest text of the settings.
					await page.evaluate(() => {
						document.documentElement.dataset['textScale'] = 'xl';
					});
					await expectGameInSight(page, `${game.id}, largest text`);

					await startDevGame(page, game.id, { keyboard: false });
					await expectGameInSight(page, `${game.id} without the keyboard`, { keyboard: false });
				});
			}

			for (const [gameId, lesson] of [
				['tower', KITCHEN],
				['river', KITCHEN],
				['train', CIRCUIT]
			] as const) {
				test(`keeps a play of the most groups of ${gameId} on the screen, race included`, async ({
					page
				}) => {
					test.slow();
					await reachMapAs(page, fastChildThrough(lesson));
					await startLongestPlay(page, lesson, gameId);
					await expectInSight(page, page.locator('[data-ghost-track]'), 'race');
					await expectGameInSight(page, `${gameId}, ${playRules.maxGroupCount} groups`);
				});
			}

			for (const lesson of [DIGITS, REPAIRS]) {
				test(`keeps the game of « ${lesson.title} » on the screen, its text and Pause in view`, async ({
					page
				}) => {
					await reachMapAs(page, childBefore(lesson));
					await openIntro(page, lesson);
					await page.locator('button[data-proposed]').click();
					await expectGroup(page);
					await expectGameInSight(page, lesson.title);
				});
			}

			// The opening of the first world, and the longest opening, that of the zoo.
			for (const lesson of [firstOfEachWorld[0] as Lesson, firstOfEachWorld[3] as Lesson]) {
				test(`shows the story before « ${lesson.title} » with its picture and Continue whole`, async ({
					page
				}) => {
					await reachMapAs(page, childBefore(lesson));
					await page.getByRole('button', { name: lesson.title }).click();
					const proceed = page.locator('[data-story-continue]');
					await expect(proceed).toBeVisible();
					await settle(page);
					expect(await page.evaluate(() => Math.round(scrollY))).toBe(0);
					await expectInSight(page, page.locator('svg.story-picture'), 'picture of the story');
					await expectInSight(page, page.locator('figcaption'), 'text of the story');
					await expectInSight(page, proceed, 'Continue');
				});
			}

			for (const lesson of [...firstOfEachWorld, CAPITALS, DIGITS, REPAIRS]) {
				test(`shows the instruction, the keys and the games of « ${lesson.title} » together`, async ({
					page
				}) => {
					await reachMapAs(page, childBefore(lesson));
					await openIntro(page, lesson);
					await settle(page);
					await expectOpenAtTop(page);
					await expectInSight(page, page.locator('.intro'), 'instruction');
					const keys = page.locator('[data-intro-keys]');
					if ((await keys.count()) > 0) {
						await expectInSight(page, keys.locator('.keyboard'), 'keyboard');
						await expectInSight(page, keys.locator('.hints'), 'fingers');
					}
					const notice = page.locator('[data-erasing-notice]');
					if ((await notice.count()) > 0)
						await expectInSight(page, notice, 'sentence of the world');
					const games = page.locator('button[data-game]');
					const boxes: { top: number; bottom: number }[] = [];
					for (const game of await games.all()) {
						// Its place in the list: a focused or pointed game is drawn a little larger.
						const place = game.locator('xpath=..');
						await expectInSight(page, place, `game ${await game.getAttribute('data-game')}`);
						const box = await place.boundingBox();
						boxes.push({ top: box?.y ?? 0, bottom: (box?.y ?? 0) + (box?.height ?? 0) });
					}
					// The games of the world on one row: each one starts above the end of every other.
					for (const box of boxes) {
						expect(box.top).toBeLessThan(Math.min(...boxes.map((other) => other.bottom)));
					}
				});
			}

			for (const [name, profile] of [
				['a new player', advancedProfile({ name: 'Lou', passed: {} })],
				['a player far along', childBefore(CIRCUIT)]
			] as const) {
				test(`shows the bar of the player and the lesson to play on the map of ${name}`, async ({
					page
				}) => {
					await reachMapAs(page, profile);
					await settle(page);
					await expectOpenAtTop(page);
					const bar = page.locator('[data-top-bar]');
					await expectInSight(page, bar, 'bar of the player');
					await expectInSight(page, bar.locator('.line'), 'one line of the bar');
					const lineHeight = await bar.locator('.line').evaluate((line) => line.clientHeight);
					const buttonHeight = await button(page, message('play_settings_open')).evaluate(
						(node) => (node as HTMLElement).offsetHeight
					);
					expect(lineHeight, 'the bar holds on one line').toBeLessThan(buttonHeight * 2);
					await expectInSight(page, page.locator('.stop[data-companion] .node'), 'lesson to play');

					// Down the map, the bar stays at the top.
					await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
					await settle(page);
					await expectInSight(page, bar, 'bar of the player at the bottom of the map');
				});
			}
		});
	}

	test('opens the map of a new player at its top, without scrolling to the first lesson', async ({
		page
	}) => {
		await page.setViewportSize(SCREENS['short laptop']);
		await reachMapAs(page, advancedProfile({ name: 'Lou', passed: {} }));
		await settle(page);
		expect(await page.evaluate(() => Math.round(scrollY))).toBe(0);
	});

	test('names the keys a lesson works, and leaves the keyboard out when none is said', async ({
		page
	}) => {
		test.slow();
		await page.setViewportSize(SCREENS.laptop);
		const keysHeading = page.locator('#intro-keys-heading');
		for (const [lesson, title] of [
			[CAPITALS, message('play_intro_practice_other')],
			[REPAIRS, message('play_intro_practice_one')],
			[DIGITS, message('play_intro_keys_other')],
			[firstOfEachWorld[5] as Lesson, message('play_intro_keys_one')]
		] as const) {
			await reachMapAs(page, childBefore(lesson));
			await openIntro(page, lesson);
			await expect(keysHeading).toHaveText(title);
		}
		// The five digits of the left hand, said on one line.
		await reachMapAs(page, childBefore(DIGITS));
		await openIntro(page, DIGITS);
		await expect(page.locator('.hints li')).toHaveCount(1);
		await expect(page.locator('[data-hand-line="left"]')).toHaveText(
			message('play_intro_hand_keys_shift', {
				keys: '1 2 3 4 5',
				hand: message('play_intro_hand_left')
			})
		);
		// A text lesson that brings no key: no title, no keyboard.
		await reachMapAs(page, childBefore(TEXT_ONLY));
		await openIntro(page, TEXT_ONLY);
		await expect(page.locator('[data-intro-keys]')).toHaveCount(0);
		await expect(page.locator('.keyboard')).toHaveCount(0);
	});

	test('keeps the line being typed in view in a long text, without sliding in calm motion', async ({
		page
	}) => {
		test.slow();
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.setViewportSize(SCREENS['short laptop']);
		await reachMapAs(page, childBefore(firstOfEachWorld[4] as Lesson));
		await openIntro(page, firstOfEachWorld[4] as Lesson);
		await page.locator('button[data-proposed]').click();
		const window = page.locator('.target-text .text');
		// Typed group by group up to one that holds more lines than the text shows.
		for (;;) {
			await expectGroup(page);
			const overflows = await window.evaluate((box) => box.scrollHeight > box.clientHeight + 1);
			if (overflows) break;
			const label = (await groupLabel(page).textContent()) ?? '';
			await page.keyboard.type(GROUP_LABEL.exec(label)?.groups?.['text'] ?? '');
			await expect(async () => {
				await page.keyboard.press('Enter');
				await expect(groupLabel(page)).not.toHaveText(label, { timeout: 500 });
			}).toPass({ timeout: 15_000 });
		}
		const text = GROUP_LABEL.exec((await groupLabel(page).textContent()) ?? '')?.groups?.['text'];
		const graphemes = [
			...new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(text ?? '')
		];
		for (const part of graphemes.slice(0, Math.ceil(graphemes.length * 0.75))) {
			await page.keyboard.type(part.segment);
		}
		const current = page.locator('.target-text [data-state="current"]');
		await expectInSight(page, current, 'letter to type');
		const inWindow = await current.evaluate((cell) => {
			const box = cell.closest('.text')?.getBoundingClientRect();
			const own = cell.getBoundingClientRect();
			return box !== undefined && own.top >= box.top - 1 && own.bottom <= box.bottom + 1;
		});
		expect(inWindow).toBe(true);
		expect(await window.evaluate((box) => box.scrollTop)).toBeGreaterThan(0);
		await expectInSight(page, button(page, message('game_shared_pause')), 'Pause');
	});

	test('keeps the focus clear of the bar that stays at the top of the map (2.4.11)', async ({
		page
	}) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.setViewportSize(SCREENS['short laptop']);
		await reachMapAs(page, childBefore(CIRCUIT));
		await expect(page.getByRole('button', { name: CIRCUIT.title })).toBeFocused();
		// Back up the page with Shift+Tab: each item scrolls into view from the top, under the bar.
		for (let press = 0; press < 6; press++) {
			await page.keyboard.press('Shift+Tab');
			const covered = await page.evaluate(() => {
				const focused = document.activeElement;
				const bar = document.querySelector('[data-top-bar]');
				if (!(focused instanceof HTMLElement) || focused === document.body) return false;
				if (!bar || bar.contains(focused)) return false;
				return focused.getBoundingClientRect().top < bar.getBoundingClientRect().bottom;
			});
			expect(covered).toBe(false);
			if (await page.locator('[data-top-bar] :focus').count()) break;
		}
	});

	test('folds the bar of the player at 320 pixels, its buttons still named', async ({ page }) => {
		await page.setViewportSize(NARROW);
		await reachMapAs(page, advancedProfile({ name: 'Maximilien-Alexandre', passed: {} }));
		const bar = page.locator('[data-top-bar]');
		await expect(bar.locator('.line')).toHaveAttribute('data-folded');
		for (const key of ['play_companion_open', 'play_hideout_open', 'play_settings_open']) {
			await expect(bar.getByRole('button', { name: message(key) })).toBeVisible();
		}
		const sideways = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(sideways, 'nothing scrolls sideways').toBeLessThanOrEqual(SUBPIXEL);
		const lines = await bar.locator('.line').evaluate((line) => line.clientHeight);
		const buttonHeight = await button(page, message('play_settings_open')).evaluate(
			(node) => (node as HTMLElement).offsetHeight
		);
		expect(lines, 'two lines at most').toBeLessThan(buttonHeight * 3);
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
		await expectInSight(page, bar, 'bar at the bottom of the map');
	});

	test('lets a place of the hideout be reached and chosen at 200 % zoom', async ({ page }) => {
		await page.setViewportSize(ZOOMED_LAPTOP);
		const child = advancedProfile({
			name: 'Lou',
			passed: Object.fromEntries(everyLesson.map((lesson) => [lesson.id, PASSED_STARS]))
		});
		await reachMapAs(page, child);
		await button(page, message('play_hideout_open')).click();
		await expect(heading(page, message('play_hideout_title'))).toBeVisible();
		const places = page.locator('button[data-place]');
		// A click is refused when something covers the place: the cabin never does.
		await places.last().click();
		await expect(page.locator('#hideout-chosen')).toBeFocused();
		await expectInSight(page, page.locator('#hideout-chosen'), 'chosen place');
	});

	test('centres a game on a tall screen and lets its scene grow', async ({ page }) => {
		await page.setViewportSize(TALL_SCREEN);
		await startDevGame(page, 'tower');
		await settle(page);
		const room = await page.evaluate(() => {
			const game = document.querySelector('.game');
			const top = document.querySelector('.game .top')?.getBoundingClientRect();
			const bottom = document.querySelector('.game .bottom')?.getBoundingClientRect();
			const scene = document.querySelector('.stage > .scene')?.getBoundingClientRect();
			return {
				above: top?.top ?? 0,
				below: innerHeight - (bottom?.bottom ?? 0),
				scene: scene?.width ?? 0,
				game: game?.getBoundingClientRect().width ?? 0
			};
		});
		expect(Math.abs(room.above - room.below)).toBeLessThan(TALL_SCREEN.height / 20);
		// Wider than the scene of a laptop (26rem, 416 pixels).
		expect(room.scene).toBeGreaterThan(416);
	});

	test('has no axe violation on the map, the lesson screen and a game of a short laptop', async ({
		page
	}) => {
		test.slow();
		await page.setViewportSize(SCREENS['short laptop']);
		const lesson = firstOfEachWorld[5] as Lesson;
		await reachMapAs(page, childBefore(lesson));
		await settle(page);
		expect((await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()).violations).toEqual([]);
		await openIntro(page, lesson);
		await settle(page);
		expect((await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()).violations).toEqual([]);
		await page.locator('button[data-proposed]').click();
		await expectGroup(page);
		await settle(page);
		expect((await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()).violations).toEqual([]);
	});
});
