import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { GAMES } from '../src/lib/games/registry';
import { linkedPaths, loadMessages, openPage, readJson, shortenRewards } from './support';

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;
const PAGE_URL = '/dev/jeux';
/** Enter is ignored while typing, and moves on to the next group while the reward is on screen. */
const SKIP_KEY = 'Enter';
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

const { message, plural, templateRegex, numbered } = loadMessages();
const sample = readJson<{ groups: string[] }>('content/common/dev/games-sample.json');
const GROUPS = sample.groups;
const FIRST_GROUP = GROUPS[0] ?? '';
const LAST_GROUP = GROUPS[GROUPS.length - 1] ?? '';
const FIRST_CHAR = [...FIRST_GROUP][0] ?? '';
const SECOND_CHAR = [...FIRST_GROUP][1] ?? '';
const TOTAL_KEYS = Array.from(
	new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(GROUPS.join('')),
	(part) => part.segment
).length;
/** A letter that no group asks for. */
const WRONG_KEY = [...ALPHABET].find((letter) => !GROUPS.join('').includes(letter)) ?? '';

const GROUP_LABEL = templateRegex('ui_target_text_label');
const GROUP_DONE = templateRegex('ui_target_text_done');

/** What to look at in each game: message keys and the part of the picture that moves with the keys. */
interface GameExpectations {
	progressKey: string;
	progressParam: string;
	bubblePrefix: string;
	/** Changes when the picture advances one step; stays the same when it does not. */
	probe: (page: Page) => Promise<string>;
}

const EXPECTATIONS: Readonly<Record<string, GameExpectations>> = {
	hatching: {
		progressKey: 'game_hatching_progress',
		progressParam: 'hatched',
		bubblePrefix: 'game_hatching_cry_',
		probe: async (page) => String(await page.locator('.crack').count())
	},
	rocket: {
		progressKey: 'game_rocket_progress',
		progressParam: 'reached',
		bubblePrefix: 'game_rocket_greeting_',
		probe: async (page) =>
			(await page.locator('.rocket').locator('xpath=..').getAttribute('transform')) ?? ''
	},
	recipe: {
		progressKey: 'game_recipe_progress',
		progressParam: 'done',
		bubblePrefix: 'game_recipe_quip_',
		probe: async (page) => String(await page.locator('.cut').count())
	}
};

const games = GAMES.map((game) => {
	const expectations = EXPECTATIONS[game.id];
	if (!expectations) throw new Error(`Add the expectations of the game "${game.id}" to this spec`);
	return { id: game.id, title: message(`game_${game.id}_title`), ...expectations };
});
type Game = (typeof games)[number];

