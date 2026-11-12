import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Page } from '@playwright/test';
import { GAMES } from '../src/lib/games/registry';
import { GAME_DECORS, type DecorGameId } from '../src/lib/games/shared/decor';
import { loadMessages, openPage, readJson, shortenRewards } from './support';

/**
 * Decors (ADR-057, level 2 of the animations): each game changes its decor with the number of
 * plays of this game already finished; the first play keeps the decor it always had.
 */

const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;
const PAGE_URL = '/dev/jeux';
/** Enter is ignored while typing, and moves on to the next group while the reward is on screen. */
const SKIP_KEY = 'Enter';

const { message, templateRegex } = loadMessages();
const GROUPS = readJson<{ groups: string[] }>('content/common/dev/games-sample.json').groups;
const FIRST_GROUP = GROUPS[0] ?? '';
const GROUP_LABEL = templateRegex('ui_target_text_label');
const GROUP_DONE = templateRegex('ui_target_text_done');

const games = GAMES.map((game) => ({
	id: game.id,
	title: message(`game_${game.id}_title`),
	decors: GAME_DECORS[game.id as DecorGameId] as readonly string[]
}));
type Game = (typeof games)[number];

function gameNamed(id: string): Game {
	const game = games.find((item) => item.id === id);
	if (!game) throw new Error(`The game "${id}" is not in the registry`);
	return game;
}

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function groupLabel(page: Page) {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

function decorOf(page: Page) {
	return page.locator('[data-decor]');
}

function playsField(page: Page) {
	return page.getByRole('spinbutton', { name: message('dev_games_plays_label') });
}

/** Chooses a game on the test page, sets how many plays of it are finished, and starts it. */
async function startGame(page: Page, game: Game, plays?: number) {
	await page.getByRole('radio', { name: game.title }).check();
	if (plays !== undefined) await playsField(page).fill(String(plays));
	await button(page, message('dev_games_play')).click();
	await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
}

async function playToTheEnd(page: Page) {
	for (const [index, group] of GROUPS.entries()) {
		await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
		await page.keyboard.type(group);
		await expect(groupLabel(page)).toHaveText(GROUP_DONE);
		if (index < GROUPS.length - 1) await page.keyboard.press(SKIP_KEY);
	}
	await page.keyboard.press(SKIP_KEY);
	const result = page.getByRole('heading', {
		level: 2,
		name: message('dev_games_result_heading')
	});
	const next = button(page, message('game_shared_finale_continue'));
	await expect(result.or(next)).toBeVisible();
	if (await next.isVisible()) await next.click();
	await expect(result).toBeVisible();
}

async function expectNoAxeViolation(page: Page) {
	await page.evaluate(() => document.fonts.ready);
	const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
	expect(results.violations).toEqual([]);
}

test.beforeEach(async ({ page }) => {
	await shortenRewards(page);
	await openPage(page, PAGE_URL);
});

test.describe('decors of the games', () => {
	for (const game of games) {
		test(`${game.id}: keeps the decor of today on the first play`, async ({ page }) => {
			await startGame(page, game);

			await expect(decorOf(page)).toHaveCount(1);
			await expect(decorOf(page)).toHaveAttribute('data-decor', game.decors[0] ?? '');
		});

		test(`${game.id}: shows each decor in turn as the plays go on, then the first again`, async ({
			page
		}) => {
			const plays = [...game.decors.keys(), game.decors.length];
			for (const count of plays) {
				await startGame(page, game, count);
				await expect(decorOf(page)).toHaveAttribute(
					'data-decor',
					game.decors[count % game.decors.length] ?? ''
				);
				await page.keyboard.press('Escape');
				await button(page, message('game_shared_quit')).click();
			}
		});
	}

	test('changes the decor of a game that is played again', async ({ page }) => {
		const tower = gameNamed('tower');
		await startGame(page, tower);
		await expect(decorOf(page)).toHaveAttribute('data-decor', tower.decors[0] ?? '');

		await playToTheEnd(page);
		await expect(playsField(page)).toHaveValue('1');
		await startGame(page, tower);

		await expect(decorOf(page)).toHaveAttribute('data-decor', tower.decors[1] ?? '');
	});

	test.describe('with reduced motion and the light effects off', () => {
		test.use({ reducedMotion: 'reduce' });

		test('keeps the decor, a fixed background, and hides only what shines', async ({ page }) => {
			await page.getByRole('checkbox', { name: message('dev_games_effects_label') }).uncheck();
			await startGame(page, gameNamed('train'), 1);

			const scene = page.locator('svg[data-decor="autumn"]');
			await expect(scene).toBeVisible();
			await expect(scene.locator('.low-sun')).toBeVisible();
			await expect(scene.locator('.fallen').first()).toBeVisible();
			await expect(scene.locator('.halo')).toBeHidden();
			const moving = await scene.evaluate((svg) =>
				[...svg.querySelectorAll('.low-sun, .fallen, .flake, .snow')].some(
					(node) => getComputedStyle(node).animationName !== 'none'
				)
			);
			expect(moving).toBe(false);

			await page.keyboard.type(FIRST_GROUP);
			await expect(groupLabel(page)).toHaveText(GROUP_DONE);
			await expect(page.locator('svg[data-decor="autumn"]')).toBeVisible();
		});
	});

	for (const colorScheme of COLOR_SCHEMES) {
		test.describe(`${colorScheme} theme`, () => {
			test.use({ colorScheme });

			for (const game of games) {
				test(`${game.id}: has no axe violation in any decor, while typing and on a reward`, async ({
					page
				}) => {
					test.slow();
					for (const [count, decor] of game.decors.entries()) {
						await startGame(page, game, count);
						await expect(decorOf(page)).toHaveAttribute('data-decor', decor);
						await expectNoAxeViolation(page);

						await page.keyboard.type(FIRST_GROUP);
						await expect(groupLabel(page)).toHaveText(GROUP_DONE);
						await expectNoAxeViolation(page);

						await page.keyboard.press('Escape');
						await button(page, message('game_shared_quit')).click();
					}
				});
			}
		});
	}
});
