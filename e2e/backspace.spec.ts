import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { toGraphemes } from '../src/lib/engine/graphemes';
import { updateSettings } from '../src/lib/state/profile';
import type { Profile } from '../src/lib/state/types';
import {
	advancedProfile,
	expectNoAxeViolation,
	installProfile,
	loadMessages,
	openPage,
	readJson,
	reloadPage,
	setRewards,
	storedRecord,
	throughStory
} from './support';

/**
 * The Backspace setting (ADR-057): chosen by the adult. Always, a wrong key is written in the text
 * and the child erases it before going on; never, the game waits for the right key; by default the
 * world decides (ADR-075), and the first worlds wait for the right key.
 */

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const { message, templateRegex } = loadMessages();
const GROUP_LABEL = templateRegex('ui_target_text_label');
const GROUP_DONE = templateRegex('ui_target_text_done');

interface Lesson {
	id: string;
	title: string;
}
const worlds = readJson<{ worlds: { lessons: Lesson[] }[] }>(
	'content/fr/progression/azerty-decouverte.json'
).worlds;
const FIRST = worlds[0]?.lessons[0] as Lesson;
const gateNumbers = readJson<{ numbers: { value: number; words: string }[] }>(
	'content/fr/adult/gate-numbers.json'
).numbers;

const NAME = 'Lou';

function child(): Profile {
	return advancedProfile({ name: NAME, passed: {} });
}

const TEXT_LESSON = worlds.at(-1)?.lessons[0] as Lesson;

/** A child who passed every lesson of the first five worlds: the world of texts is open. */
function childAtTheTexts(): Profile {
	const passed = Object.fromEntries(
		worlds
			.slice(0, -1)
			.flatMap((world) => world.lessons)
			.map((lesson) => [lesson.id, 2 as const])
	);
	return advancedProfile({ name: NAME, passed });
}

