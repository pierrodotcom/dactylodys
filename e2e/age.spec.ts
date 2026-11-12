import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { parseTextBank, parseWordBank, textOf } from '../src/lib/engine/progression/banks';
import type { ProgressState, StarCount } from '../src/lib/engine/progression/types';
import { readProfile } from '../src/lib/state/migrations';
import { markCalibrated, withProgress } from '../src/lib/state/profile';
import type { Profile } from '../src/lib/state/types';
import {
	advancedProfile,
	installProfile,
	loadMessages,
	openPage,
	readJson,
	reloadPage,
	shortenRewards,
	storedRecord,
	throughStory
} from './support';

/**
 * Content by age group (ADR-057, proposal 15): the child says how old they are when the player is
 * created, and only the words, phrases and texts of their age group are offered.
 */

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const LINE_BREAK = String.fromCharCode(10);
const PASSED_STARS: StarCount = 2;
const STEP_TIMEOUT = 15_000;
const LAST_PLAYER_KEY = 'dactylodys.last-player';

interface Lesson {
	id: string;
	title: string;
}
interface World {
	lessons: Lesson[];
}

const { message, templateRegex } = loadMessages();
const GROUP_LABEL = templateRegex('ui_target_text_label');
const worlds = readJson<{ worlds: World[] }>(
	'content/fr/progression/azerty-decouverte.json'
).worlds;
const texts = parseTextBank(readJson('content/fr/texts/base.json'));
const words = parseWordBank(readJson('content/fr/words/base.json'));
const gateNumbers = readJson<{ numbers: { value: number; words: string }[] }>(
	'content/fr/adult/gate-numbers.json'
).numbers;

/** A text meant for the 8-9 year olds only, and the lesson it ends. */
const YOUNG_TEXT = texts.texts.find((entry) => entry.ages?.join() === '8-9');
const TEXT_LESSON = worlds
	.flatMap((world) => world.lessons)
	.find((lesson) => lesson.id === YOUNG_TEXT?.lessonId);
/** The first text of that lesson for the 10-12 year olds: what their first play ends with. */
const OLDER_TEXT = texts.texts.find(
	(entry) => entry.lessonId === YOUNG_TEXT?.lessonId && (entry.ages ?? ['10-12']).includes('10-12')
);
const YOUNG_WORDS = new Set(
	words.words.filter((word) => word.ages?.join() === '8-9').map((word) => word.text)
);

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function ageChoice(page: Page): Locator {
	return page.getByRole('group', { name: message('play_new_age_legend') });
}