function gameNamed(id: string): Game {
	const game = games.find((item) => item.id === id);
	if (!game) throw new Error(`The game "${id}" is not in the registry`);
	return game;
}

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function groupLabel(page: Page): Locator {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

function doneCells(page: Page): Locator {
	return page.locator('.target-text [data-state="done"]');
}

function errorCells(page: Page): Locator {
	return page.locator('.target-text [data-error]');
}

function gameRadio(page: Page, game: Game) {
	return page.getByRole('radio', { name: game.title });
}

function resultHeading(page: Page) {
	return page.getByRole('heading', { level: 2, name: message('dev_games_result_heading') });
}

function pauseDialog(page: Page) {
	return page.getByRole('dialog', { name: message('game_shared_pause_title') });
}

function continueButton(page: Page) {
	return button(page, message('game_shared_finale_continue'));
}

async function openChooser(page: Page) {
	await openPage(page, PAGE_URL);
	await expect(
		page.getByRole('heading', { level: 1, name: message('dev_games_title') })
	).toBeVisible();
}

async function beginGame(page: Page, game: Game) {
	await gameRadio(page, game).check();
	await button(page, message('dev_games_play')).click();
	await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
}

async function startGame(page: Page, game: Game) {
	await openChooser(page);
	await beginGame(page, game);
}

async function currentGroup(page: Page): Promise<string> {
	const label = groupLabel(page);
	await expect(label).toHaveText(GROUP_LABEL);
	const text = (await label.textContent()) ?? '';
	return GROUP_LABEL.exec(text)?.groups?.['text'] ?? '';
}

function progressLabel(game: Game, done: number): string {
	return plural(game.progressKey, done, { [game.progressParam]: done, total: GROUPS.length });
}

interface PlayOptions {
	/** Press a key while the reward is on screen, which moves on without waiting. */
	skipDelay?: boolean;
	/** Index of the first group left to type. */
	from?: number;
	/** Index after the last group to type. */
	until?: number;
}

/**
 * The reward lasts about a second: the group done and the bubble are checked together, in the page,
 * because a slow browser would let several round trips go by and miss both.
 */
async function expectRewardShown(page: Page, bubble: string) {
	await page.waitForFunction(
		([text, doneSource]) => {
			const label = document.querySelector('.target-text > .dd-visually-hidden');
			return (
				document.querySelector('.bubble')?.textContent?.trim() === text &&
				new RegExp(doneSource, 's').test(label?.textContent ?? '')
			);
		},
		[bubble, GROUP_DONE.source] as const
	);
}

/** Types the groups from `from` on, checking the rewards on the way. */
async function typeGroups(page: Page, game: Game, options: PlayOptions = {}) {
	for (let index = options.from ?? 0; index < (options.until ?? GROUPS.length); index++) {
		const group = await currentGroup(page);
		expect(group).toBe(GROUPS[index]);
		await page.keyboard.type(group);
		await expectRewardShown(page, message(`${game.bubblePrefix}${index + 1}`));
		await expect(page.getByRole('img', { name: progressLabel(game, index + 1) })).toBeVisible();
		if (index < GROUPS.length - 1 && options.skipDelay) await page.keyboard.press(SKIP_KEY);
	}
}

/** The last reward is on screen: leave it, through the final picture of the game when it has one. */
async function leaveLastReward(page: Page) {
	await page.keyboard.press(SKIP_KEY);
	await expect(resultHeading(page).or(continueButton(page))).toBeVisible();
	if (await continueButton(page).isVisible()) await continueButton(page).click();
	await expect(resultHeading(page)).toBeVisible();
}

async function expectNoAxeViolation(page: Page) {
	await page.evaluate(() => document.fonts.ready);
	const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
	expect(results.violations).toEqual([]);
}

interface RawMetrics {
	accuracy: number;
	totalKeystrokes: number;
	errorCount: number;
}

async function rawResult(page: Page): Promise<RawMetrics> {
	return JSON.parse(await page.locator('.raw').innerText()) as RawMetrics;
}

test.beforeEach(async ({ page }) => {
	await shortenRewards(page);
});

test.describe('games test page', () => {
	test('is not linked from the home page', async ({ page }) => {
		await openPage(page, '/');

		expect(await linkedPaths(page)).not.toContain(PAGE_URL);
	});

	test('offers every game of the registry as a card with its description', async ({ page }) => {
		await openChooser(page);

		await expect(page.getByRole('radio')).toHaveCount(GAMES.length);
		for (const game of games) {
			await expect(gameRadio(page, game)).toBeVisible();
			await expect(page.getByText(message(`game_${game.id}_description`))).toBeVisible();
		}
		await expect(page.getByRole('radio').first()).toBeChecked();
	});

	test('chooses the game with the arrow keys and starts it with the keyboard', async ({ page }) => {
		await openChooser(page);
		const second = games[1] ?? gameNamed('rocket');

		await page.getByRole('radio').first().focus();
		await page.keyboard.press('ArrowDown');

		await expect(gameRadio(page, second)).toBeChecked();
		await button(page, message('dev_games_play')).focus();
		await page.keyboard.press('Enter');
		await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
		await expect(page.getByRole('img', { name: progressLabel(second, 0) })).toBeVisible();
	});

	test('gives every card and button a touch target of at least 48 pixels', async ({ page }) => {
		await openChooser(page);

		const targets = [
			...(await page.locator('label:has(input[type="radio"])').all()),
			button(page, message('dev_games_play'))
		];
		for (const target of targets) {
			const box = await target.boundingBox();
			expect(box?.height ?? 0).toBeGreaterThanOrEqual(48);
			expect(box?.width ?? 0).toBeGreaterThanOrEqual(48);
		}
	});

	for (const colorScheme of COLOR_SCHEMES) {
		test.describe(`${colorScheme} theme`, () => {
			test.use({ colorScheme });

			test('has no axe violation on the choice and on the raw result', async ({ page }) => {
				test.slow();
				await openChooser(page);
				await expectNoAxeViolation(page);

				await beginGame(page, gameNamed('hatching'));
				await page.keyboard.type(FIRST_GROUP);
				await page.keyboard.press(SKIP_KEY);
				await typeGroups(page, gameNamed('hatching'), { from: 1, skipDelay: true });
				await leaveLastReward(page);
				await expectNoAxeViolation(page);
			});
		});
	}
});

for (const game of games) {
	test.describe(`game ${game.id}`, () => {
		test('is played to the end with the keyboard, to the raw result', async ({ page }) => {
			await startGame(page, game);
			await expect(page.getByRole('img', { name: progressLabel(game, 0) })).toBeVisible();

			await typeGroups(page, game);
			await leaveLastReward(page);

			const raw = await rawResult(page);
			expect(raw.accuracy).toBe(100);
			expect(raw.totalKeystrokes).toBe(TOTAL_KEYS);
			expect(raw.errorCount).toBe(0);
		});

		test('does not advance on a wrong key, flags it, and goes on with the right ones', async ({
			page
		}) => {
			await startGame(page, game);
			const before = await game.probe(page);

			await page.keyboard.press(WRONG_KEY);

			await expect(errorCells(page)).toHaveCount(1);
			await expect(errorCells(page)).toHaveText(FIRST_CHAR);
			await expect(doneCells(page)).toHaveCount(0);
			await expect(page.locator('.keyboard [data-wrong]')).toHaveAttribute(
				'data-code',
				`Key${WRONG_KEY.toUpperCase()}`
			);
			expect(await game.probe(page)).toBe(before);
			await expect(page.locator('main')).not.toContainText(/%|\b(erreurs?|fautes?|score|vies?)\b/i);

			await page.keyboard.type(FIRST_CHAR);

			await expect(errorCells(page)).toHaveCount(0);
			await expect(doneCells(page)).toHaveCount(1);
			expect(await game.probe(page)).not.toBe(before);

			await page.keyboard.type(FIRST_GROUP.slice(FIRST_CHAR.length));
			await expect(groupLabel(page)).toHaveText(GROUP_DONE);
			await page.keyboard.press(SKIP_KEY);
			await typeGroups(page, game, { from: 1, skipDelay: true });
			await leaveLastReward(page);

			const raw = await rawResult(page);
			expect(raw.errorCount).toBe(1);
			expect(raw.totalKeystrokes).toBe(TOTAL_KEYS + 1);
			expect(raw.accuracy).toBeLessThan(100);
		});

		test('pauses with Escape, resumes where it was, and quits to the choice', async ({ page }) => {
			await startGame(page, game);
			await page.keyboard.type(FIRST_CHAR);
			await expect(doneCells(page)).toHaveCount(1);

			await page.keyboard.press('Escape');

			await expect(pauseDialog(page)).toBeVisible();
			await expect(button(page, message('game_shared_resume'))).toBeFocused();
			await page.keyboard.press(SECOND_CHAR);
			await page.keyboard.press('Escape');
			await expect(pauseDialog(page)).toHaveCount(0);
			await expect(page.locator('#game-input')).toBeFocused();
			await expect(doneCells(page)).toHaveCount(1);

			await button(page, message('game_shared_pause')).click();
			await expect(pauseDialog(page)).toBeVisible();
			await button(page, message('game_shared_quit')).click();

			await expect(
				page.getByRole('heading', { level: 1, name: message('dev_games_title') })
			).toBeVisible();
			await expect(resultHeading(page)).toHaveCount(0);
			await beginGame(page, game);
			await expect(doneCells(page)).toHaveCount(0);
		});

		test('can be played without the on-screen keyboard', async ({ page }) => {
			await openChooser(page);
			await page.getByRole('checkbox', { name: message('dev_games_keyboard_label') }).uncheck();

			await beginGame(page, game);

			await expect(page.locator('.keyboard')).toHaveCount(0);
			await typeGroups(page, game, { skipDelay: true });
			await leaveLastReward(page);
			await expect(resultHeading(page)).toBeVisible();
		});

		for (const colorScheme of COLOR_SCHEMES) {
			test.describe(`${colorScheme} theme`, () => {
				test.use({ colorScheme });

				test('has no axe violation while typing, after a mistake, on a reward, paused and at the end', async ({
					page
				}) => {
					test.slow();
					await startGame(page, game);
					await expectNoAxeViolation(page);

					await page.keyboard.press(WRONG_KEY);
					await expect(errorCells(page)).toHaveCount(1);
					await expectNoAxeViolation(page);

					await page.keyboard.type(FIRST_GROUP);
					await expect(groupLabel(page)).toHaveText(GROUP_DONE);
					await expect(page.locator('.bubble')).toBeVisible();
					await expectNoAxeViolation(page);

					await page.keyboard.press('Escape');
					await expect(pauseDialog(page)).toBeVisible();
					await expectNoAxeViolation(page);
					await button(page, message('game_shared_resume')).click();

					await page.keyboard.press(SKIP_KEY);
					await typeGroups(page, game, { from: 1, skipDelay: true });
					await expect(resultHeading(page).or(continueButton(page))).toBeVisible();
					if (await continueButton(page).isVisible()) {
						await expectNoAxeViolation(page);
						await continueButton(page).click();
					}
					await expect(resultHeading(page)).toBeVisible();
					await expectNoAxeViolation(page);
				});
			});
		}

		test.describe('with reduced motion', () => {
			test.use({ reducedMotion: 'reduce' });

			test('follows the system setting and plays the same game, with a fade and no movement', async ({
				page
			}) => {
				await openChooser(page);
				await expect(
					page.getByRole('checkbox', { name: message('dev_games_reduced_label') })
				).toBeChecked();
				await beginGame(page, game);

				await page.keyboard.type(FIRST_GROUP);
				await expect(groupLabel(page)).toHaveText(GROUP_DONE);
				await expect(page.locator('.bubble')).toHaveCSS('animation-name', 'dd-reward-calm');

				await page.keyboard.press(SKIP_KEY);
				await typeGroups(page, game, { from: 1, skipDelay: true });
				await leaveLastReward(page);
				expect((await rawResult(page)).accuracy).toBe(100);
			});
		});

		test.describe('with motion allowed', () => {
			test.use({ reducedMotion: 'no-preference' });

			test('moves the reward bubble, unless the page is told to be still', async ({ page }) => {
				await openChooser(page);
				const reduced = page.getByRole('checkbox', { name: message('dev_games_reduced_label') });
				await expect(reduced).not.toBeChecked();
				await beginGame(page, game);

				await page.keyboard.type(FIRST_GROUP);
				await expect(page.locator('.bubble')).toHaveCSS('animation-name', 'dd-reward-0');

				await page.keyboard.press('Escape');
				await button(page, message('game_shared_quit')).click();
				await reduced.check();
				await beginGame(page, game);
				await page.keyboard.type(FIRST_GROUP);
				await expect(page.locator('.bubble')).toHaveCSS('animation-name', 'dd-reward-calm');
			});
		});
	});
}

test.describe('game rocket', () => {
	const rocket = gameNamed('rocket');

	test('coughs a little cloud on a wrong key, and loses nothing', async ({ page }) => {
		await startGame(page, rocket);
		await expect(page.locator('.puff')).toHaveCount(0);

		await page.keyboard.press(WRONG_KEY);

		await expect(page.locator('.puff')).not.toHaveCount(0);
		await page.keyboard.type(FIRST_CHAR);
		await expect(page.locator('.puff')).toHaveCount(0);
	});

	test('moves one notch further with every good key, and reaches the astre with the last', async ({
		page
	}) => {
		await startGame(page, rocket);
		const moves = [await rocket.probe(page)];
		for (const char of [...FIRST_GROUP]) {
			await page.keyboard.type(char);
			moves.push(await rocket.probe(page));
		}

		expect(new Set(moves).size).toBe(moves.length);
		await expect(page.locator('svg.sky .astre[data-lit]')).toHaveCount(2);
	});

	test('lands on the last astre, legs out', async ({ page }) => {
		await startGame(page, rocket);
		await expect(page.locator('.rocket .leg')).toHaveCount(0);

		await typeGroups(page, rocket, { skipDelay: true });

		await expect(page.locator('.rocket .leg')).not.toHaveCount(0);
	});

	test('draws the same fixed sky every time', async ({ page }) => {
		const sky = () =>
			page
				.locator('.star')
				.evaluateAll((stars) =>
					stars.map((star) => `${star.getAttribute('cx')},${star.getAttribute('cy')}`)
				);
		await startGame(page, rocket);
		const first = await sky();
		await page.keyboard.type(FIRST_GROUP);
		expect(await sky()).toEqual(first);

		await page.keyboard.press('Escape');
		await button(page, message('game_shared_quit')).click();
		await beginGame(page, rocket);

		expect(first.length).toBeGreaterThan(0);
		expect(await sky()).toEqual(first);
	});
});

test.describe('game recipe', () => {
	const recipe = gameNamed('recipe');

	function possibleDishes(): string[] {
		return numbered('game_recipe_dish_').map((key) =>
			message(key, { first: FIRST_GROUP, last: LAST_GROUP })
		);
	}

	test('drops the ingredient in the pot with a bubble when its group is done', async ({ page }) => {
		await startGame(page, recipe);
		await expect(page.locator('.bubble-dot')).toHaveCount(0);

		await page.keyboard.type(FIRST_GROUP);

		await expect(page.locator('.bubble-dot')).not.toHaveCount(0);
		await expect(page.locator('.bubble')).toHaveText(message('game_recipe_quip_1'));
	});

	test('names the dish after the first and the last group, before the raw result', async ({
		page
	}) => {
		await startGame(page, recipe);

		await typeGroups(page, recipe, { skipDelay: true });

		await expect(
			page.getByRole('heading', { level: 2, name: message('game_recipe_finale_title') })
		).toBeVisible();
		const name = (await page.locator('.dish-name').textContent()) ?? '';
		expect(possibleDishes()).toContain(name);
		expect(name).toContain(FIRST_GROUP);
		expect(name).toContain(LAST_GROUP);
		await expect(resultHeading(page)).toHaveCount(0);
		await expect(continueButton(page)).toBeFocused();

		await page.keyboard.press('Enter');

		await expect(resultHeading(page)).toBeVisible();
	});

	test('keeps its final picture when Enter is pressed to skip the last reward', async ({
		page
	}) => {
		await startGame(page, recipe);
		await typeGroups(page, recipe, { skipDelay: true, until: GROUPS.length - 1 });
		await page.keyboard.press(SKIP_KEY);
		await expect(groupLabel(page)).toHaveText(GROUP_LABEL);

		await page.keyboard.type(LAST_GROUP);
		await page.keyboard.press(SKIP_KEY);

		await expect(page.locator('.dish-name')).toBeVisible();
		await expect(continueButton(page)).toBeFocused();
		await expect(resultHeading(page)).toHaveCount(0);
	});

	test('gives the same dish every time the same exercise is played', async ({ page }) => {
		await startGame(page, recipe);
		await typeGroups(page, recipe, { skipDelay: true });
		await expect(page.locator('.dish-name')).toBeVisible();
		const first = await page.locator('.dish-name').textContent();
		await continueButton(page).click();
		await expect(resultHeading(page)).toBeVisible();

		await beginGame(page, recipe);
		await typeGroups(page, recipe, { skipDelay: true });

		await expect(page.locator('.dish-name')).toHaveText(first ?? '');
	});

	test('cuts the ingredient a little more with each good key', async ({ page }) => {
		await startGame(page, recipe);

		const cuts: number[] = [await page.locator('.cut').count()];
		for (const char of [...FIRST_GROUP]) {
			await page.keyboard.type(char);
			cuts.push(await page.locator('.cut').count());
		}

		expect(cuts[0]).toBe(0);
		expect([...cuts].sort((a, b) => a - b)).toEqual(cuts);
		expect(cuts[cuts.length - 1]).toBeGreaterThan(0);
	});
});
