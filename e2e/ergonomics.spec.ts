import { expect as baseExpect, test, type Page } from '@playwright/test';
import type { StarCount } from '../src/lib/engine/progression/types';
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

const { message } = loadMessages();
const firstWorld = readJson<{ worlds: { lessons: Lesson[] }[] }>(
	'content/fr/progression/azerty-decouverte.json'
).worlds[0];
const FIRST = firstWorld?.lessons[0] as Lesson;

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
