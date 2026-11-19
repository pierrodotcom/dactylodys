import { expect as baseExpect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { CHROMIUM_ONLY } from './engines';
import { expectNoAxeViolation, linkedPaths, openPage } from './support';

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const COLOR_SCHEMES = ['light', 'dark'] as const;
const MOTION_PREFERENCES = ['no-preference', 'reduce'] as const;

const messages: Record<string, string> = JSON.parse(
	readFileSync(new URL('../messages/fr.json', import.meta.url), 'utf8')
);

test.describe('home page', () => {
	test('shows the title and the tagline in French', CHROMIUM_ONLY, async ({ page }) => {
		await openPage(page, '/');

		await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
		await expect(page).toHaveTitle(messages.app_name ?? '');
		await expect(page.getByRole('heading', { level: 1, name: messages.app_name })).toBeVisible();
		await expect(page.getByText(messages.home_tagline ?? '')).toBeVisible();
	});

	test('opens the game from the big Play link', CHROMIUM_ONLY, async ({ page }) => {
		await openPage(page, '/');
		const play = page.getByRole('link', { name: messages.home_play, exact: true });

		await expect(play).toHaveAttribute('href', /\/jouer$/);
		await play.click();

		await expect(page).toHaveURL(/\/jouer$/);
		await expect(
			page.getByRole('heading', { level: 1, name: messages.play_players_title })
		).toBeVisible();
	});

	test('can be played from the keyboard alone', async ({ page }) => {
		await openPage(page, '/');
		const play = page.getByRole('link', { name: messages.home_play, exact: true });

		await play.focus();
		await page.keyboard.press('Enter');

		await expect(page).toHaveURL(/\/jouer$/);
	});

	test(
		'links to the game and the pages for adults only, and to no developer page',
		CHROMIUM_ONLY,
		async ({ page }) => {
			await openPage(page, '/');

			const paths = await linkedPaths(page);

			expect(paths).toEqual([
				'/jouer',
				'/pour-les-adultes',
				'/pour-les-professionnels',
				'/confidentialite',
				'/accessibilite',
				'/credits'
			]);
			expect(paths.filter((path) => path.startsWith('/dev'))).toEqual([]);
		}
	);

	test('requests nothing from another origin', CHROMIUM_ONLY, async ({ page, baseURL }) => {
		const expectedOrigin = new URL(baseURL ?? '').origin;
		const foreignRequests: string[] = [];
		page.on('request', (request) => {
			const url = new URL(request.url());
			if (/^https?:$/.test(url.protocol) && url.origin !== expectedOrigin) {
				foreignRequests.push(request.url());
			}
		});

		await openPage(page, '/');
		await page.evaluate(() => document.fonts.ready);

		expect(foreignRequests).toEqual([]);
	});
});

for (const reducedMotion of MOTION_PREFERENCES) {
	test.describe(`home page, motion ${reducedMotion}`, () => {
		test.use({ reducedMotion });

		for (const colorScheme of COLOR_SCHEMES) {
			test(
				`applies the requested preferences, ${colorScheme} theme`,
				CHROMIUM_ONLY,
				async ({ page }) => {
					await page.emulateMedia({ colorScheme });
					await openPage(page, '/');

					const applied = await page.evaluate(() => ({
						colorScheme: getComputedStyle(document.documentElement).colorScheme,
						reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
					}));
					expect(applied).toEqual({ colorScheme, reducedMotion: reducedMotion === 'reduce' });
				}
			);
		}

		test('has no axe violation for WCAG A and AA, light and dark', async ({ page }) => {
			await openPage(page, '/');

			await expectNoAxeViolation(page);
		});
	});
}
