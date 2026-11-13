import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { parseRewardCatalogue, type RewardDefinition } from '../src/lib/engine/rewards';
import type { StarCount } from '../src/lib/engine/progression/types';
import type { Profile } from '../src/lib/state/types';
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
const PLAY_URL = '/jouer';
const PRESS_BUDGET = 40;
const PASSED_STARS: StarCount = 3;

interface Lesson {
	id: string;
	title: string;
}

const { message } = loadMessages();
const worlds = readJson<{ worlds: { id: string; lessons: Lesson[] }[] }>(
	'content/fr/progression/azerty-decouverte.json'
).worlds;
const catalogue = parseRewardCatalogue(readJson('content/fr/rewards/azerty-decouverte.json'));
const rules = readJson<{ places: string[]; decorations: Record<string, string[]> }>(
	'content/common/hideout.json'
);
const firstWorld = worlds[0]?.lessons ?? [];

const PLACE_NAMES: Record<string, string> = {
	ceiling: message('play_hideout_place_ceiling'),
	wall: message('play_hideout_place_wall'),
	pegs: message('play_hideout_place_pegs'),
	window: message('play_hideout_place_window'),
	shelf: message('play_hideout_place_shelf'),
	'coat-stand': message('play_hideout_place_coat_stand'),
	chest: message('play_hideout_place_chest'),
	desk: message('play_hideout_place_desk'),
	rug: message('play_hideout_place_rug'),
	corner: message('play_hideout_place_corner')
};

function placeName(place: string): string {
	return PLACE_NAMES[place] ?? place;
}

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

/** What the first world gives, in the order of the catalogue. */
const FIRST_WORLD_ITEMS = firstWorld.map((lesson) => itemOf(lesson.id));

/** The first object of the first world that fits a place, as the screen lists them. */
function firstFitting(place: string): RewardDefinition {
	const reward = catalogue.rewards.find(
		(candidate) =>
			FIRST_WORLD_ITEMS.includes(candidate) &&
			(rules.decorations[candidate.artId] ?? []).includes(place)
	);
	if (!reward) throw new Error(`Nothing of the first world fits ${place}`);
	return reward;
}

function inSentence(title: string): string {
	return title.charAt(0).toLocaleLowerCase('fr') + title.slice(1);
}

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function placeButton(page: Page, place: string): Locator {
	return page.locator(`button[data-place="${place}"]`);
}

function sceneObject(page: Page, place: string): Locator {
	return page.locator(`[data-hideout-scene] [data-place-object="${place}"]`);
}

/** A child who has passed the lessons of the first world. */
function firstWorldDone(name: string): Profile {
	return advancedProfile({
		name,
		passed: Object.fromEntries(firstWorld.map((lesson) => [lesson.id, PASSED_STARS]))
	});
}

async function reachMapAs(page: Page, profile: Profile) {
	await openPage(page, PLAY_URL);
	await installProfile(page, profile);
	await reloadPage(page);
	await page.getByRole('button', { name: profile.name }).click();
	await expect(heading(page, message('play_map_title'))).toBeVisible();
}

async function openHideout(page: Page) {
	await button(page, message('play_hideout_open')).click();
	await expect(heading(page, message('play_hideout_title'))).toBeVisible();
}

async function focusByTab(page: Page, target: Locator) {
	await expect(target).toBeVisible();
	for (let press = 0; press < PRESS_BUDGET; press++) {
		if (await target.evaluate((element) => element === document.activeElement)) return;
		await page.keyboard.press('Tab');
	}
	throw new Error('The element cannot be reached with the Tab key');
}

/** From the place under the keyboard focus, the arrows walk to another place. */
async function walkTo(page: Page, from: string, to: string) {
	const steps = rules.places.indexOf(to) - rules.places.indexOf(from);
	for (let step = 0; step < Math.abs(steps); step++) {
		await page.keyboard.press(steps > 0 ? 'ArrowRight' : 'ArrowLeft');
	}
	await expect(placeButton(page, to)).toBeFocused();
}

async function expectNoAxeViolation(page: Page) {
	await page.evaluate(() => document.fonts.ready);
	const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
	expect(results.violations).toEqual([]);
}

