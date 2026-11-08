import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Download, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { CharProgress } from '../src/lib/engine/progression/types';
import { BACKUP_FORMAT_ID, exportBackup } from '../src/lib/state/backup';
import type { Profile, SessionRecord } from '../src/lib/state/types';
import {
	advancedProfile,
	installProfile,
	loadMessages,
	openPage,
	readJson,
	reloadPage,
	storedRecord,
	throughStory
} from './support';

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;
const CODE = '2580';
const BYTE_ORDER_MARK = [0xef, 0xbb, 0xbf];

const { message, plural } = loadMessages();
const APP_NAME = message('app_name');
const gateNumbers = readJson<{ numbers: { value: number; words: string }[] }>(
	'content/fr/adult/gate-numbers.json'
).numbers;
interface World {
	id: string;
	title: string;
	lessons: { id: string; title: string }[];
}

const worlds = readJson<{ worlds: World[] }>(
	'content/fr/progression/azerty-decouverte.json'
).worlds;
const world = worlds[0];
const ZOO = worlds[2] as World;
const story = readJson<{ worlds: { worldId: string; opening: string }[] }>(
	'content/fr/story/azerty-decouverte.json'
).worlds;
const FIRST = world?.lessons[0] as { id: string; title: string };

function sample(attempts: number, errors: number, latencyMs: number | null = null): CharProgress {
	return { attempts, errors, recent: [{ attempts, errors, latencyMs }] };
}

function session(index: number, accuracy: number, correctCharsPerMinute: number): SessionRecord {
	return {
		lessonId: FIRST.id,
		gameId: 'hatching',
		finishedAt: Date.parse('2026-10-20T15:00:00Z') + index * 86_400_000,
		utcOffsetMinutes: 120,
		durationMs: 90_000,
		totalKeystrokes: 100,
		correctKeystrokes: accuracy,
		errorCount: 100 - accuracy,
		accuracy,
		correctCharsPerMinute,
		stars: 2,
		passed: true
	};
}

/** A child who has played three times, with one key acquired and one fragile. */
function preparedChild(name: string): Profile {
	const base = advancedProfile({ name, passed: { [FIRST.id]: 2 } });
	return {
		...base,
		progress: { ...base.progress, chars: { q: sample(30, 0), s: sample(30, 15) } },
		sessions: [session(0, 80, 40), session(1, 90, 50), session(2, 95, 60)],
		practiceDays: ['2026-10-20', '2026-10-21', '2026-10-22']
	};
}

/** A child whose acquired keys are all found in 300 ms, but L, found in 900 ms. */
function hesitantChild(name: string): Profile {
	const base = advancedProfile({ name, passed: { [FIRST.id]: 2 } });
	const steady = Object.fromEntries(
		['s', 'd', 'f', 'j', 'k'].map((char) => [char, sample(30, 0, 300)])
	);
	return { ...base, progress: { ...base.progress, chars: { ...steady, l: sample(30, 0, 900) } } };
}

const lou = preparedChild('Lou');
const ali = advancedProfile({ name: 'Ali', passed: {} });

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

async function reachPlayers(page: Page, profiles: readonly Profile[] = [lou, ali]) {
	await openPage(page, '/jouer');
	for (const profile of profiles) await installProfile(page, profile);
	await reloadPage(page);
	await expect(heading(page, message('play_players_title'))).toBeVisible();
}

/** From the player screen to the gate, by the keyboard. */
async function enterAdultSpace(page: Page) {
	await page.locator('[data-adult-entry]').focus();
	await page.keyboard.press('Enter');
	await expect(heading(page, message('adult_title'))).toBeVisible();
}

async function askedNumber(page: Page): Promise<number> {
	const words = (await page.locator('[data-gate-words]').textContent())?.trim();
	const number = gateNumbers.find((entry) => entry.words === words);
	if (!number) throw new Error(`unknown gate number: ${words}`);
	return number.value;
}

