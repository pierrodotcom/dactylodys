import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { toGraphemes } from '../src/lib/engine/graphemes';
import type { ProgressState } from '../src/lib/engine/progression/types';
import { updateSettings, withProgress } from '../src/lib/state/profile';
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
 * The keyboard that fades key by key (ADR-057): a key the child knows well loses its letter on the
 * keyboard drawn in the games, and gets it back for the rest of the game after a mistake on it.
 */

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;

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

const NAME = 'Sacha';
/** Keys of the first lesson on AZERTY. */
const KEY_OF: Readonly<Record<string, string>> = { f: 'KeyF', j: 'KeyJ' };

/** A child who typed these characters often and without a mistake lately. */
function child(known: readonly string[]): Profile {
	const sample = { attempts: 30, errors: 0, latencyMs: null };
	const progress: ProgressState = {
		lessons: {},
		chars: Object.fromEntries(
			known.map((char) => [char, { attempts: 30, errors: 0, recent: [sample] }])
		)
	};
	return withProgress(advancedProfile({ name: NAME, passed: {} }), progress);
}

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function key(page: Page, code: string): Locator {
	return page.locator(`.keyboard .key[data-code="${code}"]`);
}

function label(page: Page, code: string): Locator {
	return key(page, code).locator('.label');
}

function groupLabel(page: Page): Locator {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

async function currentGroup(page: Page): Promise<string> {
	const text = groupLabel(page);
	await expect(text).toHaveText(GROUP_LABEL);
	return GROUP_LABEL.exec((await text.textContent()) ?? '')?.groups?.['text'] ?? '';
}

async function gateNumber(page: Page): Promise<number> {
	const words = (await page.locator('[data-gate-words]').textContent())?.trim();
	const number = gateNumbers.find((entry) => entry.words === words);
	if (!number) throw new Error(`unknown gate number: ${words}`);
	return number.value;
}

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

test.beforeEach(async ({ page }) => {
	await shortenRewards(page);
});

test.describe('Keyboard that fades', () => {
	test('hides the letter of a key the child knows well and keeps the others written', async ({
		page
	}) => {
		await installChild(page, child(['f']));
		await reachMap(page);
		await startFirstLesson(page);

		await expect(key(page, 'KeyF')).toHaveAttribute('data-faded', 'true');
		await expect(label(page, 'KeyF')).toBeHidden();
		// The key itself, its home mark and its colour stay: only the letter goes.
		await expect(key(page, 'KeyF')).toBeVisible();
		await expect(key(page, 'KeyF').locator('.home-mark')).toBeVisible();
		await expect(key(page, 'KeyF')).toHaveAttribute('data-finger', 'left-index');

		for (const code of ['KeyJ', 'KeyD', 'Space', 'ShiftLeft']) {
			await expect(key(page, code)).not.toHaveAttribute('data-faded', 'true');
		}
		await expect(label(page, 'KeyJ')).toBeVisible();
		await expect(label(page, 'KeyD')).toBeVisible();
	});

	for (const policy of ['retry', 'backspace'] as const) {
		test(`writes the letter again after a mistake on the key, until the end of the game (${policy})`, async ({
			page
		}) => {
			await installChild(page, updateSettings(child(['f', 'j']), { errorPolicy: policy }));
			await reachMap(page);
			const group = await startFirstLesson(page);
			const [first = '', ...rest] = toGraphemes(group);
			const missed = KEY_OF[first] ?? '';
			const other = missed === 'KeyF' ? 'KeyJ' : 'KeyF';
			await expect(label(page, missed)).toBeHidden();
			await expect(label(page, other)).toBeHidden();

			await page.keyboard.type('k');
			await expect(key(page, missed)).not.toHaveAttribute('data-faded', 'true');
			await expect(label(page, missed)).toBeVisible();
			await expect(key(page, other)).toHaveAttribute('data-faded', 'true');

			if (policy === 'backspace') await page.keyboard.press('Backspace');
			await page.keyboard.type([first, ...rest].join(''));
			await expect(groupLabel(page)).toHaveText(GROUP_DONE);
			// The next group keeps the letter written.
			await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
			await expect(label(page, missed)).toBeVisible();
			await expect(label(page, other)).toBeHidden();
		});
	}

	test('is turned off by the adult: every letter stays written', async ({ page }) => {
		const profile = child(['f', 'j']);
		await installChild(page, profile);

		await openPage(page, '/adulte');
		await page.locator('[data-gate-answer]').fill(String(await gateNumber(page)));
		await page.keyboard.press('Enter');
		await expect(page.locator('[data-adult-home]')).toBeVisible();
		await button(page, NAME).click();
		await page.locator('[data-child-settings]').focus();
		await page.keyboard.press('Enter');
		await expect(heading(page, message('adult_settings_title', { name: NAME }))).toBeVisible();
		const choice = page.getByRole('group', { name: message('settings_keyboard_fade_label') });
		await expect(
			choice.getByRole('radio', { name: message('settings_keyboard_fade_on') })
		).toBeChecked();
		const off = choice.getByRole('radio', { name: message('settings_keyboard_fade_off') });
		await off.focus();
		await page.keyboard.press('Space');
		await expect(off).toBeChecked();
		await expect(page.getByRole('status')).toHaveText(message('settings_saved'));
		await expect
			.poll(async () => (await storedRecord(page, profile))?.['settings'])
			.toMatchObject({ keyboardFade: false });

		await reachMap(page);
		// The child does not see it: only the adult chooses.
		await button(page, message('play_settings_open')).click();
		await expect(heading(page, message('settings_title'))).toBeVisible();
		await expect(
			page.getByRole('group', { name: message('settings_keyboard_fade_label') })
		).toHaveCount(0);
		await page.keyboard.press('Escape');
		await expect(heading(page, message('play_map_title'))).toBeVisible();

		await startFirstLesson(page);
		await expect(page.locator('.keyboard .key[data-faded]')).toHaveCount(0);
		await expect(label(page, 'KeyF')).toBeVisible();
		await expect(label(page, 'KeyJ')).toBeVisible();
	});
});

for (const colorScheme of COLOR_SCHEMES) {
	test.describe(`Keyboard that fades, ${colorScheme} theme`, () => {
		test.use({ colorScheme });

		test('has no axe violation on a game with faded keys', async ({ page }) => {
			await installChild(page, child(['f', 'j']));
			await reachMap(page);
			await startFirstLesson(page);
			await expect(label(page, 'KeyF')).toBeHidden();
			await expect(label(page, 'KeyJ')).toBeHidden();

			await page.evaluate(() => document.fonts.ready);
			const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
			expect(results.violations).toEqual([]);
		});
	});
}