test.describe('the hideout', () => {
	test('sets down two objects with the keyboard, takes one away and keeps it after a reload', async ({
		page
	}) => {
		test.slow();
		const child = firstWorldDone('Nour');
		const onPegs = firstFitting('pegs');
		const onWindow = firstFitting('window');
		await reachMapAs(page, child);
		await openHideout(page);
		await expect(sceneObject(page, 'pegs')).toHaveCount(0);

		const first = rules.places[0] ?? '';
		await focusByTab(page, placeButton(page, first));
		await walkTo(page, first, 'pegs');
		await expect(page.locator('[data-hideout-scene] [data-mark="pegs"]')).toHaveCount(1);
		await page.keyboard.press('Enter');
		const chosen = page.getByRole('heading', { level: 2 });
		await expect(chosen).toBeFocused();
		await expect(chosen).toHaveText(
			message('play_hideout_place_free', { place: placeName('pegs') })
		);
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');
		const pegsObject = page.locator(`button[data-object="${onPegs.id}"]`);
		await expect(pegsObject).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(pegsObject).toHaveAttribute('aria-pressed', 'true');
		await expect(page.getByRole('status')).toHaveText(
			message('play_hideout_done_put', {
				place: placeName('pegs'),
				item: inSentence(onPegs.title)
			})
		);
		await expect(
			sceneObject(page, 'pegs').locator(`[data-decoration="${onPegs.artId}"]`)
		).toHaveCount(1);

		// Escape goes back to the places, on the place just changed.
		await page.keyboard.press('Escape');
		await expect(placeButton(page, 'pegs')).toBeFocused();
		await expect(placeButton(page, 'pegs')).toHaveAccessibleName(
			message('play_hideout_place_with', {
				place: placeName('pegs'),
				item: inSentence(onPegs.title)
			})
		);

		await walkTo(page, 'pegs', 'window');
		await page.keyboard.press('Enter');
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');
		await expect(page.locator(`button[data-object="${onWindow.id}"]`)).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(sceneObject(page, 'window')).toHaveCount(1);

		// Shift+Tab reaches « Retirer l'objet », now that the window holds something.
		await page.keyboard.press('Shift+Tab');
		await expect(button(page, message('play_hideout_remove'))).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(sceneObject(page, 'window')).toHaveCount(0);
		await expect(page.getByRole('status')).toHaveText(
			message('play_hideout_done_remove', { place: placeName('window') })
		);

		await page.keyboard.press('Escape');
		await expect(placeButton(page, 'window')).toBeFocused();
		await page.keyboard.press('Escape');
		await expect(heading(page, message('play_map_title'))).toBeVisible();
		await expect
			.poll(async () => (await storedRecord(page, child))?.['hideout'])
			.toEqual({ pegs: onPegs.id });

		// The last player comes back on the map at once.
		await reloadPage(page);
		await expect(heading(page, message('play_map_title'))).toBeVisible();
		await openHideout(page);
		await expect(
			sceneObject(page, 'pegs').locator(`[data-decoration="${onPegs.artId}"]`)
		).toHaveCount(1);
		await expect(sceneObject(page, 'window')).toHaveCount(0);
	});

	test('welcomes a new child in an empty cabin, with nothing to unlock in sight', async ({
		page
	}) => {
		await reachMapAs(page, advancedProfile({ name: 'Iris', passed: {} }));
		await openHideout(page);
		await expect(page.getByText(message('play_hideout_welcome'))).toBeVisible();
		await expect(page.locator('[data-place-object]')).toHaveCount(0);
		await expect(
			page.locator('[data-silhouette], [data-owned="false"], [data-locked]')
		).toHaveCount(0);
		for (const place of rules.places) {
			await expect(placeButton(page, place)).toHaveAccessibleName(
				message('play_hideout_place_free', { place: placeName(place) })
			);
		}
		await placeButton(page, 'shelf').click();
		await expect(page.getByText(message('play_hideout_nothing_fits'))).toBeVisible();
		await expect(page.locator('button[data-object]')).toHaveCount(0);
		await button(page, message('play_hideout_other_place')).click();
		await expect(placeButton(page, 'shelf')).toBeFocused();
	});

	test('offers the hideout from the map only', async ({ page }) => {
		await reachMapAs(page, firstWorldDone('Sacha'));
		await expect(button(page, message('play_hideout_open'))).toBeVisible();
		const lesson = firstWorld[0] as Lesson;
		await page.getByRole('button', { name: lesson.title }).click();
		await throughStory(page, heading(page, lesson.title));
		await expect(button(page, message('play_companion_open'))).toBeVisible();
		await expect(button(page, message('play_hideout_open'))).toHaveCount(0);
	});
});

for (const colorScheme of COLOR_SCHEMES) {
	test.describe(`the hideout, ${colorScheme} theme`, () => {
		test.use({ colorScheme });

		test('has no axe violation on the places and on the choice of an object', async ({ page }) => {
			await reachMapAs(page, firstWorldDone('Axelle'));
			await openHideout(page);
			await expectNoAxeViolation(page);
			await placeButton(page, 'pegs').click();
			await page.locator(`button[data-object="${firstFitting('pegs').id}"]`).click();
			await expect(sceneObject(page, 'pegs')).toHaveCount(1);
			await expectNoAxeViolation(page);
		});
	});
}
