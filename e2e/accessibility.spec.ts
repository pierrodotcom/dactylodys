import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { GAMES } from '../src/lib/games/registry';
import type { Profile } from '../src/lib/state/types';
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
 * The audit of J5 (ADR-054): what axe does not see on its own. Reflow at 320 pixels (WCAG
 * 1.4.10), focus never hidden (2.4.11), the adult space with the keyboard alone, and what a
 * screen reader hears in a game.
 */

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;
/** 1280 pixels at 400 % zoom: the width WCAG 1.4.10 asks for. */
const NARROW = { width: 320, height: 640 } as const;
const LAPTOP = { width: 1280, height: 720 } as const;
const PRESS_BUDGET = 80;
const BACK_PRESSES = 8;
const CODE_LENGTH = 4;
const SHORT_CODE = '12';

const { message, templateRegex } = loadMessages();
const GROUP_LABEL = templateRegex('ui_target_text_label');

interface Lesson {
	id: string;
	title: string;
}
const worlds = readJson<{ worlds: { id: string; lessons: Lesson[] }[] }>(
	'content/fr/progression/azerty-decouverte.json'
).worlds;
const FIRST = worlds[0]?.lessons[0] as Lesson;
const SECOND = worlds[0]?.lessons[1] as Lesson;
const gateNumbers = readJson<{ numbers: { value: number; words: string }[] }>(
	'content/fr/adult/gate-numbers.json'
).numbers;
const sample = readJson<{ groups: string[] }>('content/common/dev/games-sample.json');
const FIRST_GROUP = sample.groups[0] ?? '';
const SECOND_GROUP = sample.groups[1] ?? '';
const WRONG_KEY = [...'zwxkqb'].find((letter) => !sample.groups.join('').includes(letter)) ?? '';

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function announcement(page: Page): Locator {
	return page.locator('[data-game-announcement]');
}

/** A child who has passed the first lesson: the map, the notebook and the companion have things. */
function child(): Profile {
	return advancedProfile({ name: 'Lou', passed: { [FIRST.id]: 2 } });
}

/** The elements that stick out of the page on the right, for a failure that says where. */
async function sticksOut(page: Page): Promise<string[]> {
	await page.evaluate(() => document.fonts.ready);
	return page.evaluate(() => {
		const width = document.documentElement.clientWidth;
		if (document.documentElement.scrollWidth <= width) return [];
		return [...document.querySelectorAll('body *')]
			.filter((element) => element.getBoundingClientRect().right > width + 1)
			.slice(0, 5)
			.map((element) => `${element.tagName.toLowerCase()}.${element.getAttribute('class')}`);
	});
}

/** Each screen is checked in turn; the failure lists every screen that scrolls sideways. */
function reflowChecker(page: Page) {
	const found: Record<string, string[]> = {};
	return {
		async check(screen: string) {
			const outside = await sticksOut(page);
			if (outside.length > 0) found[screen] = outside;
		},
		expectNone() {
			expect(found).toEqual({});
		}
	};
}

async function openPlayers(page: Page) {
	await openPage(page, '/jouer');
	await installProfile(page, child());
	await reloadPage(page);
	await expect(heading(page, message('play_players_title'))).toBeVisible();
}

async function openMap(page: Page) {
	await openPlayers(page);
	await button(page, 'Lou').click();
	await expect(heading(page, message('play_map_title'))).toBeVisible();
}

async function gateNumber(page: Page): Promise<number> {
	const words = (await page.locator('[data-gate-words]').textContent())?.trim();
	const number = gateNumbers.find((entry) => entry.words === words);
	if (!number) throw new Error(`unknown gate number: ${words}`);
	return number.value;
}

/** Straight to the adult space: the player screen may be skipped for the last player. */
async function openAdultHome(page: Page) {
	await openPage(page, '/jouer');
	await installProfile(page, child());
	await openPage(page, '/adulte');
	await expect(heading(page, message('adult_title'))).toBeVisible();
	await page.locator('[data-gate-answer]').fill(String(await gateNumber(page)));
	await page.keyboard.press('Enter');
	await expect(page.locator('[data-adult-home]')).toBeVisible();
}

async function startDevGame(page: Page, gameId: string) {
	await openPage(page, '/dev/jeux');
	await page.getByRole('radio', { name: message(`game_${gameId}_title`) }).check();
	await button(page, message('dev_games_play')).click();
	await expect(page.locator('.target-text > .dd-visually-hidden').first()).toHaveText(GROUP_LABEL);
}

