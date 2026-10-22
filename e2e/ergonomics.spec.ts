import { expect as baseExpect, test, type Page } from '@playwright/test';
import type { StarCount } from '../src/lib/engine/progression/types';
import { withGhost } from '../src/lib/state/profile';
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
	const child = advancedProfile({ name: 'Lou', passed: { [FIRST.id]: PASSED_STARS } });
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

	await button(page, message('play_story_so_far_open')).click();
	await expect(heading(page, message('play_story_so_far_title'))).toBeVisible();
	await expectWayOutAtTop(page, message('play_story_so_far_back'));
	// From the title the screen opens on, Tab reaches the way out first; Escape takes it too.
	await page.keyboard.press('Tab');
	await expect(page.locator('[data-screen-back] button')).toBeFocused();
	await page.keyboard.press('Escape');
	await expect(heading(page, message('play_map_title'))).toBeVisible();

	await page.getByRole('button', { name: FIRST.title }).click();
	await throughStory(page, heading(page, FIRST.title));
	await expectWayOutAtTop(page, message('play_intro_back'));
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
