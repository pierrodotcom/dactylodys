import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Page } from '@playwright/test';
import type { Profile } from '../src/lib/state/types';
import { advancedProfile, installProfile, loadMessages, openPage, reloadPage } from './support';

/**
 * Who plays? (ADR-075): the game goes straight back to the map only on a device with one player;
 * with several it asks, the last player first. And the small defects of the player screens.
 */

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;
const PLAY_URL = '/jouer';
const MAIN = 'primary';
const SECONDARY = 'secondary';

const { message } = loadMessages();

const lou = advancedProfile({ name: 'Lou', passed: {} });
const ali = advancedProfile({ name: 'Ali', passed: {} });
const zoe = advancedProfile({ name: 'Zoé', passed: {} });

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function players(page: Page) {
	return page.getByRole('list', { name: message('play_players_list_label') }).getByRole('button');
}

async function install(page: Page, profiles: readonly Profile[]) {
	await openPage(page, PLAY_URL);
	for (const profile of profiles) await installProfile(page, profile);
	await reloadPage(page);
	await expect(heading(page, message('play_players_title'))).toBeVisible();
}

async function expectOnMapOf(page: Page, profile: Profile) {
	await expect(heading(page, message('play_map_title'))).toBeVisible();
	await expect(page.getByText(message('play_map_greeting', { name: profile.name }))).toBeVisible();
}

test.describe('coming back to the game', () => {
	test('goes straight back to the map on a device with one player', async ({ page }) => {
		await install(page, [lou]);
		await button(page, lou.name).click();
		await expectOnMapOf(page, lou);

		await reloadPage(page);

		await expectOnMapOf(page, lou);
		await expect(heading(page, message('play_players_title'))).toHaveCount(0);
	});

	test('asks who plays on a device with several players, the last one first and set apart', async ({
		page
	}) => {
		await install(page, [lou, ali, zoe]);
		// Nobody has played yet: every player is offered alike.
		await expect(players(page)).toHaveCount(3);
		await expect(page.locator('[data-last-player]')).toHaveCount(0);
		for (const player of await players(page).all()) {
			await expect(player).toHaveAttribute('data-variant', MAIN);
		}
		const others = (await players(page).allTextContents())
			.map((name) => name.trim())
			.filter((name) => name !== zoe.name);
		await button(page, zoe.name).click();
		await expectOnMapOf(page, zoe);

		await reloadPage(page);

		await expect(heading(page, message('play_players_title'))).toBeVisible();
		await expect(players(page)).toHaveText([zoe.name, ...others]);
		await expect(players(page).first()).toHaveAttribute('data-last-player');
		await expect(players(page).first()).toHaveAttribute('data-variant', MAIN);
		await expect(page.locator('[data-last-player]')).toHaveCount(1);
		for (const name of others) {
			await expect(button(page, name)).toHaveAttribute('data-variant', SECONDARY);
		}

		// With the keyboard alone, the last player is the first stop after the title.
		await expect(heading(page, message('play_players_title'))).toBeFocused();
		await page.keyboard.press('Tab');
		await expect(button(page, zoe.name)).toBeFocused();
		await page.keyboard.press('Tab');
		await page.keyboard.press('Enter');
		const [second = ''] = others;
		await expect(page.getByText(message('play_map_greeting', { name: second }))).toBeVisible();

		// Another child played last: next time, that one comes first.
		await reloadPage(page);
		await expect(players(page).first()).toHaveText(second);
		await expect(players(page).first()).toHaveAttribute('data-last-player');
	});

	test('keeps the last player first when the child asks to change player', async ({ page }) => {
		await install(page, [lou, ali]);
		await button(page, ali.name).click();
		await expectOnMapOf(page, ali);

		await button(page, message('play_change_player')).click();

		await expect(heading(page, message('play_players_title'))).toBeVisible();
		await expect(players(page)).toHaveText([ali.name, lou.name]);
		await expect(button(page, ali.name)).toHaveAttribute('data-last-player');
	});
});

test.describe('player screens', () => {
	test('makes "New player" the main button only while nobody has played here', async ({ page }) => {
		await openPage(page, PLAY_URL);
		await expect(page.getByText(message('play_players_empty'))).toBeVisible();
		await expect(button(page, message('play_new_player'))).toHaveAttribute('data-variant', MAIN);

		await installProfile(page, lou);
		await reloadPage(page);

		await expect(button(page, lou.name)).toHaveAttribute('data-variant', MAIN);
		await expect(button(page, message('play_new_player'))).toHaveAttribute(
			'data-variant',
			SECONDARY
		);
	});

	test('says the player is being prepared when the creation lasts', async ({ page }) => {
		await openPage(page, PLAY_URL);
		await button(page, message('play_new_player')).click();
		await page.getByLabel(message('play_new_label')).fill(zoe.name);
		const busy = page.locator('[data-new-player-busy]');
		await expect(busy).toHaveText('');

		// A slow device: what the game fetches to open the player waits until the test lets it go.
		let release = () => {};
		const held = new Promise<void>((resolve) => {
			release = resolve;
		});
		await page.route('**/*', async (route) => {
			await held;
			await route.continue();
		});
		const submit = button(page, message('play_new_submit'));
		await submit.focus();
		await page.keyboard.press('Enter');

		await expect(busy).toHaveText(message('play_new_busy'));
		await expect(busy).toHaveRole('status');
		await expect(submit).toBeDisabled();

		release();
		await expect(heading(page, message('play_check_title'))).toBeVisible();
	});
});

for (const colorScheme of COLOR_SCHEMES) {
	test(`has no axe violation on the player screen with a last player set apart (${colorScheme})`, async ({
		page
	}) => {
		await page.emulateMedia({ colorScheme });
		await install(page, [lou, ali]);
		await button(page, ali.name).click();
		await expectOnMapOf(page, ali);
		await reloadPage(page);
		await expect(page.locator('[data-last-player]')).toBeVisible();

		const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
		expect(results.violations).toEqual([]);
	});
}