async function typeInto(page: Page, selector: string, text: string) {
	await page.locator(selector).focus();
	await page.keyboard.type(text);
	await page.keyboard.press('Enter');
}

async function passGate(page: Page) {
	await typeInto(page, '[data-gate-answer]', String(await askedNumber(page)));
	await expect(page.locator('[data-adult-home]')).toBeVisible();
}

async function openReport(page: Page, profile: Profile) {
	await button(page, profile.name).click();
	await expect(heading(page, message('adult_child_title', { name: profile.name }))).toBeVisible();
}

async function contentOf(download: Download): Promise<Buffer> {
	const path = await download.path();
	return readFileSync(path);
}

function backupFile(name: string, text: string) {
	return { name, mimeType: 'application/json', buffer: Buffer.from(text, 'utf8') };
}

async function loadFile(page: Page, file: ReturnType<typeof backupFile>) {
	await page.locator('[data-backup-load] input[type="file"]').setInputFiles(file);
}

test.describe('adult space', () => {
	test('opens from the player screen and asks again after a wrong number', async ({ page }) => {
		await reachPlayers(page);
		await enterAdultSpace(page);
		const first = await askedNumber(page);
		await typeInto(page, '[data-gate-answer]', String(first + 1));
		await expect(
			page.getByRole('status').filter({ hasText: message('adult_gate_wrong') })
		).toBeVisible();
		await expect(page.locator('[data-gate-answer]')).toBeFocused();
		await expect(page.locator('[data-gate-answer]')).toHaveValue('');
		expect(await askedNumber(page)).not.toBe(first);

		await passGate(page);
		const children = page.locator('[data-adult-home] ul button');
		await expect(children).toHaveText([ali.name, lou.name]);

		// The way out leads back to the player screen, nobody chosen.
		await page.keyboard.press('Escape');
		await expect(heading(page, message('play_players_title'))).toBeVisible();
	});

	test('asks for the code instead of the number once one is set, until it is removed', async ({
		page
	}) => {
		await reachPlayers(page);
		await enterAdultSpace(page);
		await passGate(page);

		const settings = page.locator('[data-code-settings]');
		await settings.getByRole('button', { name: message('adult_code_add') }).focus();
		await page.keyboard.press('Enter');
		await expect(settings.locator('[data-code-new]')).toBeFocused();
		await page.keyboard.type(CODE);
		await settings.locator('[data-code-repeat]').focus();
		await page.keyboard.type('1111');
		await page.keyboard.press('Enter');
		await expect(settings.getByRole('alert')).toHaveText(message('adult_code_mismatch'));
		await settings.locator('[data-code-repeat]').fill('');
		await typeInto(page, '[data-code-repeat]', CODE);
		await expect(settings.getByRole('status')).toHaveText(message('adult_code_saved'));

		await button(page, message('adult_back_to_players')).click();
		await enterAdultSpace(page);
		await expect(page.locator('[data-gate-words]')).toHaveCount(0);
		await typeInto(page, '[data-adult-code]', '0000');
		await expect(page.getByText(message('adult_code_wrong'))).toBeVisible();
		await typeInto(page, '[data-adult-code]', CODE);
		await expect(page.locator('[data-adult-home]')).toBeVisible();

		await settings.getByRole('button', { name: message('adult_code_remove') }).click();
		await expect(settings.getByRole('status')).toHaveText(message('adult_code_removed'));
		await reloadPage(page);
		await expect(page.locator('[data-gate-words]')).toBeVisible();
	});

	test('shows the report and the evolution of a child', async ({ page }) => {
		await reachPlayers(page);
		await enterAdultSpace(page);
		await passGate(page);
		await openReport(page, lou);

		const lessons = page.locator('[data-child-lessons]');
		await expect(lessons.getByRole('row', { name: world?.title })).toContainText(
			message('adult_lessons_value', { count: 1, total: world?.lessons.length ?? 0 })
		);

		await expect(page.locator('.key[data-code="KeyA"]')).toHaveAttribute(
			'data-mastery',
			'acquired'
		);
		await expect(page.locator('.key[data-code="KeyS"]')).toHaveAttribute('data-mastery', 'fragile');
		await expect(page.locator('.key[data-code="KeyD"]')).not.toHaveAttribute('data-mastery');
		await expect(page.locator('[data-keys="acquired"]')).toHaveText(
			message('adult_keys_acquired', { keys: 'Q' })
		);
		await expect(page.locator('[data-keys="fragile"]')).toHaveText(
			message('adult_keys_fragile', { keys: 'S' })
		);
		await expect(page.locator('[data-keys="hesitant"]')).toHaveText(
			message('adult_keys_hesitant_none')
		);

		const evolution = page.locator('[data-child-evolution]');
		await expect(
			evolution.locator('[data-chart]').first().locator('[data-chart-point]')
		).toHaveCount(lou.sessions.length);
		await evolution.getByText(message('adult_table_show')).first().click();
		await expect(evolution.locator('[data-sessions-table] tbody tr')).toHaveCount(
			lou.sessions.length
		);
		await expect(evolution.locator('[data-days-total]')).toHaveText(
			plural('adult_days_total', lou.practiceDays.length)
		);

		const target = page.locator('[data-child-target]');
		await expect(target.locator('[data-target-hand]')).toHaveText(
			message('adult_target_hand_none')
		);
		await typeInto(page, '[data-measure-words]', '0');
		await expect(target.getByRole('alert')).toHaveText(
			message('adult_measure_invalid', { min: 1, max: 60 })
		);
		await target.locator('[data-measure-words]').fill('');
		await typeInto(page, '[data-measure-words]', '14');
		await expect(target.getByRole('status')).toHaveText(message('adult_measure_saved'));
		await expect(target.locator('[data-target-hand]')).toContainText('14');
		await expect(target.locator('[data-target-status]')).toHaveAttribute(
			'data-target-status',
			'below'
		);
		await expect(evolution.locator('[data-chart-reference]')).toHaveCount(1);
		await expect
			.poll(async () => (await storedRecord(page, lou))?.['handwritingSamples'])
			.toMatchObject([{ wordsPerMinute: 14 }]);

		await page.keyboard.press('Escape');
		await openReport(page, ali);
		await expect(
			heading(page, message('adult_child_title_elided', { name: ali.name }))
		).toBeVisible();
		await expect(page.locator('[data-evolution-empty]')).toHaveText(
			message('adult_evolution_empty', { name: ali.name })
		);
	});

	test('lists the acquired key the child takes much longer to find than the others', async ({
		page
	}) => {
		const sam = hesitantChild('Sam');
		await reachPlayers(page, [sam]);
		await enterAdultSpace(page);
		await passGate(page);
		await openReport(page, sam);

		await expect(page.locator('[data-keys="hesitant"]')).toHaveText(
			message('adult_keys_hesitant', { keys: 'L' })
		);
		await expect(page.locator('.key[data-code="KeyL"]')).toHaveAttribute(
			'data-mastery',
			'acquired'
		);
	});

	test('downloads the measures for a spreadsheet and a backup', async ({ page }) => {
		await reachPlayers(page);
		await enterAdultSpace(page);
		await passGate(page);
		await expect(page.locator('[data-last-backup]')).toHaveText(message('adult_backup_never'));

		const measures = page.waitForEvent('download');
		await page.locator('[data-measures-all]').click();
		const csv = await measures;
		const prefix = message('adult_measures_file_prefix', { appName: APP_NAME });
		expect(csv.suggestedFilename()).toMatch(new RegExp(`^${prefix}-\\d{4}-\\d{2}-\\d{2}\\.csv$`));
		const bytes = await contentOf(csv);
		expect([...bytes.subarray(0, 3)]).toEqual(BYTE_ORDER_MARK);
		const lines = bytes.subarray(3).toString('utf8').split('\r\n');
		const separator = message('adult_csv_separator');
		expect(lines[0]?.split(separator)[0]).toBe(message('adult_csv_child'));
		// Ali has no play: the lines are the three plays of Lou, with a decimal comma.
		expect(lines.slice(1).filter((line) => line !== '')).toHaveLength(lou.sessions.length);
		expect(lines[1]).toContain(`${lou.name}${separator}2026-10-20${separator}17:00`);
		expect(lines[1]?.split(separator)[5]).toBe('90');

		const backup = page.waitForEvent('download');
		await page.locator('[data-backup-all]').click();
		const saved = await backup;
		expect(saved.suggestedFilename()).toMatch(
			new RegExp(`^${APP_NAME}-\\d{4}-\\d{2}-\\d{2}\\.json$`)
		);
		const file = JSON.parse((await contentOf(saved)).toString('utf8')) as {
			format: string;
			profiles: Profile[];
		};
		expect(file.format).toBe(BACKUP_FORMAT_ID);
		expect(file.profiles.map((profile) => profile.name)).toEqual([ali.name, lou.name]);
		await expect(page.locator('[data-last-backup]')).not.toHaveText(message('adult_backup_never'));

		await openReport(page, lou);
		const one = page.waitForEvent('download');
		await page.locator('[data-backup-child]').click();
		expect((await one).suggestedFilename()).toMatch(
			new RegExp(`^${APP_NAME}-${lou.name}-\\d{4}-\\d{2}-\\d{2}\\.json$`)
		);
	});

	test('reloads a backup, keeping both or replacing, and says why a file is refused', async ({
		page
	}) => {
		await reachPlayers(page);
		await enterAdultSpace(page);
		await passGate(page);
		const result = page.locator('[data-backup-load] [role="status"]');
		const changed: Profile = { ...lou, sessions: [...lou.sessions, session(3, 99, 70)] };
		const text = exportBackup([changed], Date.now());

		await loadFile(page, backupFile('sauvegarde.json', text));
		const conflicts = page.locator('[data-import-conflicts]');
		await expect(conflicts).toContainText(
			message('adult_import_conflict_legend', { name: lou.name })
		);
		const copyName = message('adult_copy_name', { name: lou.name, number: 2 });
		await expect(
			conflicts.getByRole('radio', { name: message('adult_import_keep_both', { copy: copyName }) })
		).toBeChecked();
		await conflicts.getByRole('button', { name: message('adult_import_confirm') }).focus();
		await page.keyboard.press('Enter');
		await expect(result).toHaveText(plural('adult_import_done', 1));
		await expect(page.locator('[data-adult-home] ul button')).toHaveText([
			ali.name,
			lou.name,
			copyName
		]);
		expect((await storedRecord(page, lou))?.['sessions']).toHaveLength(lou.sessions.length);

		await loadFile(page, backupFile('sauvegarde.json', text));
		await conflicts.getByRole('radio', { name: message('adult_import_replace') }).focus();
		await page.keyboard.press('Space');
		await expect(
			conflicts.getByRole('radio', { name: message('adult_import_replace') })
		).toBeChecked();
		await conflicts.getByRole('button', { name: message('adult_import_confirm') }).click();
		await expect(result).toHaveText(plural('adult_import_done', 1));
		await expect
			.poll(async () => ((await storedRecord(page, lou))?.['sessions'] as unknown[]).length)
			.toBe(changed.sessions.length);

		await loadFile(page, backupFile('notes.json', '{"title":"courses"}'));
		await expect(result).toHaveText(
			message('adult_import_refused_not_a_backup', { appName: APP_NAME })
		);
		const newer = JSON.stringify({ ...JSON.parse(text), formatVersion: 99 });
		await loadFile(page, backupFile('futur.json', newer));
		await expect(result).toHaveText(
			message('adult_import_refused_newer_version', { appName: APP_NAME })
		);
		await loadFile(page, backupFile('coupe.json', text.slice(0, text.length / 2)));
		await expect(result).toHaveText(message('adult_import_refused_invalid'));
	});

	test('opens a world ahead, which the child then finds open, its story told on the way in', async ({
		page
	}) => {
		await reachPlayers(page);
		await enterAdultSpace(page);
		await passGate(page);
		await openReport(page, ali);

		const place = page.locator('[data-child-worlds]');
		const zoo = place.getByRole('radio', { name: ZOO.title });
		await zoo.focus();
		await page.keyboard.press('Space');
		await expect(zoo).toBeChecked();
		await place.locator('[data-world-open]').focus();
		await page.keyboard.press('Enter');
		const question = message('adult_worlds_confirm_question', { world: ZOO.title, name: ali.name });
		await expect(place.getByText(question)).toBeFocused();
		// Cancel gives the focus back to the button that asked.
		await place.getByRole('button', { name: message('adult_worlds_cancel') }).focus();
		await page.keyboard.press('Enter');
		await expect(place.locator('[data-world-open]')).toBeFocused();
		await page.keyboard.press('Enter');
		await place.locator('[data-world-confirm]').focus();
		await page.keyboard.press('Enter');
		await expect(place.getByRole('status')).toHaveText(
			message('adult_worlds_opened', { world: ZOO.title, name: ali.name })
		);
		await expect(place.getByRole('radio', { name: ZOO.title })).toHaveCount(0);
		await expect(place.locator('[data-worlds-opened]')).toHaveText(
			message('adult_worlds_already', { worlds: ZOO.title })
		);
		await expect
			.poll(async () => (await storedRecord(page, ali))?.['openedWorldIds'])
			.toEqual([ZOO.id]);

		await page.keyboard.press('Escape');
		await page.keyboard.press('Escape');
		await expect(heading(page, message('play_players_title'))).toBeVisible();
		await button(page, ali.name).click();
		await expect(heading(page, message('play_map_title'))).toBeVisible();
		const [zooFirst, zooSecond] = ZOO.lessons as [World['lessons'][0], World['lessons'][0]];
		const opened = page.getByRole('button', { name: zooFirst.title });
		await expect(opened).toBeVisible();
		await expect(page.getByRole('button', { name: zooSecond.title })).toHaveCount(0);
		await expect(
			page.getByRole('button', { name: worlds[1]?.lessons[0]?.title ?? '' })
		).toHaveCount(0);

		// The arrows walk from the first lesson to the opened one, over the closed ones.
		await page.getByRole('button', { name: FIRST.title }).focus();
		await page.keyboard.press('ArrowDown');
		await expect(opened).toBeFocused();
		await page.keyboard.press('Enter');
		const opening = story.find((told) => told.worldId === ZOO.id)?.opening ?? '';
		await expect(page.getByText(opening)).toBeVisible();
		expect(
			await throughStory(page, heading(page, zooFirst.title), { keyboard: true })
		).toBeGreaterThan(0);
	});

	test('keeps the words of the adult the keyboard types, and lists the others', async ({
		page
	}) => {
		await reachPlayers(page);
		await enterAdultSpace(page);
		await passGate(page);
		await openReport(page, lou);

		const words = page.locator('[data-child-words]');
		await expect(words.locator('[data-words-current]')).toHaveText(
			message('adult_words_current_none')
		);
		await words.locator('[data-words-input]').focus();
		await page.keyboard.insertText('lune, vélo; Ça\nlune ÉTÉ');
		await words.locator('[data-words-save]').focus();
		await page.keyboard.press('Enter');
		const outcome = words.locator('[data-words-outcome]');
		await expect(outcome).toHaveAttribute('aria-live', 'polite');
		await expect(outcome.locator('[data-words-status]')).toHaveText(plural('adult_words_saved', 2));
		const refused = [
			message('adult_words_refused_word', { word: 'Ça', chars: 'Ç' }),
			message('adult_words_refused_word', { word: 'ÉTÉ', chars: 'É' })
		];
		await expect(outcome.locator('[data-words-refused]')).toHaveText(
			message('adult_words_refused', {
				name: lou.name,
				words: new Intl.ListFormat('fr', { type: 'conjunction' }).format(refused)
			})
		);
		await expect(words.locator('[data-words-current]')).toHaveText(
			message('adult_words_current', { words: 'lune et vélo' })
		);
		await expect
			.poll(async () => (await storedRecord(page, lou))?.['adultWords'])
			.toEqual(['lune', 'vélo']);

		await words.locator('[data-words-clear]').click();
		await expect(outcome.locator('[data-words-status]')).toHaveText(message('adult_words_cleared'));
		await expect.poll(async () => (await storedRecord(page, lou))?.['adultWords']).toEqual([]);
	});

	test('changes a setting of a child, which the child then finds in the game', async ({ page }) => {
		await reachPlayers(page);
		await enterAdultSpace(page);
		await passGate(page);
		await openReport(page, lou);

		await page.locator('[data-child-settings]').focus();
		await page.keyboard.press('Enter');
		await expect(heading(page, message('adult_settings_title', { name: lou.name }))).toBeVisible();
		const larger = page.getByRole('radio', { name: message('settings_scale_xl') });
		await larger.focus();
		await page.keyboard.press('Space');
		await expect(page.getByRole('status')).toHaveText(message('settings_saved'));
		await expect
			.poll(async () => (await storedRecord(page, lou))?.['settings'])
			.toMatchObject({ textScale: 'xl' });

		await page.keyboard.press('Escape');
		await expect(heading(page, message('adult_child_title', { name: lou.name }))).toBeVisible();
		await page.keyboard.press('Escape');
		await page.keyboard.press('Escape');
		await button(page, lou.name).click();
		await expect(heading(page, message('play_map_title'))).toBeVisible();
		await button(page, message('play_settings_open')).click();
		await expect(page.getByRole('radio', { name: message('settings_scale_xl') })).toBeChecked();
	});
});

