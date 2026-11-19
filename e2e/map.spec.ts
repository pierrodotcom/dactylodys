import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import type { StarCount } from '../src/lib/engine/progression/types';
import type { Profile } from '../src/lib/state/types';
import { CHROMIUM_ONLY } from './engines';
import {
	advancedProfile,
	expectNoAxeViolation,
	installProfile,
	loadMessages,
	openPage,
	readJson,
	reloadPage,
	storedRecord,
	throughStory,
	type StoredFormat
} from './support';

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const PLAY_URL = '/jouer';
const PASSED_STARS: StarCount = 2;
/** How far, in pixels, the middle of the companion may sit from the middle of its lesson. */
const LEVEL_TOLERANCE = 2;
/** Shift+Tab presses from the chosen lesson to the top bar: the story button, then the bar. */
const TOP_BAR_BUDGET = 6;

interface Lesson {
	id: string;
	title: string;
	optional?: boolean;
}

interface World {
	id: string;
	title: string;
	lessons: Lesson[];
}

const { message } = loadMessages();
const worlds = readJson<{ worlds: World[] }>(
	'content/fr/progression/azerty-decouverte.json'
).worlds;
const lessons = worlds.flatMap((world) => world.lessons);
const firstWorldSize = worlds[0]?.lessons.length ?? 0;
/** The whole first world and the first lesson of the second are passed: eight lessons are open. */
const PASSED = lessons.slice(0, firstWorldSize + 1);
const OPEN = lessons.slice(0, PASSED.length + 1);

function lessonAt(index: number): Lesson {
	const lesson = OPEN[index];
	if (!lesson) throw new Error(`No open lesson at ${index}`);
	return lesson;
}

const FIRST = lessonAt(0);
const PROPOSED = lessonAt(OPEN.length - 1);
const LAST_OF_FIRST_WORLD = lessonAt(firstWorldSize - 1);
const FIRST_OF_SECOND_WORLD = lessonAt(firstWorldSize);

function profileOf(name: string, edit: (profile: Profile) => Profile = (profile) => profile) {
	return edit(
		advancedProfile({
			name,
			passed: Object.fromEntries(PASSED.map((lesson) => [lesson.id, PASSED_STARS]))
		})
	);
}

async function reachMapAs(page: Page, profile: Profile, format: StoredFormat = 'current') {
	await openPage(page, PLAY_URL);
	await installProfile(page, profile, format);
	await reloadPage(page);
	await page.getByRole('button', { name: profile.name }).click();
	await expect(page.getByRole('heading', { name: message('play_map_title') })).toBeVisible();
}

function lessonButton(page: Page, lesson: Lesson): Locator {
	return page.getByRole('listitem').filter({ hasText: lesson.title }).getByRole('button');
}

function walker(page: Page): Locator {
	return page.locator('[data-map-companion]');
}

/** The companion stands on this lesson: its stop is marked, and it is drawn level with it. */
async function expectCompanionOn(page: Page, lesson: Lesson) {
	const stop = page.locator('li[data-companion]');
	await expect(stop).toHaveCount(1);
	await expect(stop).toContainText(lesson.title);
	await expect
		.poll(async () => {
			const [own, beside] = await Promise.all([
				walker(page).boundingBox(),
				lessonButton(page, lesson).boundingBox()
			]);
			if (!own || !beside) return Infinity;
			return Math.abs(own.y + own.height / 2 - (beside.y + beside.height / 2));
		})
		.toBeLessThanOrEqual(LEVEL_TOLERANCE);
}

async function expectChosen(page: Page, lesson: Lesson) {
	await expect(lessonButton(page, lesson)).toBeFocused();
	await expectCompanionOn(page, lesson);
}

