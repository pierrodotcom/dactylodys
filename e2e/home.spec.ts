import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;
const MOTION_PREFERENCES = ['no-preference', 'reduce'] as const;

const messages: Record<string, string> = JSON.parse(
	readFileSync(new URL('../messages/fr.json', import.meta.url), 'utf8')
);

test.describe('home page', () => {
	test('shows the title and the tagline in French', async ({ page }) => {
		await page.goto('/');

		await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
		await expect(page).toHaveTitle(messages.home_title ?? '');
		await expect(page.getByRole('heading', { level: 1, name: messages.home_title })).toBeVisible();
		await expect(page.getByText(messages.home_tagline ?? '')).toBeVisible();
	});

	test('opens the game from the big Play button', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		await page.locator('#svelte-announcer').waitFor({ state: 'attached' });

		await page.getByRole('button', { name: messages.home_play, exact: true }).click();

		await expect(page).toHaveURL(/\/jouer$/);
		await expect(
			page.getByRole('heading', { level: 1, name: messages.play_players_title })
		).toBeVisible();
	});

	test('requests nothing from another origin', async ({ page, baseURL }) => {
		const expectedOrigin = new URL(baseURL ?? '').origin;
		const foreignRequests: string[] = [];
		page.on('request', (request) => {
			const url = new URL(request.url());
			if (/^https?:$/.test(url.protocol) && url.origin !== expectedOrigin) {
				foreignRequests.push(request.url());
			}
		});

		await page.goto('/');
		await page.evaluate(() => document.fonts.ready);

		expect(foreignRequests).toEqual([]);
	});
});

for (const colorScheme of COLOR_SCHEMES) {
	for (const reducedMotion of MOTION_PREFERENCES) {
		test.describe(`home page, ${colorScheme} theme, motion ${reducedMotion}`, () => {
			test.use({ colorScheme, reducedMotion });

			test('applies the requested preferences', async ({ page }) => {
				await page.goto('/');

				const applied = await page.evaluate(() => ({
					colorScheme: getComputedStyle(document.documentElement).colorScheme,
					reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
				}));
				expect(applied).toEqual({ colorScheme, reducedMotion: reducedMotion === 'reduce' });
			});

			test('has no axe violation for WCAG A and AA', async ({ page }) => {
				await page.goto('/');
				await page.evaluate(() => document.fonts.ready);

				const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

				expect(results.violations).toEqual([]);
			});
		});
	}
}
