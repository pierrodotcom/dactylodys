import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import type { GhostRun } from '../src/lib/engine/ghost/types';
import type { StarCount } from '../src/lib/engine/progression/types';
import { withGhost } from '../src/lib/state/profile';
import type { Profile } from '../src/lib/state/types';
import {
	advancedProfile,
	installProfile,
	loadMessages,
	openPage,
	readJson,
	reloadPage,
	shortenRewards,
	throughStory
} from './support';

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;
const PLAYER_NAME = 'Fantomette';
const PASSED: StarCount = 3;
const STEP_TIMEOUT = 15_000;
/** Enter moves on to the next group while the reward is on screen. */
const SKIP_KEY = 'Enter';
const PRESS_BUDGET = 60;

/** Done with the whole exercise in a few milliseconds: always first. */
const SWIFT_RUN: GhostRun = {
	recordedAt: 1,
	charCount: 20,
	activeMs: 5,
	points: [{ correctChars: 20, activeMs: 5 }]
};
/** Ten minutes for twenty characters: always last. */
const SLOW_RUN: GhostRun = {
	recordedAt: 1,
	charCount: 20,
	activeMs: 600_000,
	points: [{ correctChars: 20, activeMs: 600_000 }]
};

interface Lesson {
	id: string;
	title: string;
}

const { message, templateRegex } = loadMessages();
const worlds = readJson<{ worlds: { lessons: Lesson[] }[] }>(
	'content/fr/progression/azerty-decouverte.json'
).worlds;
const [FIRST, SECOND] = (worlds[0]?.lessons ?? []) as [Lesson, Lesson];
const GROUP_LABEL = templateRegex('ui_target_text_label');

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function raceChoice(page: Page): Locator {
	return page.getByRole('checkbox', { name: new RegExp(message('play_intro_race')) });
}

function track(page: Page): Locator {
	return page.getByRole('img', { name: message('game_shared_race_label') });
}