function groupLabel(page: Page): Locator {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

async function openNewPlayer(page: Page) {
	await openPage(page, '/jouer');
	await button(page, message('play_new_player')).click();
	await expect(heading(page, message('play_new_title'))).toBeVisible();
}

/** Answers "You are…" with this label, with the keyboard. */
async function answerAge(page: Page, answer: string) {
	const choice = ageChoice(page).getByRole('radio', { name: answer });
	await choice.focus();
	await page.keyboard.press('Space');
	await expect(choice).toBeChecked();
}

/**
 * Creates a player through the screen, with the keyboard only, answering "You are…" with these
 * labels in turn (none: the question is left as it is).
 */
async function createPlayer(page: Page, name: string, ...answers: string[]): Promise<Profile> {
	await openNewPlayer(page);
	await page.getByLabel(message('play_new_label')).fill(name);
	for (const answer of answers) await answerAge(page, answer);
	await page.getByLabel(message('play_new_label')).focus();
	// From the nickname, Tab reaches the answer given, then the button.
	await page.keyboard.press('Tab');
	await expect(ageChoice(page).getByRole('radio', { checked: true })).toBeFocused();
	await page.keyboard.press('Tab');
	await expect(button(page, message('play_new_submit'))).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(heading(page, message('play_check_title'))).toBeVisible();
	const id = await page.evaluate((key) => localStorage.getItem(key), LAST_PLAYER_KEY);
	if (id === null) throw new Error('The new player was not remembered');
	const record = await storedRecord(page, { ...advancedProfile({ name, passed: {} }), id });
	const reading = readProfile(record);
	if (!reading.ok) throw new Error('The new player cannot be opened');
	return reading.profile;
}

async function gateNumber(page: Page): Promise<number> {
	const said = (await page.locator('[data-gate-words]').textContent())?.trim();
	const number = gateNumbers.find((entry) => entry.words === said);
	if (!number) throw new Error(`unknown gate number: ${said}`);
	return number.value;
}

/** Plays a lesson up to its result and gives what was typed, Enter included. */
async function typeToResult(page: Page): Promise<string> {
	const result = button(page, message('play_result_map'));
	const typed: string[] = [];
	for (;;) {
		await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
		const group = GROUP_LABEL.exec((await groupLabel(page).textContent()) ?? '')?.groups?.['text'];
		if (group === undefined) throw new Error('No group to type');
		for (const line of group.split(LINE_BREAK).entries()) {
			if (line[0] > 0) await page.keyboard.press('Enter');
			await page.keyboard.type(line[1]);
		}
		typed.push(group);
		await expect(async () => {
			const ended = await result.isVisible();
			const label = (await groupLabel(page).allTextContents()).join('');
			const moved = GROUP_LABEL.test(label) && GROUP_LABEL.exec(label)?.groups?.['text'] !== group;
			expect(ended || moved).toBe(true);
		}).toPass({ timeout: STEP_TIMEOUT });
		if (await result.isVisible()) return typed.join('');
	}
}

test.beforeEach(async ({ page }) => {
	await shortenRewards(page);
});

test.describe('Content by age group', () => {
	test('creates a 10-12 player, whose lesson leaves out the text and words of the 8-9 year olds', async ({
		page
	}) => {
		test.slow();
		expect(YOUNG_TEXT).toBeDefined();
		expect(OLDER_TEXT).toBeDefined();
		expect(TEXT_LESSON).toBeDefined();
		if (!YOUNG_TEXT || !OLDER_TEXT || !TEXT_LESSON) return;
		const created = await createPlayer(page, 'Noa', message('play_new_age_10_12'));
		expect(created.settings.ageBand).toBe('10-12');

		// The child has gone through the first worlds: the lesson of the young text is open.
		const lessons = worlds.flatMap((world) => world.lessons);
		const before = lessons.slice(0, lessons.indexOf(TEXT_LESSON));
		const progress: ProgressState = {
			lessons: Object.fromEntries(
				before.map((lesson) => [
					lesson.id,
					{ bestAccuracy: 100, stars: PASSED_STARS, attempts: 1, lastPlayedAt: Date.now() }
				])
			),
			chars: {}
		};
		await installProfile(page, withProgress(markCalibrated(created), progress));
		await reloadPage(page);
		const map = heading(page, message('play_map_title'));
		const player = button(page, created.name);
		await expect(map.or(player)).toBeVisible();
		if (await player.isVisible()) await player.click();
		await expect(map).toBeVisible();

		await page.getByRole('button', { name: TEXT_LESSON.title }).click();
		await throughStory(page, heading(page, TEXT_LESSON.title));
		await page.locator('button[data-proposed]').click();
		await expect(page.locator('#game-input')).toBeFocused();
		const typed = await typeToResult(page);

		expect(typed.endsWith(textOf(OLDER_TEXT))).toBe(true);
		for (const line of YOUNG_TEXT.lines) expect(typed).not.toContain(line);
		const tokens = typed.split(/[\s.,;:!?"'-]+/u).map((token) => token.toLowerCase());
		expect(tokens.filter((token) => YOUNG_WORDS.has(token))).toEqual([]);
	});

	test('keeps the words of the 8-9 year olds when the child does not know', async ({ page }) => {
		await openNewPlayer(page);
		// Nothing chosen yet: "I don't know" is the answer already given.
		await expect(
			ageChoice(page).getByRole('radio', { name: message('play_new_age_unknown') })
		).toBeChecked();
		const created = await createPlayer(page, 'Lou');
		expect(created.settings.ageBand).toBe('8-9');
	});

	test('keeps the words of the 8-9 year olds when the child changes their mind for "I do not know"', async ({
		page
	}) => {
		const answers = [message('play_new_age_10_12'), message('play_new_age_unknown')];
		const created = await createPlayer(page, 'Lou', ...answers);
		expect(created.settings.ageBand).toBe('8-9');
	});

	test('lets the child change their age group in their settings', async ({ page }) => {
		const created = await createPlayer(page, 'Eli', message('play_new_age_8_9'));
		expect(created.settings.ageBand).toBe('8-9');
		await installProfile(page, markCalibrated(created));
		await reloadPage(page);
		const map = heading(page, message('play_map_title'));
		const player = button(page, created.name);
		await expect(map.or(player)).toBeVisible();
		if (await player.isVisible()) await player.click();
		await button(page, message('play_settings_open')).click();
		await expect(heading(page, message('settings_title'))).toBeVisible();

		const choice = page.getByRole('group', { name: message('settings_age_label') });
		const older = choice.getByRole('radio', { name: message('settings_age_10_12') });
		await older.focus();
		await page.keyboard.press('Space');
		await expect(older).toBeChecked();
		// The explanation is for the adult: the child only sees the choice.
		await expect(page.getByText(message('settings_age_hint'))).toHaveCount(0);
		await expect
			.poll(async () => (await storedRecord(page, created))?.['settings'])
			.toMatchObject({ ageBand: '10-12' });
	});

	test('is changed by the adult in the settings of the child, with a word of explanation', async ({
		page
	}) => {
		const child = advancedProfile({ name: 'Sami', passed: {} });
		await openPage(page, '/jouer');
		await installProfile(page, child);
		await openPage(page, '/adulte');
		await page.locator('[data-gate-answer]').fill(String(await gateNumber(page)));
		await page.keyboard.press('Enter');
		await expect(page.locator('[data-adult-home]')).toBeVisible();
		await button(page, child.name).click();
		await page.locator('[data-child-settings]').focus();
		await page.keyboard.press('Enter');
		await expect(
			heading(page, message('adult_settings_title', { name: child.name }))
		).toBeVisible();

		const choice = page.getByRole('group', { name: message('settings_age_label') });
		await expect(choice.getByRole('radio', { name: message('settings_age_8_9') })).toBeChecked();
		await expect(page.getByText(message('settings_age_hint'))).toBeVisible();
		const older = choice.getByRole('radio', { name: message('settings_age_10_12') });
		await older.focus();
		await page.keyboard.press('Space');
		await expect(older).toBeChecked();
		await expect(page.getByRole('status')).toHaveText(message('settings_saved'));
		await expect
			.poll(async () => (await storedRecord(page, child))?.['settings'])
			.toMatchObject({ ageBand: '10-12' });
	});

	test('keeps the whole new player screen in view on a laptop', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 720 });
		await openNewPlayer(page);
		await expect(ageChoice(page)).toBeInViewport();
		await expect(button(page, message('play_new_submit'))).toBeInViewport({ ratio: 1 });
	});

	for (const colorScheme of ['light', 'dark'] as const) {
		test(`has no axe violation on the new player screen with its age question (${colorScheme})`, async ({
			page
		}) => {
			await page.emulateMedia({ colorScheme });
			await openNewPlayer(page);
			const older = ageChoice(page).getByRole('radio', { name: message('play_new_age_10_12') });
			await older.focus();
			await page.keyboard.press('Space');
			await expect(older).toBeChecked();
			const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
			expect(results.violations).toEqual([]);
		});
	}
});
