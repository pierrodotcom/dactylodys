import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { exportBackup } from '../src/lib/state/backup';
import { MAX_NAME_LENGTH } from '../src/lib/state/profile';
import { STORAGE_ASKED_KEY } from '../src/lib/state/storage-persistence';
import type { Profile } from '../src/lib/state/types';
import { LAST_PLAYER_KEY } from '../src/routes/jouer/last-player';
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

/*
 * The data of the child are not lost: two tabs do not write over each other, the browser is asked
 * to keep the storage, the adult renames and deletes a profile, and a failure never leaves the
 * child on a frozen screen.
 */

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;
const NARROW = { width: 320, height: 640 } as const;
const STEP_TIMEOUT = 15_000;
/** The report of a child is a long page: its last rubric is far from its title for the Tab key. */
const TAB_BUDGET = 300;
/** The widest nickname the rules accept: no space to cut it at. */
const LONG_NAME = 'W'.repeat(MAX_NAME_LENGTH);

interface Lesson {
	id: string;
	title: string;
}

const { message, templateRegex } = loadMessages();
const APP_NAME = message('app_name');
const worlds = readJson<{ worlds: { lessons: Lesson[] }[] }>(
	'content/fr/progression/azerty-decouverte.json'
).worlds;
const [FIRST, SECOND] = (worlds[0]?.lessons ?? []) as [Lesson, Lesson];
const gateNumbers = readJson<{ numbers: { value: number; words: string }[] }>(
	'content/fr/adult/gate-numbers.json'
).numbers;
const GROUP_LABEL = templateRegex('ui_target_text_label');

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function groupLabel(page: Page): Locator {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

function newChild(name = 'Lou'): Profile {
	return advancedProfile({ name, passed: {} });
}

async function reachPlayers(page: Page, profiles: readonly Profile[]) {
	await openPage(page, '/jouer');
	for (const profile of profiles) await installProfile(page, profile);
	await reloadPage(page);
	await expect(heading(page, message('play_players_title'))).toBeVisible();
}

async function reachMap(page: Page, profile: Profile, others: readonly Profile[] = []) {
	await reachPlayers(page, [profile, ...others]);
	await button(page, profile.name).click();
	await expect(heading(page, message('play_map_title'))).toBeVisible();
}

/** After a reload: the last player is opened again, or asked for on the player screen. */
async function backOnMap(page: Page, profile: Profile) {
	const map = heading(page, message('play_map_title'));
	const player = button(page, profile.name);
	await expect(map.or(player)).toBeVisible();
	if (await player.isVisible()) await player.click();
	await expect(map).toBeVisible();
}

async function passGate(page: Page) {
	await expect(heading(page, message('adult_title'))).toBeVisible();
	const words = (await page.locator('[data-gate-words]').textContent())?.trim();
	const asked = gateNumbers.find((entry) => entry.words === words);
	if (!asked) throw new Error(`unknown gate number: ${words}`);
	await page.locator('[data-gate-answer]').focus();
	await page.keyboard.type(String(asked.value));
	await page.keyboard.press('Enter');
	await expect(page.locator('[data-adult-home]')).toBeVisible();
}

/** The adult space, opened in a page of its own. */
async function openAdultHome(page: Page) {
	await openPage(page, '/adulte');
	await passGate(page);
}

async function openReport(page: Page, profile: Profile) {
	await button(page, profile.name).click();
	await expect(heading(page, message('adult_child_title', { name: profile.name }))).toBeVisible();
}

async function startLesson(page: Page, lesson: Lesson) {
	await page.getByRole('button', { name: lesson.title }).click();
	await throughStory(page, heading(page, lesson.title));
	await page.locator('button[data-proposed]').click();
	await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
}

async function currentGroup(page: Page): Promise<string> {
	const label = groupLabel(page);
	await expect(label).toHaveText(GROUP_LABEL);
	return GROUP_LABEL.exec((await label.textContent()) ?? '')?.groups?.['text'] ?? '';
}

/** Types every group, from the one on screen, until the result. */
async function typeToResult(page: Page) {
	const finale = button(page, message('game_shared_finale_continue'));
	const toMap = button(page, message('play_result_map'));
	for (;;) {
		await page.keyboard.type(await currentGroup(page));
		let over = false;
		await expect(async () => {
			over = (await toMap.isVisible()) || (await finale.isVisible());
			const group = (await groupLabel(page).allTextContents()).some((text) =>
				GROUP_LABEL.test(text)
			);
			expect(over || group).toBe(true);
		}).toPass({ timeout: STEP_TIMEOUT });
		if (over) break;
	}
	if (await finale.isVisible()) await finale.click();
	await expect(toMap).toBeVisible();
}

async function resultToMap(page: Page) {
	await button(page, message('play_result_map')).click();
	await throughStory(page, heading(page, message('play_map_title')));
}

/** What the device holds of the profile, read when `ready` says it holds what is waited for. */
async function storedOnce(
	page: Page,
	profile: Profile,
	ready: (record: Record<string, unknown> | undefined) => boolean
): Promise<Profile> {
	await expect.poll(async () => ready(await storedRecord(page, profile))).toBe(true);
	return (await storedRecord(page, profile)) as unknown as Profile;
}

function countOf(record: Record<string, unknown> | undefined, list: string): number {
	const items = record?.[list];
	return Array.isArray(items) ? items.length : -1;
}

function playerInTopBar(page: Page): Locator {
	return page.locator('.top-bar .player');
}

/** The elements that stick out of the page on the right, for a failure that says where. */
async function sticksOut(page: Page): Promise<string[]> {
	await page.evaluate(() => document.fonts.ready);
	return page.evaluate(() => {
		const width = document.documentElement.clientWidth;
		if (document.documentElement.scrollWidth <= width) return [];
		return [...document.querySelectorAll('body *')]
			.filter((element) => element.getBoundingClientRect().right > width + 1)
			.slice(0, 5)
			.map((element) => `${element.tagName.toLowerCase()}.${element.getAttribute('class')}`);
	});
}

async function focusByTab(page: Page, target: Locator) {
	for (let press = 0; press < TAB_BUDGET; press++) {
		if (await target.evaluate((node) => node === document.activeElement)) return;
		await page.keyboard.press('Tab');
	}
	throw new Error('The element cannot be reached with the Tab key');
}

/**
 * A browser that says whether it keeps the data, and counts how many times it was asked to:
 * what a real one answers depends on the machine of the test.
 */
async function stubStorage(page: Page, answer: { persisted: boolean; grants: boolean }) {
	await page.addInitScript((given) => {
		const state = { asked: 0, persisted: given.persisted };
		Object.defineProperty(window, 'persistRequests', { get: () => state.asked });
		Object.defineProperty(navigator, 'storage', {
			configurable: true,
			value: {
				persisted: () => Promise.resolve(state.persisted),
				persist: () => {
					state.asked += 1;
					state.persisted = state.persisted || given.grants;
					return Promise.resolve(state.persisted);
				}
			}
		});
	}, answer);
}

function persistRequests(page: Page): Promise<number> {
	return page.evaluate(() => (window as unknown as { persistRequests: number }).persistRequests);
}

test.beforeEach(async ({ page }) => {
	await shortenRewards(page);
});

test.describe('the game and the adult space open in two tabs', () => {
	test('keep the lesson played in one and what the adult entered in the other', async ({
		page,
		context
	}) => {
		test.slow();
		const child = newChild();
		await reachMap(page, child);

		// The adult space opens before the lesson, in a tab that hears nothing from the other one:
		// the profile it read is the one from before the lesson.
		const adult = await context.newPage();
		await adult.addInitScript(() => Reflect.deleteProperty(window, 'BroadcastChannel'));
		await openAdultHome(adult);
		await openReport(adult, child);

		await startLesson(page, FIRST);
		await typeToResult(page);
		await storedOnce(page, child, (record) => countOf(record, 'sessions') === 1);

		await adult.locator('[data-measure-words]').focus();
		await adult.keyboard.type('14');
		await adult.keyboard.press('Enter');
		await expect(adult.locator('[data-child-target]').getByRole('status')).toHaveText(
			message('adult_measure_saved')
		);

		const afterAdult = await storedOnce(
			page,
			child,
			(record) => countOf(record, 'handwritingSamples') === 1
		);
		expect(Object.keys(afterAdult.progress.lessons)).toEqual([FIRST.id]);
		expect(afterAdult.sessions).toHaveLength(1);
		expect(afterAdult.sessions[0]?.lessonId).toBe(FIRST.id);

		// The next change of the game, made from its own copy, keeps what the adult entered.
		await resultToMap(page);
		await button(page, message('play_settings_open')).click();
		await page
			.getByRole('group', { name: message('settings_theme_label') })
			.getByRole('radio', { name: message('settings_theme_dark') })
			.check();
		await expect(page.getByText(message('settings_saved'))).toBeVisible();

		const afterGame = await storedOnce(
			page,
			child,
			(record) => (record?.['settings'] as { theme?: string } | undefined)?.theme === 'dark'
		);
		expect(afterGame.handwritingSamples).toMatchObject([{ wordsPerMinute: 14 }]);
		expect(Object.keys(afterGame.progress.lessons)).toEqual([FIRST.id]);
		expect(afterGame.sessions).toHaveLength(1);
	});

	test('show in the game, without reloading, the nickname the adult changed', async ({
		page,
		context
	}) => {
		const child = newChild();
		await reachMap(page, child);
		await expect(playerInTopBar(page)).toHaveText(child.name);

		const adult = await context.newPage();
		await openAdultHome(adult);
		await openReport(adult, child);
		await adult.locator('[data-child-name]').fill('Zoé');
		await adult.locator('[data-child-rename]').click();
		await expect(adult.locator('[data-child-identity]').getByRole('status')).toHaveText(
			message('adult_rename_done', { name: 'Zoé' })
		);

		await expect(playerInTopBar(page)).toHaveText('Zoé');
		await expect(heading(page, message('play_map_title'))).toBeVisible();
	});

	test('show in the adult space, without reloading, the lesson played meanwhile', async ({
		page,
		context
	}) => {
		test.slow();
		const child = newChild();
		await reachMap(page, child);
		const adult = await context.newPage();
		await openAdultHome(adult);
		await openReport(adult, child);
		await expect(adult.locator('[data-evolution-empty]')).toBeVisible();

		await startLesson(page, FIRST);
		await typeToResult(page);

		await expect(adult.locator('[data-evolution-empty]')).toHaveCount(0);
	});

	test('send the game back to the players when the adult deletes the player on screen', async ({
		page,
		context
	}) => {
		const child = newChild();
		const other = newChild('Ali');
		await reachMap(page, child, [other]);
		await page.getByRole('button', { name: FIRST.title }).click();
		await throughStory(page, heading(page, FIRST.title));

		const adult = await context.newPage();
		await openAdultHome(adult);
		await openReport(adult, child);
		await adult.locator('[data-child-delete]').click();
		await adult.locator('[data-child-delete-confirm]').click();
		await expect(adult.locator('[data-children-status]')).toHaveText(
			message('adult_delete_done', { name: child.name })
		);

		await expect(heading(page, message('play_players_title'))).toBeVisible();
		await expect(button(page, child.name)).toHaveCount(0);
		await expect(button(page, other.name)).toBeVisible();
		expect(await storedRecord(page, child)).toBeUndefined();
	});
});

test.describe('renaming a player in the adult space', () => {
	test('keeps the new nickname with the rules of a new player, by the keyboard alone', async ({
		page
	}) => {
		const child = advancedProfile({ name: 'Lou', passed: { [FIRST.id]: 2 } });
		await reachPlayers(page, [child]);
		await openAdultHome(page);
		await openReport(page, child);
		const identity = page.locator('[data-child-identity]');
		const input = identity.locator('[data-child-name]');
		await expect(input).toHaveValue(child.name);
		await expect(input).toHaveAttribute('maxlength', String(MAX_NAME_LENGTH));

		await focusByTab(page, input);
		await page.keyboard.press('ControlOrMeta+a');
		await page.keyboard.press('Delete');
		await page.keyboard.press('Enter');
		await expect(identity.getByRole('alert')).toHaveText(message('adult_rename_error_empty'));
		await expect(input).toHaveAttribute('aria-invalid', 'true');

		// The field stops at the longest nickname: one letter too many is not written.
		await page.keyboard.type('a'.repeat(MAX_NAME_LENGTH + 1));
		await expect(input).toHaveValue('a'.repeat(MAX_NAME_LENGTH));
		expect((await storedRecord(page, child))?.['name']).toBe(child.name);

		await page.keyboard.press('ControlOrMeta+a');
		await page.keyboard.type('  Ali  ');
		await page.keyboard.press('Enter');
		await expect(identity.getByRole('status')).toHaveText(
			message('adult_rename_done', { name: 'Ali' })
		);
		await expect(identity.getByRole('alert')).toHaveText('');
		await expect(input).toHaveValue('Ali');
		await expect(heading(page, message('adult_child_title', { name: 'Ali' }))).toBeVisible();

		const stored = await storedOnce(page, child, (record) => record?.['name'] === 'Ali');
		expect(stored.progress).toEqual(child.progress);

		await page.keyboard.press('Escape');
		await expect(button(page, 'Ali')).toBeVisible();
		await button(page, message('adult_back_to_players')).click();
		await expect(heading(page, message('play_players_title'))).toBeVisible();
		await expect(button(page, 'Ali')).toBeVisible();
		await expect(button(page, child.name)).toHaveCount(0);
	});
});

test.describe('deleting a player in the adult space', () => {
	const lou = advancedProfile({ name: 'Lou', passed: { [FIRST.id]: 2 } });
	const ali = newChild('Ali');

	async function openRemoval(page: Page, profile: Profile) {
		await openReport(page, profile);
		await page.locator('[data-child-delete]').click();
		await expect(
			heading(page, message('adult_delete_title', { name: profile.name }))
		).toBeVisible();
	}

	test('is never offered to the child: nothing on the screens of the game deletes a player', async ({
		page
	}) => {
		await reachMap(page, lou);
		await expect(page.locator('[data-child-delete], [data-child-delete-confirm]')).toHaveCount(0);
		await button(page, message('play_change_player')).click();
		await expect(heading(page, message('play_players_title'))).toBeVisible();
		await expect(page.locator('[data-child-delete], [data-child-delete-confirm]')).toHaveCount(0);
	});

	test('names the player, says it is final, and changes nothing when the adult cancels', async ({
		page
	}) => {
		await reachPlayers(page, [lou, ali]);
		await openAdultHome(page);
		await openRemoval(page, lou);
		const removal = page.locator('[data-child-removal]');
		await expect(removal).toContainText(message('adult_delete_what'));
		await expect(removal).toContainText(message('adult_delete_final'));
		await expect(removal).toContainText(message('adult_delete_backup_first'));

		// Escape, then the button at the top: both go back to the report, the profile untouched.
		await page.keyboard.press('Escape');
		await expect(heading(page, message('adult_child_title', { name: lou.name }))).toBeVisible();
		await page.locator('[data-child-delete]').click();
		await button(page, message('adult_delete_cancel')).click();
		await expect(heading(page, message('adult_child_title', { name: lou.name }))).toBeVisible();

		expect((await storedRecord(page, lou))?.['name']).toBe(lou.name);
		expect((await storedRecord(page, ali))?.['name']).toBe(ali.name);
	});

	test('offers the backup first, then deletes the profile and its journal, by the keyboard alone', async ({
		page
	}) => {
		await reachPlayers(page, [lou, ali]);
		await page.evaluate(([key, id]) => localStorage.setItem(key, id), [
			LAST_PLAYER_KEY,
			lou.id
		] as const);
		await openAdultHome(page);
		await openReport(page, lou);
		const open = page.locator('[data-child-delete]');
		await expect(open).toHaveText(message('adult_delete_open', { name: lou.name }));
		await focusByTab(page, open);
		await page.keyboard.press('Enter');
		await expect(heading(page, message('adult_delete_title', { name: lou.name }))).toBeFocused();

		// From the title: the way out, the backup, then the deletion, in that order.
		const removal = page.locator('[data-child-removal]');
		const backup = removal.locator('[data-backup-child]');
		const confirm = removal.locator('[data-child-delete-confirm]');
		await page.keyboard.press('Tab');
		await expect(button(page, message('adult_delete_cancel'))).toBeFocused();
		await page.keyboard.press('Tab');
		await expect(backup).toBeFocused();
		await expect(backup).toHaveText(message('adult_backup_child', { name: lou.name }));
		const downloading = page.waitForEvent('download');
		await page.keyboard.press('Enter');
		const file = (await downloading).suggestedFilename();
		await expect(removal.getByRole('status')).toHaveText(message('adult_downloaded', { file }));
		expect((await storedRecord(page, lou))?.['name']).toBe(lou.name);

		await page.keyboard.press('Tab');
		await expect(confirm).toBeFocused();
		await expect(confirm).toHaveText(message('adult_delete_confirm'));
		await page.keyboard.press('Enter');

		await expect(page.locator('[data-adult-home]')).toBeVisible();
		await expect(heading(page, message('adult_title'))).toBeFocused();
		await expect(page.locator('[data-children-status]')).toHaveText(
			message('adult_delete_done', { name: lou.name })
		);
		await expect(button(page, lou.name)).toHaveCount(0);
		await expect(button(page, ali.name)).toBeVisible();
		expect(await storedRecord(page, lou)).toBeUndefined();
		expect((await storedRecord(page, ali))?.['name']).toBe(ali.name);
		expect(await page.evaluate((key) => localStorage.getItem(key), LAST_PLAYER_KEY)).toBeNull();

		await reloadPage(page);
		await passGate(page);
		await expect(button(page, lou.name)).toHaveCount(0);
		await expect(button(page, ali.name)).toBeVisible();
	});

	test('does not forget the last player when another one is deleted', async ({ page }) => {
		await reachPlayers(page, [lou, ali]);
		await page.evaluate(([key, id]) => localStorage.setItem(key, id), [
			LAST_PLAYER_KEY,
			lou.id
		] as const);
		await openAdultHome(page);
		await openRemoval(page, ali);
		await page.locator('[data-child-delete-confirm]').click();
		await expect(page.locator('[data-children-status]')).toHaveText(
			message('adult_delete_done', { name: ali.name })
		);
		expect(await page.evaluate((key) => localStorage.getItem(key), LAST_PLAYER_KEY)).toBe(lou.id);
	});
});

test.describe('the storage of the browser', () => {
	test('is said not guaranteed in the adult space, with the backup as the way to keep everything', async ({
		page
	}) => {
		await stubStorage(page, { persisted: false, grants: false });
		await reachPlayers(page, [newChild()]);
		await openAdultHome(page);
		const protection = page.locator('[data-storage-protection]');
		await expect(protection).toHaveAttribute('data-storage-protection', 'unprotected');
		await expect(protection).toHaveText(
			message('adult_storage_unprotected', { appName: APP_NAME })
		);
		await expect(page.locator('[data-backup-all]')).toBeVisible();
	});

	test('is said guaranteed in the adult space once the browser keeps the data', async ({
		page
	}) => {
		await stubStorage(page, { persisted: true, grants: true });
		await reachPlayers(page, [newChild()]);
		await openAdultHome(page);
		const protection = page.locator('[data-storage-protection]');
		await expect(protection).toHaveAttribute('data-storage-protection', 'protected');
		await expect(protection).toHaveText(message('adult_storage_protected', { appName: APP_NAME }));
		expect(await persistRequests(page)).toBe(0);
	});

	test('is asked to be kept after the first finished lesson, never before, and only once', async ({
		page
	}) => {
		test.slow();
		await stubStorage(page, { persisted: false, grants: false });
		const child = newChild();
		await reachMap(page, child);
		await startLesson(page, FIRST);
		expect(await persistRequests(page)).toBe(0);

		await typeToResult(page);
		await expect.poll(() => persistRequests(page)).toBe(1);
		expect(
			await page.evaluate((key) => localStorage.getItem(key), STORAGE_ASKED_KEY)
		).not.toBeNull();
		await expect(page.getByText(message('play_result_save_error'))).toHaveCount(0);

		// Another visit, another lesson: the child is not asked again.
		await reloadPage(page);
		await backOnMap(page, child);
		await startLesson(page, SECOND);
		await typeToResult(page);
		await storedOnce(page, child, (record) => countOf(record, 'sessions') === 2);
		expect(await persistRequests(page)).toBe(0);
	});
});

test.describe('a failure of the game', () => {
	test('tells the child the game could not start when no exercise can be made', async ({
		page
	}) => {
		await reachMap(page, newChild());
		await page.getByRole('button', { name: FIRST.title }).click();
		await throughStory(page, heading(page, FIRST.title));
		await page.evaluate(() => {
			Math.random = () => {
				throw new Error('no exercise');
			};
		});

		await page.locator('button[data-proposed]').click();

		await expect(page.getByRole('alert')).toHaveText(message('play_game_load_error'));
		await expect(heading(page, FIRST.title)).toBeVisible();
		await expect(groupLabel(page)).toHaveCount(0);
	});

	test('still shows the result of a play that could not be recorded, and says it is not kept', async ({
		page
	}) => {
		const child = newChild();
		await reachMap(page, child);
		await startLesson(page, FIRST);
		await page.evaluate(() => {
			Date.prototype.getTimezoneOffset = () => {
				throw new Error('no time zone');
			};
		});

		await typeToResult(page);

		await expect(page.getByText(message('play_result_save_error'))).toBeVisible();
		await resultToMap(page);
		expect((await storedRecord(page, child))?.['sessions']).toEqual([]);
	});
});

test.describe('a backup file', () => {
	test('is refused unread when it is far too big to be one', async ({ page }) => {
		const child = newChild();
		await reachPlayers(page, [child]);
		await openAdultHome(page);
		await page.evaluate(() => {
			Object.defineProperty(File.prototype, 'size', { get: () => 2_000_000_000 });
			File.prototype.text = () => Promise.reject(new Error('read although too big'));
		});

		await page.locator('[data-backup-load] input[type="file"]').setInputFiles({
			name: 'film.json',
			mimeType: 'application/json',
			buffer: Buffer.from(exportBackup([newChild('Zoé')], Date.now()), 'utf8')
		});

		await expect(page.locator('[data-import-result]')).toHaveText(
			message('adult_import_refused_too_large', { appName: APP_NAME })
		);
		await expect(page.locator('[data-import-result]')).toHaveAttribute(
			'data-import-result',
			'refused'
		);
		await expect(button(page, 'Zoé')).toHaveCount(0);
	});
});

test.describe('a long nickname at 320 pixels', () => {
	test.use({ viewport: NARROW });

	test('never makes a screen scroll sideways, in the game or in the adult space', async ({
		page
	}) => {
		test.slow();
		const child = advancedProfile({ name: LONG_NAME, passed: { [FIRST.id]: 2 } });
		const found: Record<string, string[]> = {};
		const check = async (screen: string) => {
			const outside = await sticksOut(page);
			if (outside.length > 0) found[screen] = outside;
		};

		await reachPlayers(page, [child, newChild('Lou')]);
		await check('players');
		await button(page, LONG_NAME).click();
		await expect(heading(page, message('play_map_title'))).toBeVisible();
		await expect(playerInTopBar(page)).toHaveText(LONG_NAME);
		await check('map');

		await openAdultHome(page);
		await check('adult home');
		await openReport(page, child);
		await check('report');
		await page.locator('[data-child-settings]').click();
		await expect(heading(page, message('adult_settings_title', { name: LONG_NAME }))).toBeVisible();
		await check('settings of the child');
		await page.keyboard.press('Escape');
		await page.locator('[data-child-sheet]').click();
		await expect(heading(page, message('adult_sheet_title', { name: LONG_NAME }))).toBeVisible();
		await check('session sheet');
		await page.keyboard.press('Escape');
		await page.locator('[data-child-delete]').click();
		await expect(heading(page, message('adult_delete_title', { name: LONG_NAME }))).toBeVisible();
		await check('deletion');

		expect(found).toEqual({});
	});

	test('stops the nickname of a new player at its longest, as it is typed', async ({ page }) => {
		await reachPlayers(page, []);
		await button(page, message('play_new_player')).click();
		const input = page.getByLabel(message('play_new_label'));
		await input.focus();
		await page.keyboard.type('w'.repeat(MAX_NAME_LENGTH + 5));
		await expect(input).toHaveValue('w'.repeat(MAX_NAME_LENGTH));
		expect(await sticksOut(page)).toEqual([]);
	});
});

for (const colorScheme of COLOR_SCHEMES) {
	test.describe(`the data of the child, ${colorScheme} theme`, () => {
		test.use({ colorScheme });

		async function expectNoAxeViolation(page: Page) {
			await page.evaluate(() => document.fonts.ready);
			const scan = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
			expect(scan.violations).toEqual([]);
		}

		test('has no axe violation on the nickname, the deletion and the list of the children', async ({
			page
		}) => {
			test.slow();
			await stubStorage(page, { persisted: false, grants: false });
			const lou = advancedProfile({ name: 'Lou', passed: { [FIRST.id]: 2 } });
			await reachPlayers(page, [lou, newChild('Ali')]);
			await openAdultHome(page);
			await expect(page.locator('[data-storage-protection]')).toBeVisible();
			await expectNoAxeViolation(page);

			await openReport(page, lou);
			const identity = page.locator('[data-child-identity]');
			await identity.locator('[data-child-name]').fill('');
			await identity.locator('[data-child-rename]').click();
			await expect(identity.getByRole('alert')).toHaveText(message('adult_rename_error_empty'));
			await expectNoAxeViolation(page);
			await identity.locator('[data-child-name]').fill('Zoé');
			await identity.locator('[data-child-rename]').click();
			await expect(identity.getByRole('status')).toHaveText(
				message('adult_rename_done', { name: 'Zoé' })
			);
			await expectNoAxeViolation(page);

			await page.locator('[data-child-delete]').click();
			await expect(heading(page, message('adult_delete_title', { name: 'Zoé' }))).toBeVisible();
			await expectNoAxeViolation(page);
			await page.locator('[data-child-delete-confirm]').click();
			await expect(page.locator('[data-children-status]')).toHaveText(
				message('adult_delete_done', { name: 'Zoé' })
			);
			await expectNoAxeViolation(page);
		});
	});
}
