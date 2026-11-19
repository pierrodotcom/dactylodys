import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { voiceKey } from '../src/lib/audio/voice-key';
import { toGraphemes } from '../src/lib/engine/graphemes';
import { updateSettings } from '../src/lib/state/profile';
import type { Profile, Settings } from '../src/lib/state/types';
import { CHROMIUM_ONLY } from './engines';
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

/*
 * The fingering the adult chooses with the occupational therapist (ADR-075, choice 6): two index
 * fingers or six fingers. The game names the finger of the profile, the hand shows it and folds the
 * others, and the screen before a lesson shows its short sentences instead of an instruction written
 * for ten fingers; the voice says only those short sentences, once recorded.
 */

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const { message, templateRegex } = loadMessages();
const GROUP_LABEL = templateRegex('ui_target_text_label');
const MANIFEST_URL = '**/voice/fr/manifest.json';

interface Lesson {
	id: string;
	title: string;
	intro: string;
	newChars: string[];
	steps?: { char: string; text: string }[];
	tour?: unknown;
}
const lessons = readJson<{ worlds: { lessons: Lesson[] }[] }>(
	'content/fr/progression/azerty-decouverte.json'
).worlds.flatMap((world) => world.lessons);

function lessonNamed(id: string): Lesson {
	const lesson = lessons.find((item) => item.id === id);
	if (!lesson) throw new Error(`Unknown lesson ${id}`);
	return lesson;
}
/** « Le nid du tricératops »: D and K, the middle fingers in ten fingers. */
const THIRD = lessonNamed('fr.lesson.nid-d-k');
/** « La mare »: S and L, whose instruction names the ring fingers. */
const FOURTH = lessonNamed('fr.lesson.mare-s-l');
/** The grand tour of the first world: no short sentence. */
const TOUR = lessonNamed('fr.lesson.grand-tour-dinosaures');
/** Three short sentences each, and two or three keys: the tallest screens before a lesson. */
const THREE_SENTENCES = [
	lessonNamed('fr.lesson.gateau-a-o'),
	lessonNamed('fr.lesson.virgule-point')
];
/** The screens a child plays on (ADR-085): a laptop, and a short one. */
const SCREENS = {
	laptop: { width: 1280, height: 720 },
	'short laptop': { width: 1366, height: 625 }
} as const;
/** A rounding of the browser, in CSS pixels. */
const SUBPIXEL = 1;
const gateNumbers = readJson<{ numbers: { value: number; words: string }[] }>(
	'content/fr/adult/gate-numbers.json'
).numbers;
const manifest = readJson<{ clips: Record<string, { file: string; durationMs: number }> }>(
	'static/voice/fr/manifest.json'
);

/** The keys of the third lesson on AZERTY, the finger two index fingers give them, by character. */
const LEFT_INDEX = message('ui_finger_left_index');
const RIGHT_INDEX = message('ui_finger_right_index');
const TWO_INDEX_FINGER: Readonly<Record<string, readonly [string, string]>> = {
	d: ['left-index', LEFT_INDEX],
	k: ['right-index', RIGHT_INDEX]
};

/** A child who passed the lessons before `lesson` in the first world, with these settings. */
function child(name: string, lesson: Lesson, settings: Partial<Settings> = {}): Profile {
	const before = lessons.slice(0, lessons.indexOf(lesson));
	const profile = advancedProfile({
		name,
		passed: Object.fromEntries(before.map((passed) => [passed.id, 3 as const]))
	});
	return updateSettings(profile, settings);
}

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

async function gateNumber(page: Page): Promise<number> {
	const words = (await page.locator('[data-gate-words]').textContent())?.trim();
	const number = gateNumbers.find((entry) => entry.words === words);
	if (!number) throw new Error(`unknown gate number: ${words}`);
	return number.value;
}

async function installChild(page: Page, profile: Profile) {
	await openPage(page, '/jouer');
	await installProfile(page, profile);
	await reloadPage(page);
}

async function reachMap(page: Page, name: string) {
	await openPage(page, '/jouer');
	const map = heading(page, message('play_map_title'));
	const player = button(page, name);
	await expect(map.or(player)).toBeVisible();
	if (await player.isVisible()) await player.click();
	await expect(map).toBeVisible();
}