test.describe('map walked with the arrows', () => {
	test('opens on the proposed lesson, focused, with the companion beside it', async ({ page }) => {
		await reachMapAs(page, profileOf('Lumi'));

		await expectChosen(page, PROPOSED);
		await expect(walker(page)).toBeVisible();
		await expect(page.getByText(message('play_map_keys_hint'))).toHaveCount(1);
	});

	test('shows no key hint while a single lesson is open', CHROMIUM_ONLY, async ({ page }) => {
		await reachMapAs(page, advancedProfile({ name: 'Noa', passed: {} }));

		await expectChosen(page, FIRST);
		await expect(page.locator('[data-keys-hint]')).toHaveCount(0);
	});

	test('shows the up and down keys once two lessons are open', CHROMIUM_ONLY, async ({ page }) => {
		const hint = page.locator('[data-keys-hint]');
		await reachMapAs(page, advancedProfile({ name: 'Ilo', passed: { [FIRST.id]: PASSED_STARS } }));

		await expect(hint).toHaveCount(1);
		await expect(hint).toContainText(message('play_map_keys_hint'));
		const arrows = await hint
			.locator('[data-arrow]')
			.evaluateAll((items) => items.map((item) => item.getAttribute('data-arrow')));
		expect(arrows).toEqual(['up', 'down']);
	});

	test('walks the focus and the companion with the arrows, from one world to the next', async ({
		page
	}) => {
		await reachMapAs(page, profileOf('Lumi'));

		await page.keyboard.press('ArrowLeft');
		await expectChosen(page, FIRST_OF_SECOND_WORLD);
		await page.keyboard.press('ArrowUp');
		await expectChosen(page, LAST_OF_FIRST_WORLD);
		await page.keyboard.press('ArrowRight');
		await expectChosen(page, FIRST_OF_SECOND_WORLD);
		await page.keyboard.press('ArrowDown');
		await expectChosen(page, PROPOSED);
	});

	test('steps over locked lessons and stops at the ends, Home and End going there', async ({
		page
	}) => {
		await reachMapAs(page, profileOf('Lumi'));

		await page.keyboard.press('ArrowRight');
		await expectChosen(page, PROPOSED);
		await page.keyboard.press('Home');
		await expectChosen(page, FIRST);
		await page.keyboard.press('ArrowLeft');
		await expectChosen(page, FIRST);
		await page.keyboard.press('End');
		await expectChosen(page, PROPOSED);
	});

	test('opens the lesson chosen with the arrows with Enter, and with Space', async ({ page }) => {
		const second = lessonAt(1);
		await reachMapAs(page, profileOf('Lumi'));

		await page.keyboard.press('Home');
		await page.keyboard.press('ArrowRight');
		await expectChosen(page, second);
		await page.keyboard.press('Enter');
		const title = page.getByRole('heading', { name: second.title });
		await throughStory(page, title, { keyboard: true });
		await expect(title).toBeVisible();

		await page.getByRole('button', { name: message('play_intro_back') }).click();
		await expectChosen(page, PROPOSED);
		await page.keyboard.press('ArrowLeft');
		await page.keyboard.press(' ');
		await throughStory(page, page.getByRole('heading', { name: FIRST_OF_SECOND_WORLD.title }));
	});

	test('puts the map in the Tab order once, on the lesson where the companion stands', async ({
		page
	}) => {
		await reachMapAs(page, profileOf('Lumi'));
		const reachable = page.locator('ol button[tabindex="0"]');
		await expect(reachable).toHaveCount(1);

		await page.keyboard.press('Home');
		await page.keyboard.press('ArrowRight');
		await page.keyboard.press('ArrowRight');
		const chosen = lessonAt(2);
		await expectChosen(page, chosen);
		await expect(reachable).toHaveCount(1);

		await page.keyboard.press('Shift+Tab');
		await expect(
			page.getByRole('button', { name: message('play_story_so_far_open') })
		).toBeFocused();
		await page.keyboard.press('Tab');
		await expectChosen(page, chosen);

		// Going back up (Firefox leaves the page after its last element, L-056): no other lesson
		// on the way, up to the top bar.
		const settings = page.getByRole('button', { name: message('play_settings_open') });
		const inTheMap = () => page.evaluate(() => document.activeElement?.closest('ol') !== null);
		for (let press = 0; press < TOP_BAR_BUDGET; press++) {
			await page.keyboard.press('Shift+Tab');
			expect(await inTheMap()).toBe(false);
			if (await settings.evaluate((element) => element === document.activeElement)) break;
		}
		await expect(settings).toBeFocused();
	});

	test(
		'places the companion at once with calm motion, from the profile setting',
		CHROMIUM_ONLY,
		async ({ page }) => {
			await reachMapAs(
				page,
				profileOf('Calme', (profile) => ({
					...profile,
					settings: { ...profile.settings, motion: 'reduced' }
				}))
			);

			await expect(walker(page)).toHaveAttribute('data-still');
			await page.keyboard.press('Home');
			await expect(walker(page)).toHaveCSS('transition-property', 'none');
			await expectChosen(page, FIRST);
		}
	);

	test('passes axe with the walking companion and the key hint, light and dark themes', async ({
		page
	}) => {
		await reachMapAs(page, profileOf('Lumi'));
		await page.keyboard.press('ArrowLeft');
		await expectChosen(page, FIRST_OF_SECOND_WORLD);

		await expectNoAxeViolation(page);
	});
});

