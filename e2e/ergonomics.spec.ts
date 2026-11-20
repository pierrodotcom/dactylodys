import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import type { StarCount } from '../src/lib/engine/progression/types';
import { seededRng } from '../src/lib/engine/progression/test-support';
import { GAMES } from '../src/lib/games/registry';
import { withAdultWords, withGhost } from '../src/lib/state/profile';
import type { Profile, SessionRecord } from '../src/lib/state/types';
import { CHROMIUM_ONLY } from './engines';
import {
	advancedProfile,
	answerCheckKey,
	expectNoAxeViolation,
	installProfile,
	keyboardCheckKeys,
	loadMessages,
	openPage,
	passReward,
	readJson,
	reloadPage,
	setRewards,
	throughStory
} from './support';

/*
 * Where things are on the screen (ADR-046, E-03 to E-20): a layout measured in one engine holds in
 * the others (choice 21 of the owner, ADR-075), so every check of this file runs on Chromium only.
 */

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
/** The reminder to look at the screen comes once this many characters are typed (audit P-20). */
const FIRST_REMINDER_AFTER = readJson<{ lookReminder: { firstAfterChars: number } }>(
	'content/common/play-rules.json'
).lookReminder.firstAfterChars;

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

test('puts the way out of every screen at the top of the page', CHROMIUM_ONLY, async ({ page }) => {
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

test(
	'gives the keyboard check a way out at the top of its steps and of its two results, and Escape takes it',
	CHROMIUM_ONLY,
	async ({ page }) => {
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
	}
);

test(
	'keeps the hideout in view while the child goes down the objects to set down',
	CHROMIUM_ONLY,
	async ({ page }) => {
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
	}
);

/** The element is entirely on the screen, as it is scrolled now. */
async function expectInView(element: Locator) {
	const box = await element.evaluate((node) => {
		const rect = node.getBoundingClientRect();
		return { top: rect.top, bottom: rect.bottom, height: innerHeight };
	});
	expect(box.top).toBeGreaterThanOrEqual(0);
	expect(box.bottom).toBeLessThanOrEqual(box.height);
}

test(
	'puts the way out of the adult space at the top of each of its screens',
	CHROMIUM_ONLY,
	async ({ page }) => {
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
		await expect(
			heading(page, message('adult_settings_title', { name: child.name }))
		).toBeVisible();
		await expectWayOutAtTop(page, message('adult_settings_back', { name: child.name }));

		await page.keyboard.press('Escape');
		await page.locator('[data-child-sheet]').click();
		await expect(heading(page, message('adult_sheet_title', { name: child.name }))).toBeVisible();
		await expectWayOutAtTop(page, message('adult_sheet_back', { name: child.name }));
	}
);

test(
	'puts the way out of the pages for adults at the top of the page',
	CHROMIUM_ONLY,
	async ({ page }) => {
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
	}
);

test(
	'keeps the race choice in view with the games, and the race above the game',
	CHROMIUM_ONLY,
	async ({ page }) => {
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
	}
);

// The kitchen and space offer three games since the river came (ADR-057): the same room is needed.
for (const worldIndex of [1, 2]) {
	test(
		`keeps the three games and the race choice in view in world ${worldIndex + 1}`,
		CHROMIUM_ONLY,
		async ({ page }) => {
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
		}
	);
}

// The fifth lesson of the kitchen proposes the tower, whose text zone is the narrowest, and its
// game always has more characters than the reminder waits for (it never shows after the last group).
test(
	'does not move the keyboard when the reminder to look at the screen shows',
	CHROMIUM_ONLY,
	async ({ page }) => {
		// The reminder shows with the reward, which stays: it is measured however slow the machine is.
		await setRewards(page, 'hold');
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
		const graphemes = new Intl.Segmenter('fr', { granularity: 'grapheme' });
		let top: number | undefined;
		let typed = 0;
		for (;;) {
			await expect(label).toHaveText(GROUP_LABEL);
			const text = GROUP_LABEL.exec((await label.textContent()) ?? '')?.groups?.['text'] ?? '';
			typed += [...graphemes.segment(text)].length;
			// The group after which the reminder comes: the keyboard is measured before it.
			const last = typed >= FIRST_REMINDER_AFTER;
			if (last) {
				await settled();
				top = (await keyboard.boundingBox())?.y;
			}
			await page.keyboard.type(text);
			if (last) break;
			await passReward(page);
		}
		await expect(page.locator('[data-look-reminder]')).toBeVisible();
		// Measured once the page has laid the reminder out: a poll would take the first, unmoved value.
		await settled();
		expect((await keyboard.boundingBox())?.y).toBe(top);
	}
);

/*
 * Everything essential on one screen (E-03, E-05, E-08, E-10, E-20): the screens a child plays on,
 * measured as they open.
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
/** A large screen, where the pictures of the games reach their largest. */
const LARGE_SCREEN = { width: 2560, height: 1440 } as const;
/** A laptop of 1280 × 720 at 200 % zoom (WCAG 1.4.4). */
const ZOOMED_LAPTOP = { width: 640, height: 360 } as const;
/** 1280 pixels at 400 % zoom (WCAG 1.4.10). */
const NARROW = { width: 320, height: 640 } as const;
/** A rounding of the browser, in CSS pixels. */
const SUBPIXEL = 1;
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

/** The bar of the player is whole at the top of the screen, as the page is scrolled now. */
async function expectBarAtTop(page: Page) {
	const bar = await page.locator('[data-top-bar]').evaluate((node) => {
		const box = node.getBoundingClientRect();
		return { top: box.top, bottom: box.bottom, screenHeight: innerHeight };
	});
	expect(Math.abs(bar.top), 'the bar is at the top of the screen').toBeLessThanOrEqual(SUBPIXEL);
	expect(bar.bottom, 'the bar leaves most of the screen').toBeLessThan(bar.screenHeight / 2);
}

/** The page opens at its top, or its bar stays in view at the top of the screen. */
async function expectOpenAtTop(page: Page) {
	const scrolled = await page.evaluate(() => Math.round(scrollY));
	if (scrolled === 0) return;
	await expectBarAtTop(page);
	expect(await barBottom(page), 'the bar stays while the page scrolls').toBeGreaterThan(0);
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

async function startDevGame(
	page: Page,
	gameId: string,
	options: { keyboard?: boolean; scenes?: boolean } = {}
) {
	await openPage(page, '/dev/jeux');
	await page.getByRole('radio', { name: message(`game_${gameId}_title`) }).check();
	if (options.keyboard === false) {
		await page.getByRole('checkbox', { name: message('dev_games_keyboard_label') }).uncheck();
	}
	if (options.scenes) {
		await page.getByRole('checkbox', { name: message('dev_games_scenes_label') }).check();
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

/** Opens the game of the lesson, race on, with the exercise of this seed. */
async function startSeededPlay(page: Page, lesson: Lesson, gameId: string, seed: number) {
	await openIntro(page, lesson);
	await seedExercises(page, seed);
	await page.getByRole('checkbox', { name: new RegExp(message('play_intro_race')) }).check();
	await page.locator(`button[data-game="${gameId}"]`).click();
	await expectGroup(page);
	return groupTotal(page, gameId);
}

/**
 * Starts the game of the lesson, race on, with its longest play: the seeds are tried in turn, the
 * game left for the map between two; a play of the most groups ends the search, else the longest
 * one found is played again, never shorter than `atLeast` groups.
 */
async function startLongestPlay(
	page: Page,
	lesson: Lesson,
	gameId: string,
	atLeast = playRules.maxGroupCount
) {
	const totals: number[] = [];
	for (const seed of SEEDS) {
		const total = await startSeededPlay(page, lesson, gameId, seed);
		if (total === playRules.maxGroupCount) return;
		totals.push(total);
		await page.keyboard.press('Escape');
		await button(page, message('game_shared_quit')).click();
		await expect(heading(page, message('play_map_title'))).toBeVisible();
	}
	const longest = Math.max(...totals);
	if (longest < atLeast) {
		throw new Error(`No play of ${atLeast} groups of ${gameId}: ${totals.join(', ')}`);
	}
	expect(await startSeededPlay(page, lesson, gameId, SEEDS[totals.indexOf(longest)] ?? 0)).toBe(
		longest
	);
}

/** Groups of the longest play of the train in the lesson of the digits (ADR-094). */
const TRAIN_LONGEST_PLAY = 10;

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

test.describe('on the screens children play on', CHROMIUM_ONLY, () => {
	test.beforeEach(async ({ page }) => {
		// Whole journeys, from the players to a game: on a busy computer they take their time.
		test.slow();
		await setRewards(page, 'instant');
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

			// The train, in the lesson of the digits: since its written warm-ups got shorter (ADR-094),
			// its longest plays there hold 10 groups (the phrases of the circuit, 11 at most).
			for (const [gameId, lesson, atLeast] of [
				['tower', KITCHEN, playRules.maxGroupCount],
				['river', KITCHEN, playRules.maxGroupCount],
				['train', DIGITS, TRAIN_LONGEST_PLAY]
			] as const) {
				test(`keeps a play of the most groups of ${gameId} on the screen, race included`, async ({
					page
				}) => {
					await reachMapAs(page, fastChildThrough(lesson));
					await startLongestPlay(page, lesson, gameId, atLeast);
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
					await expectBarAtTop(page);
					const bar = page.locator('[data-top-bar]');
					const lineHeight = await bar.locator('.line').evaluate((line) => line.clientHeight);
					const buttonHeight = await button(page, message('play_settings_open')).evaluate(
						(node) => (node as HTMLElement).offsetHeight
					);
					expect(lineHeight, 'the bar holds on one line').toBeLessThan(buttonHeight * 2);
					await expectInSight(page, page.locator('.stop[data-companion] .node'), 'lesson to play');

					// Down the map, the bar stays at the top.
					await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
					await settle(page);
					await expectBarAtTop(page);
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
			await expect(groupLabel(page)).not.toHaveText(label);
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
		await expectBarAtTop(page);
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

	test('has no axe violation on the map, the lesson screen and a game of a short laptop, light and dark', async ({
		page
	}) => {
		await page.setViewportSize(SCREENS['short laptop']);
		const lesson = firstOfEachWorld[5] as Lesson;
		await reachMapAs(page, childBefore(lesson));
		await settle(page);
		await expectNoAxeViolation(page);
		await openIntro(page, lesson);
		await settle(page);
		await expectNoAxeViolation(page);
		await page.locator('button[data-proposed]').click();
		await expectGroup(page);
		await settle(page);
		await expectNoAxeViolation(page);
	});
});

/** Points of a bubble looked at, as fractions of its box: inside its rounded corners. */
const BUBBLE_POINTS = [0.2, 0.5, 0.8];

/**
 * What is seen at nine points of the bubble, its centre among them, wherever it is not the bubble:
 * nothing when the bubble is in front of the picture and whole on the screen.
 */
function coveredPointsOf(bubble: Locator): Promise<string[]> {
	return bubble.evaluate((node, fractions) => {
		const box = node.getBoundingClientRect();
		return fractions.flatMap((across) =>
			fractions.flatMap((down) => {
				const seen = document.elementFromPoint(
					box.left + box.width * across,
					box.top + box.height * down
				);
				if (seen !== null && node.contains(seen)) return [];
				const name =
					seen === null
						? 'off the screen'
						: `${seen.tagName.toLowerCase()} ${seen.getAttribute('class') ?? ''}`;
				return [`${across} × ${down}: ${name}`];
			})
		);
	}, BUBBLE_POINTS);
}

/** Types the first group of the game on screen; its reward shows its bubble, held (`hold`). */
async function reachFirstBubble(page: Page): Promise<Locator> {
	await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
	const label = (await groupLabel(page).textContent()) ?? '';
	await page.keyboard.type(GROUP_LABEL.exec(label)?.groups?.['text'] ?? '');
	const bubble = page.locator('.bubble');
	await expect(bubble).toBeVisible();
	return bubble;
}

/** Holds every animation of the page that ends at this fraction of its length, its delay included. */
async function holdAnimationsAt(page: Page, fraction: number) {
	await page.evaluate((at) => {
		for (const animation of document.getAnimations()) {
			const end = Number(animation.effect?.getComputedTiming().endTime);
			if (!Number.isFinite(end)) continue;
			animation.pause();
			animation.currentTime = end * at;
		}
	}, fraction);
}

/*
 * The bubble of a reward is in front of the picture of its game (2026-11-19): on a tall screen the
 * picture grows and reaches beyond its frame, and it never covers the bubble, whole and readable.
 */
test.describe('reward bubbles', CHROMIUM_ONLY, () => {
	const BUBBLE_SCREENS = [SCREENS.laptop, SCREENS['short laptop'], TALL_SCREEN, LARGE_SCREEN];
	/** The size of the text to type: as the settings start, then the largest. */
	const TEXT_SCALES = [undefined, 'xl'] as const;
	/** Moments of the reward held still, as fractions of each of its animations: start to end. */
	const MOMENTS = [0, 0.25, 0.5, 0.75, 1];
	/** Longer than any test: an entrance that has ended is no longer among the animations to hold. */
	const SLOW_ENTRANCE = ':root{--dd-duration-reward:600000ms}';

	test.use({ reducedMotion: 'no-preference' });

	test.beforeEach(async ({ page }) => {
		await setRewards(page, 'hold');
	});

	for (const game of GAMES) {
		test(`keeps the bubble of the first reward of ${game.id} in front of its picture, whole, on every screen`, async ({
			page
		}) => {
			await page.setViewportSize(SCREENS.laptop);
			await startDevGame(page, game.id);
			const bubble = await reachFirstBubble(page);

			for (const screen of BUBBLE_SCREENS) {
				for (const scale of TEXT_SCALES) {
					await page.setViewportSize(screen);
					await page.evaluate((value) => {
						if (value === undefined) delete document.documentElement.dataset['textScale'];
						else document.documentElement.dataset['textScale'] = value;
					}, scale);
					await settle(page);
					await expect
						.poll(() => coveredPointsOf(bubble), {
							message: `${game.id}, ${screen.width} × ${screen.height}, text ${scale ?? 'as set'}`
						})
						.toEqual([]);
				}
			}
		});

		test(`keeps the bubble of ${game.id} in front while it comes in and the first scene plays`, async ({
			page
		}) => {
			await page.setViewportSize(SCREENS.laptop);
			await startDevGame(page, game.id, { scenes: true });
			// The bubble comes in slowly enough to be held anywhere on its way.
			await page.addStyleTag({ content: SLOW_ENTRANCE });
			const bubble = await reachFirstBubble(page);
			await expect(page.locator('[data-scene]')).not.toHaveCount(0);

			// Moment after moment: an entrance held at its end is over, it cannot be held again.
			for (const moment of MOMENTS) {
				await holdAnimationsAt(page, moment);
				for (const screen of BUBBLE_SCREENS) {
					await page.setViewportSize(screen);
					await settle(page);
					expect(
						await coveredPointsOf(bubble),
						`${game.id}, ${screen.width} × ${screen.height}, at ${moment} of the animations`
					).toEqual([]);
				}
			}
		});
	}
});

/** How many lines a block of text takes, in lines of its own height. */
function linesOf(text: Locator): Promise<number> {
	return text.evaluate((node) => {
		const line = Number.parseFloat(getComputedStyle(node).lineHeight);
		return Math.round(node.getBoundingClientRect().height / line);
	});
}

/*
 * The finger of each key of the lesson, « Touche F — index gauche », is never cut (2026-11-19): on
 * one line as long as the page has room, and on a narrow page it may wrap, never past the page.
 */
test.describe('the fingers of the keys on the lesson screen', CHROMIUM_ONLY, () => {
	const hints = (page: Page) => page.locator('[data-intro-keys] .hints .finger-hint');

	for (const screen of [SCREENS.laptop, SCREENS['short laptop'], TALL_SCREEN, LARGE_SCREEN]) {
		test(`writes the finger of each key of the first lesson on one line at ${screen.width} × ${screen.height}`, async ({
			page
		}) => {
			await page.setViewportSize(screen);
			await reachMapAs(page, childBefore(FIRST));
			await openIntro(page, FIRST);
			await settle(page);

			await expect(hints(page)).not.toHaveCount(0);
			for (const hint of await hints(page).all()) {
				expect(await linesOf(hint), (await hint.textContent()) ?? '').toBe(1);
			}
		});
	}

	test('lets the finger of a key go to the line at 320 pixels, never past the page', async ({
		page
	}) => {
		await page.setViewportSize(NARROW);
		await reachMapAs(page, childBefore(FIRST));
		await openIntro(page, FIRST);
		await settle(page);

		await expect(hints(page)).not.toHaveCount(0);
		for (const hint of await hints(page).all()) {
			const box = await hint.evaluate((node) => {
				const rect = node.getBoundingClientRect();
				return { left: rect.left, right: rect.right, width: innerWidth };
			});
			expect(box.left, (await hint.textContent()) ?? '').toBeGreaterThanOrEqual(-SUBPIXEL);
			expect(box.right, (await hint.textContent()) ?? '').toBeLessThanOrEqual(box.width + SUBPIXEL);
		}
		const sideways = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(sideways, 'nothing scrolls sideways').toBeLessThanOrEqual(SUBPIXEL);
	});
});

/*
 * The screen before a lesson in three cards (maquette A, chosen by the owner on 2026-11-20): the
 * instruction, the keys, the games, each a named region; on a large screen they fill the width of
 * the page instead of a column of loose pieces in its middle.
 */
test.describe('the screen before a lesson, in three cards', CHROMIUM_ONLY, () => {
	const cards = (page: Page) => page.getByRole('region');
	const CARD_NAMES = [
		message('play_intro_instruction_heading'),
		message('play_intro_keys_other'),
		message('play_game_choice_legend')
	];

	test('names its three cards in reading order, after the title and the prize', async ({
		page
	}) => {
		await reachMapAs(page, childBefore(FIRST));
		await openIntro(page, FIRST);
		await expect(cards(page)).toHaveCount(CARD_NAMES.length);
		for (const [index, name] of CARD_NAMES.entries()) {
			await expect(cards(page).nth(index)).toHaveAccessibleName(name);
		}
		await expect(page.locator('[data-prize]')).toBeVisible();
		const inOrder = await page.evaluate(() => {
			const read = [
				document.querySelector('h1'),
				document.querySelector('[data-prize]'),
				...document.querySelectorAll('section[aria-labelledby]')
			];
			return read.every(
				(node, index) =>
					index === 0 ||
					Boolean(
						(read[index - 1]?.compareDocumentPosition(node as Node) ?? 0) &
						Node.DOCUMENT_POSITION_FOLLOWING
					)
			);
		});
		expect(inOrder, 'title, prize, instruction, keys, games').toBe(true);
	});

	test('puts the prize on the row of the way out, the number of the lesson above the title', async ({
		page
	}) => {
		await page.setViewportSize(TALL_SCREEN);
		await reachMapAs(page, childBefore(FIRST));
		await openIntro(page, FIRST);
		await settle(page);
		const boxes = await page.evaluate(() => {
			const box = (selector: string) => {
				const rect = document.querySelector(selector)?.getBoundingClientRect();
				return { top: rect?.top ?? 0, bottom: rect?.bottom ?? 0, left: rect?.left ?? 0 };
			};
			return {
				back: box('[data-screen-back]'),
				prize: box('[data-prize]'),
				number: box('.number'),
				title: box('h1')
			};
		});
		expect(boxes.prize.top, 'prize beside the way out').toBeLessThan(boxes.back.bottom);
		expect(boxes.prize.left, 'prize at the right of the way out').toBeGreaterThan(boxes.back.left);
		expect(boxes.number.bottom, 'number above the title').toBeLessThanOrEqual(
			boxes.title.top + SUBPIXEL
		);
		expect(Math.abs(boxes.title.left - boxes.back.left), 'title at the left').toBeLessThanOrEqual(
			SUBPIXEL
		);
	});

	test('spreads the three cards over the width of the page on a large screen', async ({ page }) => {
		await page.setViewportSize(TALL_SCREEN);
		await reachMapAs(page, childBefore(FIRST));
		await openIntro(page, FIRST);
		await settle(page);
		const layout = await page.evaluate(() => {
			const frame = document.querySelector('[data-screen-back]')?.closest('section');
			const style = frame ? getComputedStyle(frame) : null;
			const box = frame?.getBoundingClientRect();
			const sections = [...document.querySelectorAll('section[aria-labelledby]')].map((node) =>
				node.getBoundingClientRect()
			);
			return {
				left: (box?.left ?? 0) + Number.parseFloat(style?.paddingLeft ?? '0'),
				right: (box?.right ?? 0) - Number.parseFloat(style?.paddingRight ?? '0'),
				cards: sections.map((rect) => ({ left: rect.left, right: rect.right, top: rect.top })),
				bottoms: sections.map((rect) => rect.bottom)
			};
		});
		expect(layout.cards).toHaveLength(3);
		for (const [index, card] of layout.cards.entries()) {
			expect(Math.abs(card.left - layout.left), `card ${index}: left`).toBeLessThanOrEqual(
				SUBPIXEL
			);
			expect(Math.abs(card.right - layout.right), `card ${index}: right`).toBeLessThanOrEqual(
				SUBPIXEL
			);
			if (index > 0) {
				expect(card.top, `card ${index} under the one before`).toBeGreaterThan(
					layout.bottoms[index - 1] ?? 0
				);
			}
		}
		// Not a column in the middle of the screen: the cards take the width of the wide page.
		expect(layout.right - layout.left).toBeGreaterThan(TALL_SCREEN.width / 2);
	});

	test('opens on a laptop with the instruction at the top and the games in view', async ({
		page
	}) => {
		await page.setViewportSize(SCREENS.laptop);
		await reachMapAs(page, childBefore(FIRST));
		await openIntro(page, FIRST);
		await settle(page);
		await expectInSight(page, cards(page).nth(0), 'card of the instruction');
		await expectInSight(page, cards(page).nth(1), 'card of the keys');
		const proposed = page.locator('button[data-proposed]');
		await expectInSight(page, proposed.locator('xpath=..'), 'game proposed');
		await expect(proposed).toBeFocused();
	});

	test('sets the cards one under the other at 320 pixels, the keyboard above the fingers', async ({
		page
	}) => {
		await page.setViewportSize(NARROW);
		await reachMapAs(page, childBefore(FIRST));
		await openIntro(page, FIRST);
		await settle(page);
		const layout = await page.evaluate(() => ({
			sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
			cards: [...document.querySelectorAll('section[aria-labelledby]')].map((node) => {
				const rect = node.getBoundingClientRect();
				return { top: rect.top, bottom: rect.bottom, right: rect.right };
			}),
			keyboard:
				document.querySelector('[data-intro-keys] .keyboard')?.getBoundingClientRect().bottom ?? 0,
			hints: document.querySelector('[data-intro-keys] .hints')?.getBoundingClientRect().top ?? 0,
			width: innerWidth
		}));
		expect(layout.sideways, 'nothing scrolls sideways').toBeLessThanOrEqual(SUBPIXEL);
		expect(layout.cards).toHaveLength(3);
		for (const [index, card] of layout.cards.entries()) {
			expect(card.right, `card ${index}: right`).toBeLessThanOrEqual(layout.width + SUBPIXEL);
			if (index > 0) expect(card.top).toBeGreaterThan(layout.cards[index - 1]?.bottom ?? 0);
		}
		expect(layout.keyboard, 'the keyboard above the fingers').toBeLessThanOrEqual(
			layout.hints + SUBPIXEL
		);
	});

	test('keeps a border around each card and each little key in forced colours', async ({
		page
	}) => {
		await page.emulateMedia({ forcedColors: 'active' });
		await reachMapAs(page, childBefore(FIRST));
		await openIntro(page, FIRST);
		const borders = await page.evaluate(() =>
			[...document.querySelectorAll('section[aria-labelledby], .keycap')].map((node) => {
				const style = getComputedStyle(node);
				return `${style.borderTopStyle} ${Number.parseFloat(style.borderTopWidth) > 0}`;
			})
		);
		// The three cards, and the little keys of F and J before their lines.
		expect(borders).toEqual(Array.from({ length: 5 }, () => 'solid true'));
	});

	test('has no axe violation on the three cards, wide and narrow, light and dark', async ({
		page
	}) => {
		test.slow();
		for (const [screen, lesson] of [
			[TALL_SCREEN, FIRST],
			[NARROW, FIRST],
			[SCREENS.laptop, firstOfEachWorld[5] as Lesson]
		] as const) {
			await page.setViewportSize(screen);
			await reachMapAs(page, childBefore(lesson));
			await openIntro(page, lesson);
			await settle(page);
			await expectNoAxeViolation(page);
		}
	});
});