async function openIntro(page: Page, lesson: Lesson) {
	await page.getByRole('listitem').filter({ hasText: lesson.title }).getByRole('button').click();
	await throughStory(page, heading(page, lesson.title));
}

function groupLabel(page: Page): Locator {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

async function currentGroup(page: Page): Promise<string> {
	const text = groupLabel(page);
	await expect(text).toHaveText(GROUP_LABEL);
	return GROUP_LABEL.exec((await text.textContent()) ?? '')?.groups?.['text'] ?? '';
}

/** Types the text right, from group to group, up to the first character `wanted` accepts. */
async function typeUpTo(page: Page, wanted: (char: string) => boolean): Promise<string> {
	for (;;) {
		const chars = toGraphemes(await currentGroup(page));
		const typed = await page
			.locator('.target-text')
			.first()
			.locator('.cell[data-state="done"]')
			.count();
		const at = chars.findIndex((char, index) => index >= typed && wanted(char));
		if (at >= 0) {
			await page.keyboard.type(chars.slice(typed, at).join(''));
			return chars[at] ?? '';
		}
		await page.keyboard.type(chars.slice(typed).join(''));
	}
}

/** The published voice, and a clip for each of these sentences besides. */
async function recordAlso(page: Page, texts: readonly string[]) {
	const added = texts.map((text) => {
		const key = voiceKey(text);
		return [key, { file: `${key}.mp3`, durationMs: 1000 }] as const;
	});
	const served = { ...manifest, clips: { ...manifest.clips, ...Object.fromEntries(added) } };
	await page.route(MANIFEST_URL, (route) => route.fulfill({ json: served }));
}

/** An audio element that notes the file it is asked to play, and plays until the test ends it. */
async function noteVoice(page: Page) {
	await page.addInitScript(() => {
		const played: string[] = [];
		const playing: EventTarget[] = [];
		class NotedAudio extends EventTarget {
			src: string;
			constructor(src = '') {
				super();
				this.src = src;
			}
			play() {
				played.push(this.src);
				playing.push(this);
				return Promise.resolve();
			}
			pause() {}
		}
		Object.assign(window, {
			Audio: NotedAudio,
			playedSounds: played,
			endVoice: () => playing.at(-1)?.dispatchEvent(new Event('ended'))
		});
	});
}

/** The files played for these sentences, in the order they were played. */
async function playedOf(page: Page, texts: readonly string[]): Promise<string[]> {
	const keys = texts.map(voiceKey);
	const played = await page.evaluate(
		() => (window as unknown as { playedSounds: string[] }).playedSounds
	);
	return played.map((url) => keys.find((key) => url.includes(key)) ?? '').filter(Boolean);
}

async function endVoice(page: Page) {
	await page.evaluate(() => (window as unknown as { endVoice: () => void }).endVoice());
}

/** The element is whole on the screen as it is scrolled now, and not under the bar of the player. */
async function expectInSight(page: Page, element: Locator) {
	await expect(element).toBeVisible();
	const box = await element.evaluate((node) => {
		const bar = document.querySelector('[data-top-bar][data-sticky]');
		const rect = node.getBoundingClientRect();
		return {
			top: rect.top,
			bottom: rect.bottom,
			barBottom: bar ? bar.getBoundingClientRect().bottom : 0,
			screenHeight: innerHeight
		};
	});
	expect(box.top).toBeGreaterThanOrEqual(box.barBottom - SUBPIXEL);
	expect(box.bottom).toBeLessThanOrEqual(box.screenHeight + SUBPIXEL);
}

const listen = (page: Page) =>
	page.getByRole('button', { name: message('ui_listen_start'), exact: true });
const stepsShown = (page: Page) => page.locator('[data-intro-steps] li');
const intro = (page: Page) => page.locator('[data-intro]');

test.describe('a reduced fingering chosen by the adult', () => {
	test('is chosen at the keyboard in the adult space, and kept for the child', async ({ page }) => {
		const profile = child('Ilyès', THIRD);
		await installChild(page, profile);

		await openPage(page, '/adulte');
		await page.locator('[data-gate-answer]').fill(String(await gateNumber(page)));
		await page.keyboard.press('Enter');
		await expect(page.locator('[data-adult-home]')).toBeVisible();
		await button(page, profile.name).click();
		await page.locator('[data-child-settings]').focus();
		await page.keyboard.press('Enter');
		await expect(
			heading(page, message('adult_settings_title', { name: profile.name }))
		).toBeVisible();

		const fingering = page.getByRole('group', { name: message('settings_fingering_label') });
		await expect(fingering).toContainText(message('settings_fingering_hint'));
		await expect(
			fingering.getByRole('radio', { name: message('settings_fingering_ten') })
		).toBeChecked();
		const twoIndex = fingering.getByRole('radio', {
			name: message('settings_fingering_two_index')
		});
		await twoIndex.focus();
		await page.keyboard.press('Space');
		await expect(twoIndex).toBeChecked();
		await expect(page.getByRole('status')).toHaveText(message('settings_saved'));
		await expect(page.locator('[data-fingering-changed]')).toHaveText(
			message('settings_fingering_changed')
		);
		await expect
			.poll(async () => (await storedRecord(page, profile))?.['settings'])
			.toMatchObject({ fingeringProfileId: 'two-index-iso' });
	});

	test('names the index and shows it with the hand, the lesson before and in the game', async ({
		page
	}) => {
		// Played from group to group without a reward to pass: the next one comes at once.
		await setRewards(page, 'instant');
		const profile = child('Elio', THIRD, { fingeringProfileId: 'two-index-iso' });
		await installChild(page, profile);
		await reachMap(page, profile.name);
		await openIntro(page, THIRD);
		// Before the lesson: its short sentences, no instruction written for ten fingers.
		await expect(stepsShown(page)).toHaveText((THIRD.steps ?? []).map((step) => step.text));
		await expect(intro(page)).toHaveCount(0);
		await expect(page.locator('[data-intro-keys] .finger-hint')).toHaveText([
			message('ui_finger_hint', { key: 'D', finger: LEFT_INDEX }),
			message('ui_finger_hint', { key: 'K', finger: RIGHT_INDEX })
		]);

		await page.locator('button[data-proposed]').click();
		await expect(page.locator('#game-input')).toBeFocused();
		const char = await typeUpTo(page, (typed) => Object.hasOwn(TWO_INDEX_FINGER, typed));
		const [finger, name] = TWO_INDEX_FINGER[char] ?? ['', ''];
		await expect(page.locator('.text-zone .finger-hint')).toHaveText(
			message('ui_finger_hint', { key: char.toUpperCase(), finger: name })
		);
		const hands = page.locator('.keyboard [data-hand-guide]');
		await expect(hands.locator(`[data-active="${finger}"]`)).toHaveCount(1);
		// The hand keeps its four fingers: those two index fingers do not use are folded.
		await expect(hands.locator('[data-folded]')).toHaveCount(6);
	});

	test(
		'is chosen by the adult only: the child does not see it',
		CHROMIUM_ONLY,
		async ({ page }) => {
			const profile = child('Maëlle', THIRD);
			await installChild(page, profile);
			await reachMap(page, profile.name);
			await button(page, message('play_settings_open')).click();
			await expect(heading(page, message('settings_title'))).toBeVisible();
			await expect(
				page.getByRole('group', { name: message('settings_fingering_label') })
			).toHaveCount(0);
		}
	);
});

test.describe('the screen before a lesson with a reduced fingering', () => {
	const STEPS = (FOURTH.steps ?? []).map((step) => step.text);

	test('says the short sentences once they are recorded, never the instruction', async ({
		page
	}) => {
		expect(STEPS.length).toBeGreaterThan(0);
		await noteVoice(page);
		await recordAlso(page, [FOURTH.intro, ...STEPS]);
		const profile = child('Nour', FOURTH, {
			fingeringProfileId: 'six-fingers-iso',
			voiceEnabled: true
		});
		await installChild(page, profile);
		await reachMap(page, profile.name);
		await openIntro(page, FOURTH);

		await expect(stepsShown(page)).toHaveText(STEPS);
		await expect(intro(page)).toHaveCount(0);
		await expect.poll(() => playedOf(page, STEPS)).toEqual([voiceKey(STEPS[0] ?? '')]);
		for (let said = 1; said < STEPS.length; said++) {
			await endVoice(page);
			await expect
				.poll(() => playedOf(page, STEPS))
				.toEqual(STEPS.slice(0, said + 1).map(voiceKey));
		}
		await endVoice(page);
		await expect(page.locator('[data-intro-keys]')).not.toHaveAttribute('data-intro-step');
		// The instruction names fingers the child may not use: it is never said.
		expect(await playedOf(page, [FOURTH.intro])).toEqual([]);
		await expect(listen(page)).toBeVisible();
	});

	test('stays silent while a short sentence is not recorded, the instruction neither', async ({
		page
	}) => {
		await noteVoice(page);
		await recordAlso(page, [FOURTH.intro, STEPS[0] ?? '']);
		const profile = child('Lisa', FOURTH, {
			fingeringProfileId: 'two-index-iso',
			voiceEnabled: true
		});
		await installChild(page, profile);
		await reachMap(page, profile.name);
		await openIntro(page, FOURTH);

		await expect(stepsShown(page)).toHaveText(STEPS);
		await expect(listen(page)).toHaveCount(0);
		await expect(page.locator('[data-proposed]')).toBeVisible();
		expect(await playedOf(page, [FOURTH.intro, ...STEPS])).toEqual([]);
	});

	test('keeps the instruction of a lesson without short sentences, silent', async ({ page }) => {
		expect(TOUR.steps ?? []).toEqual([]);
		await noteVoice(page);
		await recordAlso(page, [TOUR.intro]);
		const profile = child('Sacha', TOUR, {
			fingeringProfileId: 'two-index-iso',
			voiceEnabled: true
		});
		await installChild(page, profile);
		await reachMap(page, profile.name);
		await openIntro(page, TOUR);

		await expect(intro(page)).toHaveText(TOUR.intro);
		await expect(stepsShown(page)).toHaveCount(0);
		await expect(listen(page)).toHaveCount(0);
		await expect(page.locator('[data-proposed]')).toBeVisible();
		expect(await playedOf(page, [TOUR.intro])).toEqual([]);
	});

	// Measured once: the layout does not depend on the engine (ADR-085).
	for (const [screen, viewport] of Object.entries(SCREENS)) {
		for (const lesson of THREE_SENTENCES) {
			test(
				`shows the short sentences, the keys and the games of « ${lesson.title} » together on a ${screen}`,
				CHROMIUM_ONLY,
				async ({ page }) => {
					await page.setViewportSize(viewport);
					const profile = child('Lou', lesson, { fingeringProfileId: 'two-index-iso' });
					await installChild(page, profile);
					await reachMap(page, profile.name);
					await openIntro(page, lesson);
					await page.evaluate(async () => {
						await document.fonts.ready;
						await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
					});
					await expect(stepsShown(page)).toHaveCount((lesson.steps ?? []).length);
					const keys = page.locator('[data-intro-keys]');
					const seen = [
						page.locator('[data-intro-steps]'),
						keys.locator('.keyboard'),
						keys.locator('.hints'),
						...(await page.locator('button[data-game]').all()).map((game) =>
							game.locator('xpath=..')
						)
					];
					for (const element of seen) await expectInSight(page, element);
				}
			);
		}
	}

	test('has no axe violation before a lesson and in a game with a reduced fingering', async ({
		page
	}) => {
		await setRewards(page, 'hold');
		const profile = child('Inaya', THIRD, { fingeringProfileId: 'six-fingers-iso' });
		await installChild(page, profile);
		await reachMap(page, profile.name);
		await openIntro(page, THIRD);
		await expect(stepsShown(page)).toHaveCount((THIRD.steps ?? []).length);
		await expectNoAxeViolation(page);

		await page.locator('button[data-proposed]').click();
		await expect(page.locator('#game-input')).toBeFocused();
		await currentGroup(page);
		await expectNoAxeViolation(page);
	});
});