for (const colorScheme of COLOR_SCHEMES) {
	test.describe(`adult space, ${colorScheme} theme`, () => {
		test.use({ colorScheme });

		async function expectNoAxeViolation(page: Page) {
			const scan = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
			expect(scan.violations).toEqual([]);
		}

		test('has no axe violation on the gate, the list, the report and a conflict', async ({
			page
		}) => {
			test.slow();
			await reachPlayers(page);
			await expectNoAxeViolation(page);
			await enterAdultSpace(page);
			await expectNoAxeViolation(page);
			await passGate(page);
			await expectNoAxeViolation(page);

			await loadFile(page, backupFile('sauvegarde.json', exportBackup([lou], Date.now())));
			await expect(page.locator('[data-import-conflicts]')).toBeVisible();
			await expectNoAxeViolation(page);

			await openReport(page, lou);
			for (const summary of await page.getByText(message('adult_table_show')).all()) {
				await summary.click();
			}
			await expect(page.locator('.key[data-mastery]').first()).toBeVisible();
			await expectNoAxeViolation(page);

			// The question of a world to open, words half refused, then the settings of the child.
			await page.locator('[data-world-open]').click();
			await expect(page.locator('[data-world-confirm]')).toBeVisible();
			await expectNoAxeViolation(page);
			await page.locator('[data-words-input]').fill('lune Ça');
			await page.locator('[data-words-save]').click();
			await expect(page.locator('[data-words-refused]')).toBeVisible();
			await expectNoAxeViolation(page);
			await page.locator('[data-child-settings]').click();
			await expect(
				heading(page, message('adult_settings_title', { name: lou.name }))
			).toBeVisible();
			await expectNoAxeViolation(page);
		});
	});
}
