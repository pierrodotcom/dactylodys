import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { parseRewardCatalogue, type RewardDefinition } from '../src/lib/engine/rewards';
import type { StarCount } from '../src/lib/engine/progression/types';
import { withCompanion, withEarnedRewards, withProgress } from '../src/lib/state/profile';
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
	type StoredFormat
} from './support';

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;
const PLAY_URL = '/jouer';
const PRESS_BUDGET = 80;
const STEP_TIMEOUT = 15_000;
const PASSED_STARS: StarCount = 3;
const COMPANION_NAME = 'Pistache';
/** Recent keystrokes of a key that became hard again: half of them wrong. */
const FRAGILE = { attempts: 10, errors: 5 } as const;

interface Lesson {
	id: string;
	title: string;
	newChars: string[];
}

interface World {
	id: string;
	lessons: Lesson[];
}

const { message, templateRegex } = loadMessages();
const worlds = readJson<{ worlds: World[] }>(
	'content/fr/progression/azerty-decouverte.json'
).worlds;
const catalogue = parseRewardCatalogue(readJson('content/fr/rewards/azerty-decouverte.json'));
const firstWorld = worlds[0] ?? { id: '', lessons: [] };
const [FIRST, SECOND] = firstWorld.lessons as [Lesson, Lesson];
const FRAGILE_KEY = FIRST.newChars[0] ?? '';

function itemOf(lessonId: string): RewardDefinition {
	const item = catalogue.rewards.find(
		(reward) =>
			reward.kind === 'item' &&
			reward.condition.kind === 'lesson-passed' &&
			reward.condition.lessonId === lessonId
	);
	if (!item) throw new Error(`No item for ${lessonId}`);
	return item;
}

