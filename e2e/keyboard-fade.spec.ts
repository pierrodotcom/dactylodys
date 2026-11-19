import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { toGraphemes } from '../src/lib/engine/graphemes';
import type { ProgressState } from '../src/lib/engine/progression/types';
import { updateSettings, withProgress } from '../src/lib/state/profile';
import type { Profile } from '../src/lib/state/types';
import { CHROMIUM_ONLY } from './engines';
import {
	advancedProfile,
	expectNoAxeViolation,
	installProfile,
	loadMessages,
	openPage,
	passReward,
	readJson,
	reloadPage,
	setRewards,
	storedRecord,
	throughStory
} from './support';

/**
 * The keyboard that fades key by key (ADR-057): a key the child knows well loses its letter on the
 * keyboard drawn in the games, and gets it back for the rest of the game after a mistake on it.
 * Where the hand does not show it, it no longer lights when it is expected either, nor is its
 * finger named; it lights again after a mistake on it, and while the child hesitates (audit P-07).
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
/** « Le nid du tricératops »: the hand shows its new keys, D and K, not F and J. */
const THIRD = worlds[0]?.lessons[2] as Lesson;
const BEFORE_THIRD_LESSONS = worlds[0]?.lessons.slice(0, 2) ?? [];
const gateNumbers = readJson<{ numbers: { value: number; words: string }[] }>(
	'content/fr/adult/gate-numbers.json'
).numbers;

const NAME = 'Sacha';
/** Keys of the first lesson on AZERTY. */
const KEY_OF: Readonly<Record<string, string>> = { f: 'KeyF', j: 'KeyJ' };
const FINGER_OF: Readonly<Record<string, string>> = {
	f: message('ui_finger_left_index'),
	j: message('ui_finger_right_index')
};
/** What the child knows before the third lesson: its keys and those of the first two. */
const BEFORE_THIRD = ['f', 'j', ' ', 'd', 'k'];
/** Time of a slow child on each key: the hand waits twice as long, more than any test lasts. */
const SLOW_KEY_MS = 30_000;
/** A key the lessons never ask: a mistake. */
const WRONG = 'x';

/**
 * A child who typed these characters often and without a mistake lately, taking `latencyMs`
 * before each (`null`: not measured, the hand waits its shortest time), and passed these lessons.
 */