function worldOf(slug: string): World {
	const world = worlds.find((item) => item.id === `fr.world.${slug}`);
	if (!world) throw new Error(`No world ${slug}`);
	return world;
}

function lessonOf(slug: string): Lesson {
	const lesson = lessons.find((item) => item.id === `fr.lesson.${slug}`);
	if (!lesson) throw new Error(`No lesson ${slug}`);
	return lesson;
}

function row(page: Page, lesson: Lesson): Locator {
	return page.getByRole('listitem').filter({ hasText: lesson.title });
}

function passedProfile(name: string, passed: readonly Lesson[]): Profile {
	return advancedProfile({
		name,
		passed: Object.fromEntries(passed.map((lesson) => [lesson.id, PASSED_STARS]))
	});
}

test.describe('a child on the way when the order of the lessons changed (ADR-075)', () => {
	/**
	 * The former order: dinosaurs, kitchen, then the zoo before the stars. The child passed its
	 * first fourteen lessons, up to « y x », and was about to play « z w ».
	 */
	const zoo = worldOf('animaux').lessons;
	const formerFourteen = [
		...worldOf('dinosaures').lessons,
		...worldOf('cuisine').lessons,
		...zoo.slice(0, 3)
	];
	const aboutToPlay = zoo[3] as Lesson;
	const stars = worldOf('espace').lessons;
	const child = passedProfile('Mila', formerFourteen);

	test('finds everything it had, and knows what to play', async ({ page }) => {
		const failures: string[] = [];
		page.on('pageerror', (error) => failures.push(error.message));
		expect(formerFourteen).toHaveLength(14);
		await reachMapAs(page, child, 'version-14');

		await expect(page.getByRole('alert')).toHaveCount(0);
		// Nothing lost: the fourteen lessons are done, with their stars.
		for (const lesson of formerFourteen) {
			await expect(row(page, lesson)).toContainText(message('play_lesson_done'));
			await expect(
				row(page, lesson).getByRole('img', {
					name: message('ui_stars_other', { count: PASSED_STARS, total: 3 })
				})
			).toBeVisible();
		}
		// Nothing closed: the lesson it was about to play, and the four that now come before it.
		for (const lesson of [...stars, aboutToPlay]) {
			await expect(lessonButton(page, lesson)).toBeVisible();
			await expect(row(page, lesson)).toContainText(message('play_lesson_current'));
		}
		await expect(row(page, lessonOf('klaxon-question-exclamation'))).toContainText(
			message('play_lesson_locked')
		);
		// It knows what to play: the companion waits at the first lesson of the stars.
		await expectChosen(page, stars[0] as Lesson);
		await expect(page.getByRole('region', { name: worldOf('espace').title })).toContainText(
			message('play_world_current')
		);
		// A profile that is only opened is not written again.
		expect((await storedRecord(page, child))?.['schemaVersion']).toBe(14);
		expect(failures).toEqual([]);
	});

	test('walks to the lesson it was about to play and opens it, at the keyboard alone', async ({
		page
	}) => {
		await reachMapAs(page, child, 'version-14');
		await expectChosen(page, stars[0] as Lesson);

		await page.keyboard.press('End');
		await expectChosen(page, aboutToPlay);
		await page.keyboard.press('Enter');
		const title = page.getByRole('heading', { name: aboutToPlay.title });
		await throughStory(page, title, { keyboard: true });
		await expect(title).toBeVisible();
	});
});