async function focusByTab(page: Page, target: Locator) {
	await expect(target).toBeVisible();
	// Like Safari by default, Playwright's WebKit leaves links out of Tab, Option held or not (L-105):
	// there, a link is focused directly and the walk goes on from it.
	const isWebKit = page.context().browser()?.browserType().name() === 'webkit';
	if (isWebKit && (await target.evaluate((element) => element instanceof HTMLAnchorElement))) {
		await target.focus();
		return;
	}
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

async function expectNoAxeViolation(page: Page) {
	await page.evaluate(() => document.fonts.ready);
	const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
	expect(results.violations).toEqual([]);
}

test.beforeEach(async ({ page }) => {
	await shortenRewards(page);
});

test.describe('reflow at 320 pixels', () => {
	test.use({ viewport: NARROW });

	test('keeps every screen of the child within the width of the page', async ({ page }) => {
		test.slow();
		const reflow = reflowChecker(page);
		await openPage(page, '/');
		await reflow.check('home');
		await openPlayers(page);
		await reflow.check('players');
		await button(page, message('play_new_player')).click();
		await expect(heading(page, message('play_new_title'))).toBeVisible();
		await reflow.check('new player');
		await page.keyboard.press('Escape');

		await button(page, 'Lou').click();
		await expect(heading(page, message('play_map_title'))).toBeVisible();
		await reflow.check('map');
		await button(page, message('play_settings_open')).click();
		await expect(heading(page, message('settings_title'))).toBeVisible();
		await reflow.check('settings');
		await page.keyboard.press('Escape');
		await button(page, message('play_companion_open')).click();
		await expect(heading(page, message('play_companion_title'))).toBeVisible();
		await reflow.check('companion');
		await page.keyboard.press('Escape');
		await button(page, message('play_story_so_far_open')).click();
		await expect(heading(page, message('play_story_so_far_title'))).toBeVisible();
		await reflow.check('story so far');
		await page.keyboard.press('Escape');

		await page.getByRole('button', { name: SECOND.title }).click();
		await throughStory(page, heading(page, SECOND.title));
		await reflow.check('lesson');
		await page.locator('button[data-proposed]').click();
		await expect(page.locator('.target-text')).toBeVisible();
		await reflow.check('game');
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).toBeVisible();
		await reflow.check('pause');
		reflow.expectNone();
	});

	test('keeps every game within the width of the page, its keyboard shrunk to fit', async ({
		page
	}) => {
		test.slow();
		const reflow = reflowChecker(page);
		for (const game of GAMES) {
			await startDevGame(page, game.id);
			await expect(page.locator('.keyboard')).toBeVisible();
			await reflow.check(game.id);
		}
		reflow.expectNone();
	});

	test('keeps every screen of the adult space within the width of the page', async ({ page }) => {
		test.slow();
		const reflow = reflowChecker(page);
		await openPlayers(page);
		await page.locator('[data-adult-entry]').click();
		await expect(heading(page, message('adult_title'))).toBeVisible();
		await reflow.check('gate');
		await page.locator('[data-gate-answer]').fill(String(await gateNumber(page)));
		await page.keyboard.press('Enter');
		await expect(page.locator('[data-adult-home]')).toBeVisible();
		await reflow.check('adult home');
		await button(page, message('adult_code_add')).click();
		await reflow.check('code form');
		await button(page, 'Lou').click();
		await expect(heading(page, message('adult_child_title', { name: 'Lou' }))).toBeVisible();
		for (const summary of await page.getByText(message('adult_table_show')).all()) {
			await summary.click();
		}
		await reflow.check('report');
		await page.locator('[data-child-settings]').click();
		await expect(heading(page, message('adult_settings_title', { name: 'Lou' }))).toBeVisible();
		await reflow.check('settings of the child');
		reflow.expectNone();
	});
});

test.describe('focus in view', () => {
	test.use({ viewport: LAPTOP });

	test('keeps the focused item clear of the companion that stays at the top (2.4.11)', async ({
		page
	}) => {
		await openMap(page);
		await button(page, message('play_companion_open')).click();
		await expect(heading(page, message('play_companion_title'))).toBeVisible();
		await page.locator('button.item').last().focus();
		// Back up with Shift+Tab: each item scrolls into view from the top, where the companion is.
		for (let press = 0; press < BACK_PRESSES; press++) {
			await page.keyboard.press('Shift+Tab');
			const covered = await page.evaluate(() => {
				const focused = document.activeElement;
				const stage = document.querySelector('[data-companion-stage]');
				if (!(focused instanceof HTMLElement) || !stage || stage.contains(focused)) return false;
				const box = focused.getBoundingClientRect();
				return box.top < stage.getBoundingClientRect().bottom;
			});
			expect(covered).toBe(false);
		}
	});
});