function withBackspace(profile: Profile): Profile {
	return updateSettings(profile, { errorPolicy: 'backspace' });
}

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function groupLabel(page: Page): Locator {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

function wrongCells(page: Page): Locator {
	return page.locator('.target-text .cell[data-state="wrong"]');
}

function announcement(page: Page): Locator {
	return page.locator('[data-game-announcement]');
}

function backspaceKey(page: Page): Locator {
	return page.locator('.key[data-code="Backspace"]');
}

function spoken(char: string): string {
	return char === ' ' ? message('ui_target_char_space') : char;
}

async function currentGroup(page: Page): Promise<string> {
	const label = groupLabel(page);
	await expect(label).toHaveText(GROUP_LABEL);
	return GROUP_LABEL.exec((await label.textContent()) ?? '')?.groups?.['text'] ?? '';
}

/** A letter of the keyboard that the group does not hold: a sure mistake. */
function wrongKeyFor(group: string): string {
	return [...'kdslmq'].find((letter) => !group.includes(letter)) ?? '';
}

async function gateNumber(page: Page): Promise<number> {
	const words = (await page.locator('[data-gate-words]').textContent())?.trim();
	const number = gateNumbers.find((entry) => entry.words === words);
	if (!number) throw new Error(`unknown gate number: ${words}`);
	return number.value;
}

/** The map of the child, whether the app opens on the players or straight on the last one. */
async function reachMap(page: Page) {
	await openPage(page, '/jouer');
	const map = heading(page, message('play_map_title'));
	const player = button(page, NAME);
	await expect(map.or(player)).toBeVisible();
	if (await player.isVisible()) await player.click();
	await expect(map).toBeVisible();
}

async function startFirstLesson(page: Page): Promise<string> {
	await page.getByRole('button', { name: FIRST.title }).click();
	await throughStory(page, heading(page, FIRST.title));
	await page.locator('button[data-proposed]').click();
	await expect(page.locator('#game-input')).toBeFocused();
	return currentGroup(page);
}

async function installChild(page: Page, profile: Profile) {
	await openPage(page, '/jouer');
	await installProfile(page, profile);
	await reloadPage(page);
}

// Each test ends on a group done: its reward stays to be looked at.
test.beforeEach(async ({ page }) => {
	await setRewards(page, 'hold');
});

test.describe('Backspace setting', () => {
	test('is turned on by the adult: a wrong letter is written, erased with Backspace, and the group goes on', async ({
		page
	}) => {
		const profile = child();
		await installChild(page, profile);

		await openPage(page, '/adulte');
		await page.locator('[data-gate-answer]').fill(String(await gateNumber(page)));
		await page.keyboard.press('Enter');
		await expect(page.locator('[data-adult-home]')).toBeVisible();
		await button(page, NAME).click();
		await page.locator('[data-child-settings]').focus();
		await page.keyboard.press('Enter');
		await expect(heading(page, message('adult_settings_title', { name: NAME }))).toBeVisible();
		const choice = page.getByRole('group', { name: message('settings_backspace_label') });
		const on = choice.getByRole('radio', { name: message('settings_backspace_on') });
		// Unless the adult chooses, each world says whether a mistake is erased (ADR-075).
		await expect(
			choice.getByRole('radio', { name: message('settings_backspace_world') })
		).toBeChecked();
		await on.focus();
		await page.keyboard.press('Space');
		await expect(on).toBeChecked();
		await expect(page.getByRole('status')).toHaveText(message('settings_saved'));
		await expect
			.poll(async () => (await storedRecord(page, profile))?.['settings'])
			.toMatchObject({ errorPolicy: 'backspace' });

		await reachMap(page);
		// The child does not see it: only the adult chooses.
		await button(page, message('play_settings_open')).click();
		await expect(heading(page, message('settings_title'))).toBeVisible();
		await expect(
			page.getByRole('group', { name: message('settings_backspace_label') })
		).toHaveCount(0);
		await page.keyboard.press('Escape');
		await expect(heading(page, message('play_map_title'))).toBeVisible();

		const group = await startFirstLesson(page);
		const [first = '', ...rest] = toGraphemes(group);
		const wrong = wrongKeyFor(group);

		await page.keyboard.type(wrong);
		await expect(wrongCells(page)).toHaveText([wrong]);
		await expect(page.locator('[data-erase-reminder]')).toHaveText(
			message('game_shared_erase_reminder')
		);
		await expect(announcement(page)).toHaveText(
			message('game_shared_announce_erase', { char: wrong })
		);
		await expect(backspaceKey(page)).toHaveAttribute('data-target', 'true');

		// The right letter now is one more to erase: nothing goes on before the mistake is gone.
		await page.keyboard.type(first);
		await expect(wrongCells(page)).toHaveText([wrong, first]);
		await expect(page.locator('.target-text .cell[data-state="done"]')).toHaveCount(0);

		await page.keyboard.press('Backspace');
		await expect(wrongCells(page)).toHaveText([wrong]);
		await expect(announcement(page)).toHaveText(
			message('game_shared_announce_erase', { char: wrong })
		);
		await page.keyboard.press('Backspace');
		await expect(wrongCells(page)).toHaveCount(0);
		await expect(page.locator('[data-erase-reminder]')).toHaveCount(0);
		await expect(announcement(page)).toHaveText(
			message('game_shared_announce_error', { char: spoken(first) })
		);
		await expect(backspaceKey(page)).not.toHaveAttribute('data-target', 'true');

		await page.keyboard.type([first, ...rest].join(''));
		await expect(groupLabel(page)).toHaveText(GROUP_DONE);
	});

	test('waits by default in the first worlds: Backspace does nothing and a wrong key is not written', async ({
		page
	}) => {
		await installChild(page, child());
		await reachMap(page);
		const group = await startFirstLesson(page);
		const [first = '', ...rest] = toGraphemes(group);

		await page.keyboard.type(wrongKeyFor(group));
		await expect(page.locator('.target-text .cell[data-error]')).toHaveCount(1);
		await expect(wrongCells(page)).toHaveCount(0);
		await expect(page.locator('[data-erase-reminder]')).toHaveCount(0);
		await expect(announcement(page)).toHaveText(
			message('game_shared_announce_error', { char: spoken(first) })
		);

		await page.keyboard.press('Backspace');
		await expect(wrongCells(page)).toHaveCount(0);
		await expect(page.locator('.target-text .cell[data-error]')).toHaveCount(1);
		await expect(backspaceKey(page)).not.toHaveAttribute('data-target', 'true');

		await page.keyboard.type(first);
		await expect(page.locator('.target-text .cell[data-state="done"]')).toHaveCount(1);
		await page.keyboard.type(rest.join(''));
		await expect(groupLabel(page)).toHaveText(GROUP_DONE);
	});

	test('erases by default in the world of texts, which says so before its first play', async ({
		page
	}) => {
		await installChild(page, childAtTheTexts());
		await reachMap(page);
		await page.getByRole('button', { name: TEXT_LESSON.title }).click();
		await throughStory(page, heading(page, TEXT_LESSON.title));
		// Read right above the games, where the screen settles on a laptop.
		const notice = page.locator('[data-erasing-notice]');
		await expect(notice).toHaveText(message('play_intro_erasing'));
		await expect(notice).toBeInViewport({ ratio: 1 });
		await page.locator('button[data-proposed]').click();
		await expect(page.locator('#game-input')).toBeFocused();
		const group = await currentGroup(page);
		const [first = ''] = toGraphemes(group);
		const wrong = wrongKeyFor(group);

		await page.keyboard.type(wrong);
		await expect(wrongCells(page)).toHaveText([wrong]);
		await expect(page.locator('[data-erase-reminder]')).toHaveText(
			message('game_shared_erase_reminder')
		);
		await expect(backspaceKey(page)).toHaveAttribute('data-target', 'true');
		await page.keyboard.press('Backspace');
		await expect(wrongCells(page)).toHaveCount(0);
		await page.keyboard.type(first);
		await expect(page.locator('.target-text .cell[data-state="done"]')).toHaveCount(1);
	});
});

test.describe('Backspace setting, light and dark themes', () => {
	test('has no axe violation on a game with a wrong letter to erase', async ({ page }) => {
		await installChild(page, withBackspace(child()));
		await reachMap(page);
		const group = await startFirstLesson(page);
		await page.keyboard.type(wrongKeyFor(group));
		await expect(wrongCells(page)).toHaveCount(1);
		await expect(page.locator('[data-erase-reminder]')).toBeVisible();

		await expectNoAxeViolation(page);
	});
});