function child(
	known: readonly string[],
	latencyMs: number | null = null,
	passed: readonly Lesson[] = []
): Profile {
	const sample = { attempts: 30, errors: 0, latencyMs };
	const profile = advancedProfile({
		name: NAME,
		passed: Object.fromEntries(passed.map((lesson) => [lesson.id, 3 as const]))
	});
	const progress: ProgressState = {
		lessons: profile.progress.lessons,
		chars: Object.fromEntries(
			known.map((char) => [char, { attempts: 30, errors: 0, recent: [sample] }])
		)
	};
	return withProgress(profile, progress);
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

async function startLesson(page: Page, lesson: Lesson): Promise<string> {
	await page.getByRole('button', { name: lesson.title }).click();
	await throughStory(page, heading(page, lesson.title));
	await page.locator('button[data-proposed]').click();
	await expect(page.locator('#game-input')).toBeFocused();
	return currentGroup(page);
}

async function startFirstLesson(page: Page): Promise<string> {
	return startLesson(page, FIRST);
}

function fingerHint(page: Page): Locator {
	return page.locator('.text-zone .finger-hint');
}

function hintOf(char: string): string {
	return message('ui_finger_hint', { key: char.toUpperCase(), finger: FINGER_OF[char] ?? '' });
}

function typedCells(page: Page): Locator {
	return page.locator('.target-text').first().locator('.cell[data-state="done"]');
}

/**
 * Types the text right, from group to group, up to the first character `wanted` accepts, and
 * gives it: it is the character expected now. The rewards must be `instant`.
 */
async function typeUpTo(page: Page, wanted: (char: string) => boolean): Promise<string> {
	for (;;) {
		const chars = toGraphemes(await currentGroup(page));
		const typed = await typedCells(page).count();
		const at = chars.findIndex((char, index) => index >= typed && wanted(char));
		if (at >= 0) {
			await page.keyboard.type(chars.slice(typed, at).join(''));
			return chars[at] ?? '';
		}
		await page.keyboard.type(chars.slice(typed).join(''));
		// The next group comes at once: nothing of it is typed yet.
		await expect(typedCells(page)).toHaveCount(0);
	}
}

const isKnownKey = (char: string) => Object.hasOwn(KEY_OF, char);

async function installChild(page: Page, profile: Profile) {
	await openPage(page, '/jouer');
	await installProfile(page, profile);
	await reloadPage(page);
}

// A group done is looked at before the next one: the rewards stay until a key passes them.
test.beforeEach(async ({ page }) => {
	await setRewards(page, 'hold');
});

// What the keyboard drawn shows is decided by the game, whatever the engine (`keyboard-fade.test.ts`).
test.describe('Keyboard that fades', CHROMIUM_ONLY, () => {
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
			await passReward(page);
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

// The keys typed and judged: every engine (rule 11 of `.claude/rules/tests.md`).
test.describe('Keyboard that fades, the key to type', () => {
	test('leaves dark a key the child knows well, lights it after a mistake until the end of the game', async ({
		page
	}) => {
		// Played from group to group without a reward to pass: the next one comes at once.
		await setRewards(page, 'instant');
		// A slow child: the hand waits longer than the test, the key never lights for a hesitation.
		await installChild(page, child(BEFORE_THIRD, SLOW_KEY_MS, BEFORE_THIRD_LESSONS));
		await reachMap(page);
		await startLesson(page, THIRD);

		const known = await typeUpTo(page, isKnownKey);
		const code = KEY_OF[known] ?? '';
		await expect(key(page, code)).toHaveAttribute('data-faded', 'true');
		await expect(page.locator('.keyboard .key[data-target]')).toHaveCount(0);
		await expect(fingerHint(page)).toHaveCount(0);

		await page.keyboard.type(WRONG);
		await expect(key(page, code)).toHaveAttribute('data-target', 'true');
		await expect(fingerHint(page)).toHaveText(hintOf(known));

		await page.keyboard.type(known);
		// The next key the child knows well: the one missed lights at once, the other stays dark.
		const next = await typeUpTo(page, isKnownKey);
		await expect(page.locator('.keyboard .key[data-target]')).toHaveCount(next === known ? 1 : 0);
		await expect(fingerHint(page)).toHaveCount(next === known ? 1 : 0);
	});

	// The wait itself is the logic of the game, the same whatever the engine.
	test(
		'lights a key the child knows well again while the child waits on it',
		CHROMIUM_ONLY,
		async ({ page }) => {
			await setRewards(page, 'instant');
			// Never timed: the hand waits its shortest time.
			await installChild(page, child(BEFORE_THIRD, null, BEFORE_THIRD_LESSONS));
			await reachMap(page);
			await startLesson(page, THIRD);

			const known = await typeUpTo(page, isKnownKey);
			const target = key(page, KEY_OF[known] ?? '');
			await expect(target).not.toHaveAttribute('data-target', 'true');
			await expect(target).toHaveAttribute('data-target', 'true');
			await expect(fingerHint(page)).toHaveText(hintOf(known));
		}
	);
});

test.describe('Keyboard that fades, light and dark themes', () => {
	test('has no axe violation on a game with faded keys', async ({ page }) => {
		await installChild(page, child(['f', 'j']));
		await reachMap(page);
		await startFirstLesson(page);
		await expect(label(page, 'KeyF')).toBeHidden();
		await expect(label(page, 'KeyJ')).toBeHidden();

		await expectNoAxeViolation(page);
	});
});
