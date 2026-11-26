import { expect, test, type Page } from '@playwright/test';
import {
	advancedProfile,
	expectNoAxeViolation,
	installProfile,
	loadMessages,
	openPage,
	reloadPage,
	storedRecord,
	type StoredFormat
} from './support';

const PLAY_URL = '/jouer';
const { message } = loadMessages();

const readable = advancedProfile({ name: 'Nova', passed: {} });
const later = { ...advancedProfile({ name: 'Zoé', passed: {} }), id: 'from-a-later-version' };
const damaged = { ...advancedProfile({ name: 'Lou', passed: {} }), id: 'damaged-save' };

async function reachPlayers(
	page: Page,
	unreadable = later,
	format: StoredFormat = 'later-version'
) {
	await openPage(page, PLAY_URL);
	await installProfile(page, readable);
	await installProfile(page, unreadable, format);
	await reloadPage(page);
	await expect(page.getByRole('heading', { name: message('play_players_title') })).toBeVisible();
}

function section(page: Page) {
	return page.getByRole('region', { name: message('play_unreadable_title') });
}

test.describe('profiles the app cannot open', () => {
	test('lists them apart, and deletes one only once the child confirms', async ({ page }) => {
		await reachPlayers(page);
		await expect(page.getByRole('button', { name: readable.name })).toBeVisible();
		await expect(section(page).locator('[data-unreadable-reason]')).toHaveText(
			message('play_unreadable_newer', { name: later.name, appName: message('app_name') })
		);

		await section(page)
			.getByRole('button', { name: message('play_unreadable_delete') })
			.click();
		const question = page.getByText(message('play_unreadable_confirm', { name: later.name }));
		await expect(question).toBeFocused();
		await page.getByRole('button', { name: message('play_unreadable_confirm_no') }).click();
		expect(await storedRecord(page, later)).toBeDefined();

		await section(page)
			.getByRole('button', { name: message('play_unreadable_delete') })
			.click();
		await page.getByRole('button', { name: message('play_unreadable_confirm_yes') }).click();
		await expect(section(page)).toHaveCount(0);
		await expect.poll(() => storedRecord(page, later)).toBeUndefined();
		await expect(page.getByRole('button', { name: readable.name })).toBeVisible();
		expect(await storedRecord(page, readable)).toBeDefined();
	});

	test('says of a damaged save, in one sentence with its name, that it cannot be read', async ({
		page
	}) => {
		await reachPlayers(page, damaged, 'damaged');
		await expect(page.getByRole('button', { name: readable.name })).toBeVisible();
		await expect(section(page).locator('[data-unreadable-reason]')).toHaveText(
			message('play_unreadable_invalid', { name: damaged.name })
		);
		expect(await storedRecord(page, damaged)).toBeDefined();
	});

	test('has no axe violation on the list and on the question, light and dark', async ({ page }) => {
		await reachPlayers(page);
		await expectNoAxeViolation(page);
		await section(page)
			.getByRole('button', { name: message('play_unreadable_delete') })
			.click();
		await expectNoAxeViolation(page);
	});
});
