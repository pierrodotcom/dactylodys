import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Page } from '@playwright/test';
import { loadMessages, openPage, readJson, shortenRewards } from './support';

/**
 * The dialogue game (ADR-057, proposal 12): Floup asks the companion absurd questions, the child
 * types the answers. What the other games share is tested in `games.spec.ts`.
 */

const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const PAGE_URL = '/dev/jeux';
const SKIP_KEY = 'Enter';

const { message, numbered, templateRegex } = loadMessages();
const GROUPS = readJson<{ groups: string[] }>('content/common/dev/games-sample.json').groups;
const FIRST_GROUP = GROUPS[0] ?? '';
const FIRST_CHAR = [...FIRST_GROUP][0] ?? '';
const WRONG_KEY = [...'abcdefghijklmnopqrstuvwxyz'].find((key) => !GROUPS.join('').includes(key));
const GROUP_LABEL = templateRegex('ui_target_text_label');
const GROUP_DONE = templateRegex('ui_target_text_done');
const QUESTIONS = numbered('game_dialogue_question_').map((key) => message(key));
const QUIPS = numbered('game_dialogue_quip_').map((key) => message(key));

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function groupLabel(page: Page) {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

function question(page: Page) {
	return page.locator('.question');
}

function answer(page: Page) {
	return page.locator('.answer');
}

function host(page: Page) {
	return page.locator('.host [data-face]');
}

function announcement(page: Page) {
	return page.locator('[data-game-announcement]');
}

async function startDialogue(page: Page, options: { scenes?: boolean; effects?: boolean } = {}) {
	await page.getByRole('radio', { name: message('game_dialogue_title') }).check();
	if (options.scenes) {
		await page.getByRole('checkbox', { name: message('dev_games_scenes_label') }).check();
	}
	if (options.effects === false) {
		await page.getByRole('checkbox', { name: message('dev_games_effects_label') }).uncheck();
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
	await openPage(page, PAGE_URL);
});

test.describe('game dialogue', () => {
	test('writes the question in Floup’s bubble and keeps the text to type in its own place', async ({
		page
	}) => {
		await startDialogue(page);

		await expect(question(page)).toHaveText(QUESTIONS[0] ?? '');
		await expect(question(page)).toBeVisible();
		await expect(page.locator('.target-text')).toBeVisible();
		await expect(host(page)).toHaveAttribute('data-face', 'asking');
		await expect(answer(page)).not.toHaveAttribute('data-said');
	});

	test('echoes the answer key after key in the companion’s bubble, never a wrong key', async ({
		page
	}) => {
		await startDialogue(page);

		await page.keyboard.press(WRONG_KEY ?? '');
		await expect(page.locator('.target-text [data-error]')).toHaveCount(1);
		await expect(answer(page)).not.toHaveAttribute('data-said');

		await page.keyboard.type(FIRST_CHAR);
		await expect(answer(page)).toHaveText(FIRST_CHAR);
		await expect(question(page)).toHaveText(QUESTIONS[0] ?? '');

		await page.keyboard.type(FIRST_GROUP.slice(FIRST_CHAR.length));
		await expect(answer(page)).toHaveText(FIRST_GROUP);
		await expect(page.locator('.bubble')).toHaveText(QUIPS[0] ?? '');
		await expect(host(page)).not.toHaveAttribute('data-face', 'asking');
	});

	test('asks the next question after the reaction, keeping spaces in the answer', async ({
		page
	}) => {
		await startDialogue(page);

		for (const [index, group] of GROUPS.entries()) {
			await expect(question(page)).toHaveText(QUESTIONS[index] ?? '');
			await page.keyboard.type(group);
			await expect(answer(page)).toHaveText(group);
			await expect(page.locator('.bubble')).toHaveText(QUIPS[index] ?? '');
			if (index < GROUPS.length - 1) await page.keyboard.press(SKIP_KEY);
		}
	});

	test('says the question once, with the text to type, through the announcement of the game', async ({
		page
	}) => {
		await startDialogue(page);
		const first = message('game_dialogue_announce_question', {
			question: QUESTIONS[0] ?? '',
			text: FIRST_GROUP
		});

		await expect(announcement(page)).toHaveText(first);

		await page.keyboard.type(FIRST_CHAR);
		await expect(announcement(page)).not.toContainText(QUESTIONS[0] ?? '');

		await page.keyboard.type(FIRST_GROUP.slice(FIRST_CHAR.length));
		await expect(announcement(page)).toHaveText(
			message('game_dialogue_announce_group', { quip: QUIPS[0] ?? '' })
		);
	});

	test('goes on with the next questions when the game is played again', async ({ page }) => {
		await startDialogue(page);
		await playToTheEnd(page);

		await startDialogue(page);

		await expect(question(page)).toHaveText(QUESTIONS[GROUPS.length] ?? '');
		await page.keyboard.type(FIRST_GROUP);
		await expect(page.locator('.bubble')).toHaveText(QUIPS[GROUPS.length] ?? '');
	});

	test.describe('with motion allowed', () => {
		test.use({ reducedMotion: 'no-preference' });

		test('plays the surprise scenes on Floup, in the order of the list', async ({ page }) => {
			const scenes = readJson<{ games: Record<string, string[]> }>('content/common/scenes.json')
				.games['dialogue'];
			await startDialogue(page, { scenes: true });

			for (const [index, group] of GROUPS.entries()) {
				await page.keyboard.type(group);
				await expect(page.locator(`svg.host[data-scene="${scenes?.[index]}"]`)).toHaveCount(1);
				if (index < GROUPS.length - 1) {
					await expect(async () => {
						await page.keyboard.press(SKIP_KEY);
						await expect(groupLabel(page)).toHaveText(GROUP_LABEL, { timeout: 500 });
					}).toPass();
				}
			}
		});

		test('shakes Floup with laughter, unless motion is calm', async ({ page }) => {
			await startDialogue(page);
			await page.keyboard.type(FIRST_GROUP);
			await expect(host(page)).toHaveAttribute('data-face', 'laughing');
			await expect(page.locator('.host .shake')).not.toHaveCSS('animation-name', 'none');

			await page.keyboard.press('Escape');
			await button(page, message('game_shared_quit')).click();
			await page.getByRole('checkbox', { name: message('dev_games_reduced_label') }).check();
			await startDialogue(page);
			await page.keyboard.type(FIRST_GROUP);
			await expect(host(page)).toHaveAttribute('data-face', 'laughing');
			await expect(page.locator('.host .shake')).toHaveCSS('animation-name', 'none');
		});
	});

	test.describe('with reduced motion', () => {
		test.use({ reducedMotion: 'reduce' });

		test('reacts with a fade, without a scene, and is played to the end', async ({ page }) => {
			await startDialogue(page, { scenes: true });
			await page.keyboard.type(FIRST_GROUP);

			await expect(page.locator('.bubble')).toHaveCSS('animation-name', 'dd-reward-calm');
			await expect(page.locator('[data-scene]')).toHaveCount(0);
			await expect(page.locator('.host .shake')).toHaveCSS('animation-name', 'none');
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

	test('hides the sparkles of joy when the light effects are off, and keeps the face', async ({
		page
	}) => {
		await startDialogue(page, { effects: false });

		// The second reaction is a delighted one, with sparkles.
		await page.keyboard.type(FIRST_GROUP);
		await page.keyboard.press(SKIP_KEY);
		await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
		await page.keyboard.type(GROUPS[1] ?? '');

		await expect(host(page)).toHaveAttribute('data-face', 'delighted');
		await expect(page.locator('.host .sparkle')).toBeHidden();
		await expect(page.locator('.host .layer[data-role="arriving"] .stroke').first()).toBeVisible();
	});

	for (const colorScheme of ['light', 'dark'] as const) {
		test.describe(`${colorScheme} theme`, () => {
			test.use({ colorScheme });

			test('has no axe violation on a question, an answer begun and each kind of reaction', async ({
				page
			}) => {
				test.slow();
				await startDialogue(page);
				await expectNoAxeViolation(page);

				for (const [index, group] of GROUPS.slice(0, 3).entries()) {
					await page.keyboard.type(group.slice(0, 1));
					await expect(answer(page)).toHaveAttribute('data-said');
					await expectNoAxeViolation(page);
					await page.keyboard.type(group.slice(1));
					await expect(groupLabel(page)).toHaveText(GROUP_DONE);
					await expectNoAxeViolation(page);
					if (index < 2) await page.keyboard.press(SKIP_KEY);
				}
			});
		});
	}
});