test.describe('the detours of the rare accents on the map', () => {
	const vehicles = worldOf('vehicules');
	const [firstDetour, secondDetour] = vehicles.lessons.filter((lesson) => lesson.optional) as [
		Lesson,
		Lesson
	];
	const lastOnTheWay = vehicles.lessons.filter((lesson) => !lesson.optional).at(-1) as Lesson;
	const post = worldOf('poste').lessons[0] as Lesson;
	/** Every lesson on the way up to the last one of the vehicles; no detour played. */
	const child = passedProfile(
		'Sacha',
		lessons.slice(0, lessons.indexOf(lastOnTheWay) + 1).filter((lesson) => !lesson.optional)
	);
	const numberOf = (lesson: Lesson) => lessons.filter((item) => !item.optional).indexOf(lesson) + 1;

	test(
		'opens the last world without them, and shows them as a way to go further',
		CHROMIUM_ONLY,
		async ({ page }) => {
			await reachMapAs(page, child);

			// The way goes on: the companion waits at the first lesson of the last world.
			await expectChosen(page, post);
			await expect(row(page, post)).toContainText(message('play_lesson_current'));
			// No number is missing on the way, and a detour has none.
			await expect(row(page, lastOnTheWay)).toContainText(
				message('play_lesson_number', { number: numberOf(lastOnTheWay) })
			);
			await expect(row(page, post)).toContainText(
				message('play_lesson_number', { number: numberOf(lastOnTheWay) + 1 })
			);
			for (const detour of [firstDetour, secondDetour]) {
				await expect(row(page, detour)).toContainText(message('play_lesson_detour'));
				await expect(row(page, detour)).not.toContainText(/Leçon \d/);
			}
			// Offered, never asked: the first one is open, as a wish; the second one waits for it.
			await expect(lessonButton(page, firstDetour)).toBeVisible();
			await expect(row(page, firstDetour)).toContainText(message('play_lesson_detour_open'));
			await expect(row(page, firstDetour)).not.toContainText(message('play_lesson_current'));
			await expect(row(page, secondDetour)).toContainText(message('play_lesson_locked'));
		}
	);

	test('walks to a detour with the arrows and opens it, at the keyboard alone', async ({
		page
	}) => {
		await reachMapAs(page, child);
		await expectChosen(page, post);

		await page.keyboard.press('ArrowUp');
		await expectChosen(page, firstDetour);
		await page.keyboard.press('Enter');
		const title = page.getByRole('heading', { name: firstDetour.title });
		await throughStory(page, title, { keyboard: true });
		await expect(title).toBeVisible();
		await expect(page.getByText(message('play_lesson_detour'))).toBeVisible();

		await page.getByRole('button', { name: message('play_intro_back') }).click();
		await expectChosen(page, post);
	});

	test('passes axe on the map with an open detour, light and dark themes', async ({ page }) => {
		await reachMapAs(page, child);
		await page.keyboard.press('ArrowUp');
		await expectChosen(page, firstDetour);

		await expectNoAxeViolation(page);
	});
});
