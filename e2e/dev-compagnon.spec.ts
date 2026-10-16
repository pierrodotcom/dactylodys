import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { loadMessages, openPage, readJson } from './support';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;
const PAGE_URL = '/dev/compagnon';

interface Reward {
	kind: 'item' | 'skill' | 'trophy';
	title: string;
	artId: string;
	slot?: string;
}

const { message } = loadMessages();
const catalogue = readJson<{ colors: { id: string; title: string }[]; rewards: Reward[] }>(
	'content/fr/rewards/azerty-decouverte.json'
);
const items = catalogue.rewards.filter((reward) => reward.kind === 'item');
const tricks = catalogue.rewards.filter((reward) => reward.kind === 'skill');
const LAST_COLOR = catalogue.colors[catalogue.colors.length - 1];
const [FIRST_ITEM] = items;
/** Another item of the same slot: it takes the place of the first one. */
const SAME_SLOT_ITEM = items.find(
	(item) => item.slot === FIRST_ITEM?.slot && item.artId !== FIRST_ITEM?.artId
);
const OTHER_SLOT_ITEM = items.find((item) => item.slot !== FIRST_ITEM?.slot);

function companion(page: Page) {
	return page.getByTestId('companion-stage').locator('svg.companion');
}

async function openCompanionPage(page: Page) {
	await openPage(page, PAGE_URL);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(message('dev_companion_title'));
	// Leaving while the fonts still load stalls the next page of the local preview server.
	await page.evaluate(() => document.fonts.ready);
}

test('shows the companion and a picture of every reward, owned and as a silhouette', async ({
	page
}) => {
	await openCompanionPage(page);

	await expect(companion(page)).toBeVisible();
	const owned = page.getByTestId('pictures-owned').getByRole('img');
	const locked = page.getByTestId('pictures-locked').getByRole('img');
	await expect(owned).toHaveCount(catalogue.rewards.length);
	await expect(locked).toHaveCount(catalogue.rewards.length);
	await expect(owned.first()).toHaveAccessibleName(catalogue.rewards[0]?.title ?? '');
	await expect(page.locator('[data-silhouette]')).toHaveCount(catalogue.rewards.length);
});

test('changes the colour and the worn items of the companion', async ({ page }) => {
	await openCompanionPage(page);
	if (!LAST_COLOR || !FIRST_ITEM || !SAME_SLOT_ITEM || !OTHER_SLOT_ITEM) {
		throw new Error('The catalogue lacks colours or items');
	}

	await page.getByRole('radio', { name: LAST_COLOR.title }).check();
	await expect(companion(page)).toHaveAttribute('data-color', LAST_COLOR.id);

	await page.getByRole('checkbox', { name: FIRST_ITEM.title }).check();
	await expect(companion(page)).toHaveAttribute('data-items', FIRST_ITEM.artId);

	await page.getByRole('checkbox', { name: SAME_SLOT_ITEM.title }).check();
	await expect(page.getByRole('checkbox', { name: FIRST_ITEM.title })).not.toBeChecked();
	await page.getByRole('checkbox', { name: OTHER_SLOT_ITEM.title }).check();
	const worn = (await companion(page).getAttribute('data-items'))?.split(' ') ?? [];
	expect(worn.sort()).toEqual([SAME_SLOT_ITEM.artId, OTHER_SLOT_ITEM.artId].sort());
	await expect(companion(page).locator(`[data-art="${OTHER_SLOT_ITEM.artId}"]`)).not.toHaveCount(0);

	await page.getByRole('button', { name: message('dev_companion_clear_items') }).click();
	await expect(companion(page)).not.toHaveAttribute('data-items');
});

test.describe('with reduced motion', () => {
	test.use({ reducedMotion: 'reduce' });

	test('plays each trick from the keyboard alone', async ({ page }) => {
		await openCompanionPage(page);

		for (const trick of tricks) {
			await page.getByRole('button', { name: trick.title }).focus();
			await page.keyboard.press('Enter');
			await expect(companion(page)).toHaveAttribute('data-trick', trick.artId);
		}

		const radio = page.getByRole('radio', { name: LAST_COLOR?.title ?? '' });
		await radio.focus();
		await page.keyboard.press('Space');
		await expect(companion(page)).toHaveAttribute('data-color', LAST_COLOR?.id ?? '');
	});
});

for (const colorScheme of COLOR_SCHEMES) {
	test.describe(`${colorScheme} theme`, () => {
		test.use({ colorScheme });

		test('has no axe violation for WCAG A and AA', async ({ page }) => {
			await openCompanionPage(page);

			const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
			expect(results.violations).toEqual([]);
		});
	});
}