function groupLabel(page: Page): Locator {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

function finaleButton(page: Page): Locator {
	return button(page, message('game_shared_finale_continue'));
}

function resultMapButton(page: Page): Locator {
	return button(page, message('play_result_map'));
}

/** A child who passed the first lesson, with the pace of that play kept when `run` is given. */
function racer(run?: GhostRun): Profile {
	const profile = advancedProfile({ name: PLAYER_NAME, passed: { [FIRST.id]: PASSED } });
	return run ? withGhost(profile, FIRST.id, run) : profile;
}

async function reachIntro(page: Page, profile: Profile, lesson: Lesson = FIRST) {
	await openPage(page, '/jouer');
	await installProfile(page, profile);
	await reloadPage(page);
	await page.getByRole('button', { name: profile.name }).click();
	await expect(heading(page, message('play_map_title'))).toBeVisible();
	await page.getByRole('button', { name: lesson.title }).click();
	await throughStory(page, heading(page, lesson.title));
}

async function startRace(page: Page) {
	await raceChoice(page).check();
	await page.locator('button[data-proposed]').click();
	await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
}

async function currentGroup(page: Page): Promise<string> {
	const label = groupLabel(page);
	await expect(label).toHaveText(GROUP_LABEL);
	return GROUP_LABEL.exec((await label.textContent()) ?? '')?.groups?.['text'] ?? '';
}

async function nextStep(page: Page): Promise<'group' | 'over'> {
	const found: { step?: 'group' | 'over' } = {};
	await expect(async () => {
		if ((await resultMapButton(page).isVisible()) || (await finaleButton(page).isVisible())) {
			found.step = 'over';
		} else if ((await groupLabel(page).allTextContents()).some((text) => GROUP_LABEL.test(text))) {
			found.step = 'group';
		}
		expect(found.step).toBeDefined();
	}).toPass({ timeout: STEP_TIMEOUT });
	return found.step ?? 'over';
}

/** Types every group up to the result; `afterFirst` runs once the first group is typed. */
async function typeToResult(page: Page, afterFirst?: () => Promise<void>) {
	for (let index = 0; ; index++) {
		await page.keyboard.type(await currentGroup(page));
		if (index === 0) await afterFirst?.();
		await page.keyboard.press(SKIP_KEY);
		if ((await nextStep(page)) === 'over') break;
	}
	if (await finaleButton(page).isVisible()) await finaleButton(page).click();
	await expect(resultMapButton(page)).toBeVisible();
}

async function expectNoAxeViolation(page: Page) {
	await page.evaluate(() => document.fonts.ready);
	const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
	expect(results.violations).toEqual([]);
}

test.beforeEach(async ({ page }) => {
	await shortenRewards(page);
});

test.describe('race against the ghost', () => {
	test('is offered, switched off, only on a passed lesson whose pace was kept', async ({
		page
	}) => {
		await reachIntro(page, racer(SLOW_RUN));
		await expect(raceChoice(page)).toBeVisible();
		await expect(raceChoice(page)).not.toBeChecked();

		await button(page, message('play_intro_back')).click();
		await page.getByRole('button', { name: SECOND.title }).click();
		await throughStory(page, heading(page, SECOND.title));
		await expect(page.locator('button[data-proposed]')).toBeVisible();
		await expect(raceChoice(page)).toHaveCount(0);
	});

	test('is not offered when no pace was kept for the lesson', async ({ page }) => {
		await reachIntro(page, racer());
		await expect(page.locator('button[data-proposed]')).toBeVisible();
		await expect(raceChoice(page)).toHaveCount(0);
	});

	test('plays the lesson without a ghost when the child does not switch it on', async ({
		page
	}) => {
		await reachIntro(page, racer(SLOW_RUN));
		await page.locator('button[data-proposed]').click();
		await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
		await expect(track(page)).toHaveCount(0);
	});

	test('lets a ghost that arrives first wait, and says on the result that it came first', async ({
		page
	}) => {
		await reachIntro(page, racer(SWIFT_RUN));
		await startRace(page);
		await expect(track(page)).toBeVisible();
		await typeToResult(page, async () => {
			await expect(page.locator('[data-ghost-share="done"]')).toBeAttached();
		});
		await expect(page.getByText(message('play_result_race_ghost'))).toBeVisible();
		await expect(page.getByText(message('play_result_race_child'))).toHaveCount(0);
	});

	test('says the child typed faster than before when they arrive first', async ({ page }) => {
		await reachIntro(page, racer(SLOW_RUN));
		await startRace(page);
		await typeToResult(page, async () => {
			await expect(page.locator('[data-ghost-share="running"]')).toBeAttached();
		});
		await expect(page.getByText(message('play_result_race_child'))).toBeVisible();
	});

	test('goes on without the ghost from the pause, and says nothing of a race', async ({ page }) => {
		await reachIntro(page, racer(SLOW_RUN));
		await startRace(page);
		await page.keyboard.press('Escape');
		await button(page, message('game_shared_race_leave')).click();
		await expect(track(page)).toHaveCount(0);
		await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
		await typeToResult(page);
		await expect(page.getByText(message('play_result_race_child'))).toHaveCount(0);
		await expect(page.getByText(message('play_result_race_ghost'))).toHaveCount(0);
	});

	test('does not keep the race for a replay from the result', async ({ page }) => {
		await reachIntro(page, racer(SLOW_RUN));
		await startRace(page);
		await typeToResult(page);
		await button(page, message('play_result_replay')).click();
		await throughStory(page, groupLabel(page));
		await expect(groupLabel(page)).toHaveText(GROUP_LABEL);
		await expect(track(page)).toHaveCount(0);
	});

	test('is switched on and started with the keyboard alone', async ({ page }) => {
		await reachIntro(page, racer(SLOW_RUN));
		const choice = raceChoice(page);
		await expect(choice).toBeVisible();
		for (let press = 0; press < PRESS_BUDGET; press++) {
			if (await choice.evaluate((element) => element === document.activeElement)) break;
			await page.keyboard.press('Tab');
		}
		await expect(choice).toBeFocused();
		await page.keyboard.press('Space');
		await expect(choice).toBeChecked();
		await page.locator('button[data-proposed]').focus();
		await page.keyboard.press('Enter');
		await expect(track(page)).toBeVisible();
	});

	for (const colorScheme of COLOR_SCHEMES) {
		test(`passes axe on the race choice and during the race, ${colorScheme}`, async ({ page }) => {
			await page.emulateMedia({ colorScheme });
			await reachIntro(page, racer(SLOW_RUN));
			await expect(raceChoice(page)).toBeVisible();
			await expectNoAxeViolation(page);
			await startRace(page);
			await expect(track(page)).toBeVisible();
			await expectNoAxeViolation(page);
		});
	}
});
