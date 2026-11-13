import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import type { StarCount } from '../src/lib/engine/progression/types';
import { withAdultWords, withGhost } from '../src/lib/state/profile';
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

/** A laptop screen: the way out of every screen must be found without scrolling down. */
const LAPTOP = { width: 1280, height: 720 } as const;
/** How far from the top of the page the way out may start, in CSS pixels. */
const TOP_OF_PAGE = 200;
const PASSED_STARS: StarCount = 3;

interface Lesson {
	id: string;
	title: string;
}

const { message, templateRegex } = loadMessages();
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
	for (const key of ['info_link_adults', 'info_link_privacy', 'info_link_accessibility']) {
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
for (const worldIndex of [1, 3]) {
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

// The second lesson of the kitchen proposes the tower, whose text zone is the narrowest.
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
	const kitchen = progressionWorlds[1]?.lessons[1] as Lesson;
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
