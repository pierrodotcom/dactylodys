import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
	advancedProfile,
	installProfile,
	loadMessages,
	openPage,
	reloadPage,
	storedRecord
} from './support';

const PLAY_URL = '/jouer';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const { message } = loadMessages();

const readable = advancedProfile({ name: 'Nova', passed: {} });
const later = { ...advancedProfile({ name: 'Zoé', passed: {} }), id: 'from-a-later-version' };

async function reachPlayers(page: Page) {
	await openPage(page, PLAY_URL);
	await installProfile(page, readable);
	await installProfile(page, later, 'later-version');
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
		await expect(section(page)).toContainText(later.name);
		await expect(section(page)).toContainText(message('play_unreadable_newer'));

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

	test('has no axe violation on the list and on the question', async ({ page }) => {
		await reachPlayers(page);
		const scan = () => new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
		expect((await scan()).violations).toEqual([]);
		await section(page)
			.getByRole('button', { name: message('play_unreadable_delete') })
			.click();
		expect((await scan()).violations).toEqual([]);
	});
});