const NECKLACE = itemOf(FIRST.id);
const SECOND_ITEM = itemOf(SECOND.id);
const FIRST_WORLD_SKILL = catalogue.rewards.find(
	(reward) =>
		reward.kind === 'skill' &&
		reward.condition.kind === 'world-passed' &&
		reward.condition.worldId === firstWorld.id
);
const [FIRST_COLOR, SECOND_COLOR] = catalogue.colors as [
	(typeof catalogue.colors)[number],
	(typeof catalogue.colors)[number]
];

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function groupLabel(page: Page): Locator {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

const GROUP_LABEL = templateRegex('ui_target_text_label');

function passedThrough(lessons: readonly Lesson[]): Record<string, StarCount> {
	return Object.fromEntries(lessons.map((lesson) => [lesson.id, PASSED_STARS]));
}

async function reachMapAs(page: Page, profile: Profile, format: StoredFormat = 'current') {
	await openPage(page, PLAY_URL);
	await installProfile(page, profile, format);
	await reloadPage(page);
	await page.getByRole('button', { name: profile.name }).click();
	await expect(heading(page, message('play_map_title'))).toBeVisible();
}

async function focusByTab(page: Page, target: Locator) {
	await expect(target).toBeVisible();
	for (let press = 0; press < PRESS_BUDGET; press++) {
		if (await target.evaluate((element) => element === document.activeElement)) return;
		await page.keyboard.press('Tab');
	}
	throw new Error('The element cannot be reached with the Tab key');
}

async function activateByTab(page: Page, target: Locator) {
	await focusByTab(page, target);
	await page.keyboard.press('Enter');
}

async function currentGroup(page: Page): Promise<string> {
	const label = groupLabel(page);
	await expect(label).toHaveText(GROUP_LABEL);
	return GROUP_LABEL.exec((await label.textContent()) ?? '')?.groups?.['text'] ?? '';
}

/** Types every group, from the one on screen, until the button that ends the play shows up. */
async function typeToEnd(page: Page, endButton: string) {
	const finale = button(page, message('game_shared_finale_continue'));
	const end = button(page, endButton);
	for (;;) {
		await page.keyboard.type(await currentGroup(page));
		await page.keyboard.press('Enter');
		const found: { over?: boolean } = {};
		await expect(async () => {
			if ((await end.isVisible()) || (await finale.isVisible())) found.over = true;
			else if ((await groupLabel(page).allTextContents()).some((text) => GROUP_LABEL.test(text)))
				found.over = false;
			expect(found.over).toBeDefined();
		}).toPass({ timeout: STEP_TIMEOUT });
		if (found.over) break;
	}
	if (await finale.isVisible()) await finale.click();
	await expect(end).toBeVisible();
}

async function playLesson(page: Page, lesson: Lesson) {
	await page.getByRole('button', { name: lesson.title }).click();
	await expect(heading(page, lesson.title)).toBeVisible();
	await page.locator('button[data-proposed]').click();
	await typeToEnd(page, message('play_result_map'));
}

function helpBubble(page: Page, key: string) {
	return page.getByText(message('play_help_ask', { key }));
}

function bigCompanion(page: Page) {
	return page.locator('.stage svg.companion');
}

function stored(page: Page, profile: Profile) {
	return storedRecord(page, profile) as Promise<Record<string, unknown> & Profile>;
}

async function expectNoAxeViolation(page: Page) {
	await page.evaluate(() => document.fonts.ready);
	const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
	expect(results.violations).toEqual([]);
}

/** A child who has passed the first lesson and holds what it earned. */
function profileWithNecklace(name: string): Profile {
	const passed = advancedProfile({ name, passed: passedThrough([FIRST]) });
	return withEarnedRewards(passed, [NECKLACE.id]);
}

/** A child who has passed the first lesson, whose first key became hard again. */
function profileWithFragileKey(name: string): Profile {
	const passed = profileWithNecklace(name);
	return withProgress(passed, {
		...passed.progress,
		chars: { [FRAGILE_KEY]: { ...FRAGILE, recent: [FRAGILE] } }
	});
}

test.beforeEach(async ({ page }) => {
	await shortenRewards(page);
});

test.describe('companion and rewards', () => {
	test('announces the item of the first lesson, puts it on and asks for a name, with the keyboard alone', async ({
		page
	}) => {
		const child = advancedProfile({ name: 'Nova', passed: {} });
		await reachMapAs(page, child);

		await page.getByRole('button', { name: FIRST.title }).click();
		await expect(heading(page, FIRST.title)).toBeVisible();
		await expect(
			page.getByText(message('play_reward_prize', { title: NECKLACE.title }))
		).toBeVisible();
		await page.locator('button[data-proposed]').click();
		await typeToEnd(page, message('play_result_map'));

		await expect(page.getByRole('heading', { name: message('play_reward_new') })).toBeVisible();
		await expect(
			page.getByText(message('play_reward_won', { title: NECKLACE.title }))
		).toBeVisible();
		await expect(page.getByRole('img', { name: NECKLACE.title })).toBeVisible();
		const photo = page.locator('.photo svg.companion');
		await expect(photo).not.toHaveAttribute('data-items', /./);

		await activateByTab(page, button(page, message('play_reward_wear')));
		await expect(photo).toHaveAttribute('data-items', NECKLACE.artId);
		await expect(page.getByText(message('play_reward_worn'))).toBeVisible();
		await expect(button(page, message('play_reward_wear'))).toHaveCount(0);

		await expect(
			page.getByRole('heading', { name: message('play_reward_name_question') })
		).toBeVisible();
		for (const idea of catalogue.nameSuggestions) {
			await expect(button(page, idea)).toBeVisible();
		}
		await focusByTab(page, page.getByLabel(message('play_companion_name_label')));
		await page.keyboard.type(COMPANION_NAME);
		await page.keyboard.press('Enter');
		await expect(
			page.getByText(message('play_companion_named', { name: COMPANION_NAME }))
		).toBeVisible();
		await expect(
			page.getByRole('heading', { name: message('play_reward_name_question') })
		).toHaveCount(0);

		await expect
			.poll(async () => {
				const record = await stored(page, child);
				return [record.companion.name, record.companion.wornItemIds, record.earnedRewardIds];
			})
			.toEqual([COMPANION_NAME, [NECKLACE.id], [NECKLACE.id]]);

		await activateByTab(page, button(page, message('play_result_map')));
		await expect(heading(page, message('play_map_title'))).toBeVisible();
		await expect(page.locator('.hero svg.companion')).toHaveAttribute('data-items', NECKLACE.artId);
	});

	test('lets the child answer later, and does not ask again during the visit', async ({ page }) => {
		const child = advancedProfile({ name: 'Lou', passed: {} });
		await reachMapAs(page, child);
		await playLesson(page, FIRST);
		await button(page, message('play_reward_name_later')).click();
		await expect(
			page.getByRole('heading', { name: message('play_reward_name_question') })
		).toHaveCount(0);

		await button(page, message('play_result_replay')).click();
		await typeToEnd(page, message('play_result_map'));
		await expect(page.getByRole('heading', { name: message('play_reward_new') })).toHaveCount(0);
		await expect(
			page.getByRole('heading', { name: message('play_reward_name_question') })
		).toHaveCount(0);
		expect((await stored(page, child)).companion.name).toBe('');
	});

	test('opens the companion from the map: a name, a colour, an item taken off, and back to the map', async ({
		page
	}) => {
		const child = withCompanion(profileWithNecklace('Sam'), {
			name: '',
			colorId: null,
			wornItemIds: [NECKLACE.id]
		});
		await reachMapAs(page, child);

		await activateByTab(page, button(page, message('play_companion_open')));
		await expect(heading(page, message('play_companion_title'))).toBeVisible();
		await expect(bigCompanion(page)).toHaveAttribute('data-items', NECKLACE.artId);
		await expect(page.getByText(SECOND_ITEM.description)).toBeVisible();
		await expect(
			page.getByRole('img', {
				name: message('play_companion_locked', { title: SECOND_ITEM.title })
			})
		).toBeVisible();
		for (const slot of ['head', 'face', 'neck', 'body', 'back', 'hand', 'feet']) {
			await expect(
				page.getByRole('heading', { level: 3, name: message(`play_companion_slot_${slot}`) })
			).toBeVisible();
		}

		await focusByTab(page, page.getByLabel(message('play_companion_name_label')));
		await page.keyboard.type(COMPANION_NAME);
		await page.keyboard.press('Enter');
		await expect(
			page.getByText(message('play_companion_named', { name: COMPANION_NAME }))
		).toBeVisible();

		const firstColor = page.getByRole('radio', { name: FIRST_COLOR.title });
		await expect(firstColor).toBeChecked();
		await focusByTab(page, firstColor);
		await page.keyboard.press('ArrowRight');
		await expect(page.getByRole('radio', { name: SECOND_COLOR.title })).toBeChecked();
		await expect(bigCompanion(page)).toHaveAttribute('data-color', SECOND_COLOR.id);

		const necklace = button(page, NECKLACE.title);
		await expect(necklace).toHaveAttribute('aria-pressed', 'true');
		await activateByTab(page, necklace);
		await expect(necklace).toHaveAttribute('aria-pressed', 'false');
		await expect(bigCompanion(page)).not.toHaveAttribute('data-items', /./);

		await expect
			.poll(async () => (await stored(page, child)).companion)
			.toEqual({ name: COMPANION_NAME, colorId: SECOND_COLOR.id, wornItemIds: [] });

		await activateByTab(page, button(page, message('play_companion_back')));
		await expect(heading(page, message('play_map_title'))).toBeVisible();
		await expect(page.locator('.hero svg.companion')).toHaveAttribute(
			'data-color',
			SECOND_COLOR.id
		);
	});

	test('gives a profile of version 4 what it has already earned, without announcing it', async ({
		page
	}) => {
		const child = advancedProfile({ name: 'Ada', passed: passedThrough(firstWorld.lessons) });
		await reachMapAs(page, child, 'version-4');

		// Opening a profile never rewrites its record: what it earned is stored with the next play.
		expect((await stored(page, child)).schemaVersion).toBe(4);

		await button(page, message('play_companion_open')).click();
		await expect(heading(page, message('play_companion_title'))).toBeVisible();
		for (const lesson of firstWorld.lessons) {
			await expect(button(page, itemOf(lesson.id).title)).toHaveAttribute('aria-pressed', 'false');
		}
		await button(page, message('play_companion_trick_show')).first().click();
		await expect(bigCompanion(page)).toHaveAttribute('data-trick', FIRST_WORLD_SKILL?.artId ?? '');
		await button(page, message('play_companion_back')).click();

		await page.getByRole('button', { name: FIRST.title }).click();
		await expect(heading(page, FIRST.title)).toBeVisible();
		await expect(page.locator('[data-prize]')).toHaveCount(0);
		await page.locator('button[data-proposed]').click();
		await typeToEnd(page, message('play_result_map'));
		await expect(page.getByRole('heading', { name: message('play_reward_new') })).toHaveCount(0);
		const earned = firstWorld.lessons.map((lesson) => itemOf(lesson.id).id);
		await expect
			.poll(async () => (await stored(page, child)).earnedRewardIds)
			.toEqual(expect.arrayContaining([...earned, FIRST_WORLD_SKILL?.id]));
	});

	test('asks for help on a key that became hard, plays the quest up to the thanks, then stops asking', async ({
		page
	}) => {
		const child = profileWithFragileKey('Kim');
		const key = FRAGILE_KEY.toLocaleUpperCase('fr');
		await reachMapAs(page, child);
		await expect(helpBubble(page, key)).toBeVisible();

		await button(page, message('play_help_later')).click();
		await expect(helpBubble(page, key)).toHaveCount(0);
		await button(page, message('play_settings_open')).click();
		await button(page, message('settings_back')).click();
		await expect(helpBubble(page, key)).toBeVisible();

		await activateByTab(page, button(page, message('play_help_yes')));
		await typeToEnd(page, message('play_help_back'));
		await expect(heading(page, message('play_help_thanks'))).toBeVisible();
		await expect(page.locator('.photo')).toHaveCount(0);
		await expect(page.getByText(/%/)).toHaveCount(0);
		await expect(button(page, message('play_companion_open'))).toBeVisible();

		await expect
			.poll(async () => {
				const record = await stored(page, child);
				return {
					lessons: record.progress.lessons,
					attempts: (record.progress.chars[FRAGILE_KEY]?.attempts ?? 0) > FRAGILE.attempts,
					helpQuest: record.helpQuest
				};
			})
			.toEqual({
				lessons: child.progress.lessons,
				attempts: true,
				helpQuest: { char: FRAGILE_KEY, lessonPlays: 1 }
			});

		await activateByTab(page, button(page, message('play_help_back')));
		await expect(heading(page, message('play_map_title'))).toBeVisible();
		await expect(helpBubble(page, key)).toHaveCount(0);
	});

	test('leaves a help quest for the map without keeping anything', async ({ page }) => {
		const child = profileWithFragileKey('Noa');
		const key = FRAGILE_KEY.toLocaleUpperCase('fr');
		await reachMapAs(page, child);
		await button(page, message('play_help_yes')).click();
		await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
		await page.keyboard.press('Escape');
		await button(page, message('game_shared_quit')).click();
		await expect(heading(page, message('play_map_title'))).toBeVisible();
		await expect(helpBubble(page, key)).toBeVisible();
		const record = await stored(page, child);
		expect(record.helpQuest).toBeNull();
		expect(record.progress.chars[FRAGILE_KEY]?.attempts).toBe(FRAGILE.attempts);
	});
});

for (const colorScheme of COLOR_SCHEMES) {
	test.describe(`companion and rewards, ${colorScheme} theme`, () => {
		test.use({ colorScheme });

		test('has no axe violation on the prize, the news, the name and the companion screen', async ({
			page
		}) => {
			test.slow();
			await reachMapAs(page, advancedProfile({ name: 'Axel', passed: {} }));
			await page.getByRole('button', { name: FIRST.title }).click();
			await expect(page.locator('[data-prize]')).toBeVisible();
			await expectNoAxeViolation(page);

			await page.locator('button[data-proposed]').click();
			await typeToEnd(page, message('play_result_map'));
			await expect(
				page.getByRole('heading', { name: message('play_reward_name_question') })
			).toBeVisible();
			await expectNoAxeViolation(page);
			await button(page, message('play_companion_name_submit')).click();
			await expect(page.getByRole('alert').first()).toHaveText(
				message('play_companion_name_error_empty')
			);
			await expectNoAxeViolation(page);

			await button(page, message('play_companion_open')).click();
			await expect(heading(page, message('play_companion_title'))).toBeVisible();
			await expectNoAxeViolation(page);
		});

		test('has no axe violation on the help bubble and on the thanks', async ({ page }) => {
			test.slow();
			await reachMapAs(page, profileWithFragileKey('Ivy'));
			await expect(helpBubble(page, FRAGILE_KEY.toLocaleUpperCase('fr'))).toBeVisible();
			await expectNoAxeViolation(page);

			await button(page, message('play_help_yes')).click();
			await typeToEnd(page, message('play_help_back'));
			await expect(heading(page, message('play_help_thanks'))).toBeVisible();
			await expectNoAxeViolation(page);
		});
	});
}
