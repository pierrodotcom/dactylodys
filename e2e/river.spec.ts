import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Page } from '@playwright/test';
import { OBJECT_ARTS } from '../src/lib/games/river/shapes';
import { loadMessages, openPage, readJson, shortenRewards } from './support';

/**
 * The river (ADR-057, proposal 12): objects float slowly down a river and wait at the dock until
 * their group is typed; the companion fishes them out into a crate. Nothing floats away, nothing
 * hurries the child. What the other games share is tested in `games.spec.ts`.
 */

const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const PAGE_URL = '/dev/jeux';
const SKIP_KEY = 'Enter';
/** Where the object of the group waits (`river.ts`), as the transform of its drawing. */
const AT_THE_DOCK = 'translate(260 136) scale(1)';
/** Much longer than any movement of the game. */
const LONG_WAIT_MS = 120_000;

const { message, numbered, templateRegex } = loadMessages();
const GROUPS = readJson<{ groups: string[] }>('content/common/dev/games-sample.json').groups;
const FIRST_GROUP = GROUPS[0] ?? '';
const FIRST_CHAR = [...FIRST_GROUP][0] ?? '';
const WRONG_KEY = [...'abcdefghijklmnopqrstuvwxyz'].find((key) => !GROUPS.join('').includes(key));
const GROUP_LABEL = templateRegex('ui_target_text_label');
const GROUP_DONE = templateRegex('ui_target_text_done');
const QUIPS = numbered('game_river_quip_').map((key) => message(key));
const OBJECTS = numbered('game_river_object_').map((key) => message(key));

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function groupLabel(page: Page) {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

function docked(page: Page) {
	return page.locator('.floater[data-role="docked"]');
}

function scene(page: Page) {
	return page.locator('.river-scene');
}

async function startRiver(
	page: Page,
	options: { scenes?: boolean; effects?: boolean; plays?: number } = {}
) {
	await page.getByRole('radio', { name: message('game_river_title') }).check();
	if (options.scenes) {
		await page.getByRole('checkbox', { name: message('dev_games_scenes_label') }).check();
	}
	if (options.effects === false) {
		await page.getByRole('checkbox', { name: message('dev_games_effects_label') }).uncheck();
	}
	if (options.plays !== undefined) {
		await page
			.getByRole('spinbutton', { name: message('dev_games_plays_label') })
			.fill(String(options.plays));
	}
	await button(page, message('dev_games_play')).click();
	await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
}

/** Types every group, moving on from each reward with a key, up to the raw result. */
async function playToTheEnd(page: Page) {
	for (const [index, group] of GROUPS.entries()) {
		await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
		await page.keyboard.type(group);
		await expect(groupLabel(page)).toHaveText(GROUP_DONE);
		if (index < GROUPS.length - 1) await page.keyboard.press(SKIP_KEY);
	}
	await page.keyboard.press(SKIP_KEY);
	await expect(
		page.getByRole('heading', { level: 2, name: message('dev_games_result_heading') })
	).toBeVisible();
}

async function expectNoAxeViolation(page: Page) {
	await page.evaluate(() => document.fonts.ready);
	const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
	expect(results.violations).toEqual([]);
}

test.beforeEach(async ({ page }) => {
	await shortenRewards(page);
});

test.describe('game river', () => {
	test.beforeEach(async ({ page }) => {
		await openPage(page, PAGE_URL);
	});

	test('writes the group on the object at the dock and keeps the text to type in its own place', async ({
		page
	}) => {
		await startRiver(page);

		await expect(docked(page)).toHaveCount(1);
		await expect(docked(page).locator('.tag-text')).toHaveText(FIRST_GROUP);
		await expect(docked(page)).toHaveAttribute('data-art', OBJECT_ARTS[0]?.id ?? '');
		await expect(page.locator('.target-text')).toBeVisible();
		await expect(page.locator('.floater[data-role="waiting"]')).toHaveCount(2);
	});

	test('does not move on a wrong key, flags it, and echoes the good keys on the object', async ({
		page
	}) => {
		await startRiver(page);

		await page.keyboard.press(WRONG_KEY ?? '');
		await expect(page.locator('.target-text [data-error]')).toHaveCount(1);
		await expect(scene(page)).toHaveAttribute('data-probe', '0');
		await expect(docked(page).locator('.typed')).toHaveText('');

		await page.keyboard.type(FIRST_CHAR);
		await expect(scene(page)).toHaveAttribute('data-probe', '1');
		await expect(docked(page).locator('.typed')).toHaveText(FIRST_CHAR);
		await expect(docked(page).locator('.pending')).toHaveText(FIRST_GROUP.slice(1));
	});

	test('fishes the object out into the crate, says which one, and brings the next to the dock', async ({
		page
	}) => {
		await startRiver(page);
		await page.keyboard.type(FIRST_GROUP);

		await expect(page.locator('.floater[data-role="caught"]')).toHaveAttribute(
			'data-art',
			OBJECT_ARTS[0]?.id ?? ''
		);
		await expect(page.locator('.bubble')).toHaveText(QUIPS[0] ?? '');
		await expect(page.locator('[data-game-announcement]')).toHaveText(
			message('game_river_announce_group', { object: OBJECTS[0] ?? '', quip: QUIPS[0] ?? '' })
		);
		await expect(docked(page)).toHaveAttribute('data-art', OBJECT_ARTS[1]?.id ?? '');

		await page.keyboard.press(SKIP_KEY);
		await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
		await expect(page.locator('.floater[data-role="collected"]')).toHaveCount(1);
		await expect(docked(page).locator('.tag-text')).toHaveText(GROUPS[1] ?? '');
	});

	test('pauses with Escape and takes up the same object, with the keys already typed', async ({
		page
	}) => {
		await startRiver(page);
		await page.keyboard.type(FIRST_CHAR);

		await page.keyboard.press('Escape');
		await expect(
			page.getByRole('dialog', { name: message('game_shared_pause_title') })
		).toBeVisible();
		await button(page, message('game_shared_resume')).click();

		await expect(docked(page)).toHaveAttribute('data-art', OBJECT_ARTS[0]?.id ?? '');
		await expect(docked(page).locator('.typed')).toHaveText(FIRST_CHAR);
		await page.keyboard.type(FIRST_GROUP.slice(FIRST_CHAR.length));
		await expect(groupLabel(page)).toHaveText(GROUP_DONE);
	});

	test('goes on with the next objects when the game is played again', async ({ page }) => {
		await startRiver(page);
		await playToTheEnd(page);

		await startRiver(page);

		await expect(docked(page)).toHaveAttribute('data-art', OBJECT_ARTS[GROUPS.length]?.id ?? '');
		await page.keyboard.type(FIRST_GROUP);
		await expect(page.locator('.bubble')).toHaveText(QUIPS[GROUPS.length] ?? '');
	});

	test.describe('with motion allowed', () => {
		test.use({ reducedMotion: 'no-preference' });

		test('floats the first object slowly to the dock, where it stops', async ({ page }) => {
			await startRiver(page);

			await expect(docked(page)).not.toHaveAttribute('transform', AT_THE_DOCK);
			await expect(docked(page)).toHaveAttribute('transform', AT_THE_DOCK);
		});

		test('plays the surprise scenes on the river, in the order of the list', async ({ page }) => {
			const scenes = readJson<{ games: Record<string, string[]> }>('content/common/scenes.json')
				.games['river'];
			await startRiver(page, { scenes: true });

			for (const [index, group] of GROUPS.entries()) {
				await page.keyboard.type(group);
				await expect(page.locator(`.surprise[data-scene="${scenes?.[index]}"]`)).toHaveCount(1);
				if (index < GROUPS.length - 1) {
					await expect(async () => {
						await page.keyboard.press(SKIP_KEY);
						await expect(groupLabel(page)).toHaveText(GROUP_LABEL, { timeout: 500 });
					}).toPass();
				}
			}
		});
	});

	test.describe('with reduced motion', () => {
		test.use({ reducedMotion: 'reduce' });

		test('puts the objects in a still line, and the one caught fades into the crate', async ({
			page
		}) => {
			await startRiver(page, { scenes: true });
			await expect(docked(page)).toHaveAttribute('transform', AT_THE_DOCK);

			await page.keyboard.type(FIRST_GROUP);

			const caught = page.locator('.floater[data-role="caught"]');
			await expect(caught.locator('.body')).toHaveCSS('animation-name', 'dd-reward-calm');
			await expect(page.locator('[data-scene]')).toHaveCount(0);
			await expect(docked(page)).toHaveAttribute('transform', AT_THE_DOCK);
			await page.keyboard.press(SKIP_KEY);
			for (const group of GROUPS.slice(1)) {
				await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
				await page.keyboard.type(group);
				await expect(groupLabel(page)).toHaveText(GROUP_DONE);
				await page.keyboard.press(SKIP_KEY);
			}
			await expect(
				page.getByRole('heading', { level: 2, name: message('dev_games_result_heading') })
			).toBeVisible();
		});
	});

	test('hides the glow of the fireflies when the light effects are off, and keeps the river', async ({
		page
	}) => {
		await startRiver(page, { effects: false, plays: 2 });

		await expect(scene(page)).toHaveAttribute('data-decor', 'night');
		await expect(page.locator('.firefly-glow').first()).toBeHidden();
		await expect(page.locator('.firefly').first()).toBeVisible();
		await expect(docked(page)).toBeVisible();
	});

	for (const colorScheme of ['light', 'dark'] as const) {
		test.describe(`${colorScheme} theme`, () => {
			test.use({ colorScheme });

			test('has no axe violation in each decor, while typing and once an object is caught', async ({
				page
			}) => {
				test.slow();
				for (const plays of [0, 1, 2]) {
					if (plays > 0) await openPage(page, PAGE_URL);
					await startRiver(page, { plays });
					await page.keyboard.type(FIRST_CHAR);
					await expectNoAxeViolation(page);
					await page.keyboard.type(FIRST_GROUP.slice(FIRST_CHAR.length));
					await expect(groupLabel(page)).toHaveText(GROUP_DONE);
					await expectNoAxeViolation(page);
				}
			});
		});
	}
});

test('loses nothing when the child waits a long time without typing', async ({ page }) => {
	await page.clock.install();
	await openPage(page, PAGE_URL);
	await page.clock.resume();
	await startRiver(page);
	await page.keyboard.type(FIRST_CHAR);

	await page.clock.fastForward(LONG_WAIT_MS);

	await expect(docked(page)).toHaveAttribute('data-art', OBJECT_ARTS[0]?.id ?? '');
	await expect(docked(page)).toHaveAttribute('transform', AT_THE_DOCK);
	await expect(docked(page).locator('.typed')).toHaveText(FIRST_CHAR);
	await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
	await expect(
		page.locator('.floater[data-role="caught"], .floater[data-role="collected"]')
	).toHaveCount(0);
	await page.keyboard.type(FIRST_GROUP.slice(FIRST_CHAR.length));
	await expect(groupLabel(page)).toHaveText(GROUP_DONE);
});