test.describe('adult space with the keyboard alone', () => {
	test('enters, opens the report and the settings of a child, and comes back, by Tab and Enter', async ({
		page
	}) => {
		test.slow();
		await openPlayers(page);
		await activateByTab(page, page.locator('[data-adult-entry]'));
		await expect(heading(page, message('adult_title'))).toBeFocused();

		await focusByTab(page, page.locator('[data-gate-answer]'));
		await page.keyboard.type(String(await gateNumber(page)));
		await page.keyboard.press('Enter');
		await expect(page.locator('[data-adult-home]')).toBeVisible();

		await activateByTab(page, button(page, 'Lou'));
		const report = heading(page, message('adult_child_title', { name: 'Lou' }));
		await expect(report).toBeFocused();

		await activateByTab(page, page.locator('[data-child-settings]'));
		const settings = heading(page, message('adult_settings_title', { name: 'Lou' }));
		await expect(settings).toBeFocused();
		// A setting changed with the arrows inside its group, as with a screen reader.
		const scale = page.getByRole('group', { name: message('settings_scale_label') });
		await focusByTab(
			page,
			scale.getByRole('radio', { name: message('settings_scale_md'), exact: true })
		);
		await page.keyboard.press('ArrowRight');
		await expect(
			scale.getByRole('radio', { name: message('settings_scale_lg'), exact: true })
		).toBeChecked();

		await page.keyboard.press('Escape');
		await expect(report).toBeFocused();
		await page.keyboard.press('Escape');
		await expect(heading(page, message('adult_title'))).toBeFocused();
	});

	test('links the reason a code is refused to its field, for a screen reader', async ({ page }) => {
		await openAdultHome(page);
		await activateByTab(page, button(page, message('adult_code_add')));
		await expect(page.locator('[data-code-new]')).toBeFocused();
		await page.keyboard.type(SHORT_CODE);
		await page.keyboard.press('Enter');
		const reason = message('adult_code_invalid', { length: CODE_LENGTH });
		await expect(page.getByRole('alert')).toHaveText(reason);
		await expect(page.locator('[data-code-new]')).toHaveAttribute('aria-invalid', 'true');
		await expect(page.locator('[data-code-new]')).toHaveAccessibleDescription(reason);
	});
});

test.describe('what a screen reader hears in a game', () => {
	test('says the text to type when it appears, the expected key after a mistake, and nothing on a right key', async ({
		page
	}) => {
		await startDevGame(page, 'hatching');
		const said = announcement(page);
		await expect(said).toHaveAttribute('role', 'status');
		await expect(said).toHaveText(message('game_shared_announce_group', { text: FIRST_GROUP }));

		const [first = '', second = ''] = [...FIRST_GROUP];
		await page.keyboard.type(first);
		await expect(said).toHaveText('');
		await page.keyboard.press(WRONG_KEY);
		const expected = second === ' ' ? message('ui_target_char_space') : second;
		await expect(said).toHaveText(message('game_shared_announce_error', { char: expected }));

		await page.keyboard.type([...FIRST_GROUP].slice(1).join(''));
		await expect(said).toHaveText(
			message('game_hatching_announce_hatched', { cry: message('game_hatching_cry_1') })
		);
		await page.keyboard.press('Enter');
		await expect(said).toHaveText(message('game_shared_announce_group', { text: SECOND_GROUP }));
	});

	test('names the game in a heading and focuses its labelled input field', async ({ page }) => {
		await startDevGame(page, 'rocket');
		await expect(heading(page, message('game_rocket_title'))).toBeAttached();
		await expect(page.getByLabel(message('game_shared_input_label'))).toBeFocused();
	});
});

for (const colorScheme of COLOR_SCHEMES) {
	test.describe(`accessibility audit, ${colorScheme} theme`, () => {
		test.use({ colorScheme });

		test('has no axe violation at 320 pixels on the map, a game and the adult report', async ({
			page
		}) => {
			test.slow();
			await page.setViewportSize(NARROW);
			await openMap(page);
			await expectNoAxeViolation(page);
			await startDevGame(page, 'hatching');
			await expectNoAxeViolation(page);
			await openAdultHome(page);
			await button(page, 'Lou').click();
			await expect(heading(page, message('adult_child_title', { name: 'Lou' }))).toBeVisible();
			await expectNoAxeViolation(page);
		});

		test('has no axe violation on the code form of the adult space, with a refused code', async ({
			page
		}) => {
			await openAdultHome(page);
			await button(page, message('adult_code_add')).click();
			await expect(page.locator('[data-code-new]')).toBeFocused();
			await expectNoAxeViolation(page);
			await page.keyboard.type(SHORT_CODE);
			await page.keyboard.press('Enter');
			await expect(page.getByRole('alert')).toBeVisible();
			await expectNoAxeViolation(page);
		});
	});
}
