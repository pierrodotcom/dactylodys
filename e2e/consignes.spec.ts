import { expect as baseExpect, test, type Page } from '@playwright/test';
import { voiceKey } from '../src/lib/audio/voice-key';
import type { Profile } from '../src/lib/state/types';
import { CHROMIUM_ONLY } from './engines';
import {
	advancedProfile,
	type AdvancedProfileInput,
	expectNoAxeViolation,
	installProfile,
	loadMessages,
	openPage,
	readJson,
	reloadPage,
	setRewards,
	throughStory
} from './support';

/*
 * The instruction said one short sentence at a time, each while the hand shows its key (audit
 * P-13), and the questions of Floup said on demand (P-12). No sentence is recorded yet: the tests
 * serve a manifest that names them, and note what an audio element is asked to play, as the test of
 * the story does (Q-06). The voice depends on the engine: these run on the three of them.
 */

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const { message, numbered } = loadMessages();
const MANIFEST_URL = '**/voice/fr/manifest.json';

interface Lesson {
	id: string;
	title: string;
	intro: string;
	steps?: { char: string; text: string }[];
}
const worlds = readJson<{ worlds: { lessons: Lesson[] }[] }>(
	'content/fr/progression/azerty-decouverte.json'
).worlds;
const lessons = worlds.flatMap((world) => world.lessons);
/** « Les œufs de dinosaure »: F, then J. */
const FIRST = lessons[0]!;
/** The first lesson of the world where a mistake is erased with Backspace: the last world. */
const ERASING_LESSON = worlds.at(-1)!.lessons[0]!;
const ERASING = message('play_intro_erasing');
const STEPS = FIRST.steps ?? [];
const manifest = readJson<{ clips: Record<string, { file: string; durationMs: number }> }>(
	'static/voice/fr/manifest.json'
);

/** A clip for each of these sentences. */
function clipsOf(texts: readonly string[]) {
	return Object.fromEntries(
		texts.map((text) => {
			const key = voiceKey(text);
			return [key, { file: `${key}.mp3`, durationMs: 1000 }] as const;
		})
	);
}

/** The published voice, and a clip for each of these sentences besides. */
function voiceWith(texts: readonly string[]) {
	return { ...manifest, clips: { ...manifest.clips, ...clipsOf(texts) } };
}

async function recordAlso(page: Page, texts: readonly string[]) {
	const served = voiceWith(texts);
	await page.route(MANIFEST_URL, (route) => route.fulfill({ json: served }));
}

/**
 * A voice that has these sentences and no other: what the site publishes never changes what the
 * test hears (L-195).
 */
async function recordOnly(page: Page, texts: readonly string[]) {
	const served = { ...manifest, clips: clipsOf(texts) };
	await page.route(MANIFEST_URL, (route) => route.fulfill({ json: served }));
}

/**
 * An audio element that notes the file it is asked to play, and plays until the test ends it
 * (`endVoice`): the sentence being said stays on screen as long as the test looks at it.
 */
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

function played(page: Page): Promise<string[]> {
	return page.evaluate(() => (window as unknown as { playedSounds: string[] }).playedSounds);
}

/** The files played for these sentences, in the order they were played. */
async function playedOf(page: Page, texts: readonly string[]): Promise<string[]> {
	const keys = texts.map(voiceKey);
	return (await played(page))
		.map((url) => keys.find((key) => url.includes(key)) ?? '')
		.filter((key) => key !== '');
}

async function endVoice(page: Page) {
	await page.evaluate(() => (window as unknown as { endVoice: () => void }).endVoice());
}

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function child(name: string, passed: AdvancedProfileInput['passed'] = {}): Profile {
	const profile = advancedProfile({ name, passed });
	return { ...profile, settings: { ...profile.settings, voiceEnabled: true } };
}

/** A child who passed every lesson of the first worlds: the world where mistakes are erased is open. */
function childAtTheTexts(name: string): Profile {
	const before = worlds.slice(0, -1).flatMap((world) => world.lessons);
	return child(name, Object.fromEntries(before.map((lesson) => [lesson.id, 2 as const])));
}

async function reachMapAs(page: Page, profile: Profile) {
	await openPage(page, '/jouer');
	await installProfile(page, profile);
	await reloadPage(page);
	const map = heading(page, message('play_map_title'));
	const player = page.getByRole('button', { name: profile.name, exact: true });
	await expect(map.or(player)).toBeVisible();
	if (await player.isVisible()) await player.click();
	await expect(map).toBeVisible();
}

async function openIntro(page: Page, lesson: Lesson) {
	await page.getByRole('button', { name: lesson.title }).click();
	await throughStory(page, heading(page, lesson.title));
	await expect(page.locator('[data-intro]')).toHaveText(lesson.intro);
}

const sentence = (page: Page) => page.locator('[data-intro-keys]');
const listen = (page: Page) =>
	page.getByRole('button', { name: message('ui_listen_start'), exact: true });

test.describe('the instruction said in short sentences (audit P-13)', () => {
	test('says each sentence while the hand shows its key, then the hand shows them all again', async ({
		page
	}) => {
		expect(STEPS.map((step) => step.char)).toEqual(['f', 'j']);
		await noteVoice(page);
		await recordAlso(
			page,
			STEPS.map((step) => step.text)
		);
		await reachMapAs(page, child('Ilan'));
		await openIntro(page, FIRST);

		const texts = STEPS.map((step) => step.text);
		await expect.poll(() => playedOf(page, texts)).toEqual([voiceKey(texts[0]!)]);
		await expect(sentence(page)).toHaveAttribute('data-intro-step', 'f');
		await expect(page.locator('[data-hand-guide] [data-active]')).toHaveCount(1);

		await endVoice(page);
		await expect.poll(() => playedOf(page, texts)).toEqual(texts.map(voiceKey));
		await expect(sentence(page)).toHaveAttribute('data-intro-step', 'j');

		await endVoice(page);
		await expect(sentence(page)).not.toHaveAttribute('data-intro-step');
		// The whole instruction is not said: its short sentences are.
		expect(await playedOf(page, [FIRST.intro])).toEqual([]);

		// « Écouter » says them again, from the first one, with the hand.
		await listen(page).click();
		await expect(sentence(page)).toHaveAttribute('data-intro-step', 'f');
		await expect
			.poll(() => playedOf(page, texts))
			.toEqual([...texts.map(voiceKey), voiceKey(texts[0]!)]);
	});

	test('says the whole instruction, as before, while a short sentence is not recorded', async ({
		page
	}) => {
		await noteVoice(page);
		await recordAlso(page, [STEPS[0]!.text]);
		await reachMapAs(page, child('Inès'));
		await openIntro(page, FIRST);

		await expect.poll(() => playedOf(page, [FIRST.intro])).toEqual([voiceKey(FIRST.intro)]);
		await expect(listen(page)).toBeVisible();
		expect(await playedOf(page, [STEPS[0]!.text])).toEqual([]);
		await expect(sentence(page)).not.toHaveAttribute('data-intro-step');
	});
});

test.describe('the sentence of the world where a mistake is erased, said after the instruction', () => {
	const erasing = (page: Page) => page.locator('[data-erasing]');

	async function openErasingIntro(page: Page, name: string) {
		await reachMapAs(page, childAtTheTexts(name));
		await openIntro(page, ERASING_LESSON);
		await expect(page.locator('[data-erasing-notice]')).toHaveText(ERASING);
	}

	test('says it once the instruction is said, once, and again with the Listen beside it', async ({
		page
	}) => {
		const texts = [ERASING_LESSON.intro, ERASING];
		await noteVoice(page);
		await recordOnly(page, texts);
		await openErasingIntro(page, 'Lison');

		await expect.poll(() => playedOf(page, texts)).toEqual([voiceKey(ERASING_LESSON.intro)]);
		await endVoice(page);
		await expect.poll(() => playedOf(page, texts)).toEqual(texts.map(voiceKey));
		await endVoice(page);

		await erasing(page)
			.getByRole('button', { name: message('ui_listen_start') })
			.click();
		await expect
			.poll(() => playedOf(page, texts))
			.toEqual([...texts.map(voiceKey), voiceKey(ERASING)]);
	});

	test('says nothing of it and shows no Listen beside it while it is not recorded', async ({
		page
	}) => {
		await noteVoice(page);
		await recordOnly(page, [ERASING_LESSON.intro]);
		await openErasingIntro(page, 'Loïs');

		await expect
			.poll(() => playedOf(page, [ERASING_LESSON.intro]))
			.toEqual([voiceKey(ERASING_LESSON.intro)]);
		await expect(erasing(page).getByRole('button')).toHaveCount(0);
		await endVoice(page);
		// Listen says the instruction again: the sentence of the world never came between.
		await page.locator('.instruction').getByRole('button').click();
		await expect
			.poll(() => playedOf(page, [ERASING_LESSON.intro, ERASING]))
			.toEqual([voiceKey(ERASING_LESSON.intro), voiceKey(ERASING_LESSON.intro)]);
	});

	test('has no axe violation with the Listen beside the sentence of the world', async ({
		page
	}) => {
		await recordOnly(page, [ERASING_LESSON.intro, ERASING]);
		await openErasingIntro(page, 'Lilou');
		await expect(erasing(page).getByRole('button')).toBeVisible();

		await expectNoAxeViolation(page);
	});
});

test.describe('the questions of Floup said on demand (audit P-12)', () => {
	const TEXTS = [
		...numbered('game_dialogue_question_').map((key) => message(key)),
		...numbered('game_dialogue_quip_').map((key) => message(key))
	];

	async function playFloup(page: Page) {
		await setRewards(page, 'hold');
		await reachMapAs(page, child('Floris'));
		await openIntro(page, FIRST);
		await page.getByRole('button', { name: message('game_dialogue_play'), exact: true }).click();
		await expect(page.locator('.question')).toBeVisible();
	}

	test('offers to hear the question once it is recorded, and leaves the keys in the field', async ({
		page
	}) => {
		await noteVoice(page);
		await recordAlso(page, TEXTS);
		await playFloup(page);

		const question = ((await page.locator('.question').textContent()) ?? '').trim();
		expect(TEXTS).toContain(question);
		await page.locator('[data-floup-listen]').getByRole('button').click();
		await expect.poll(() => playedOf(page, [question])).toEqual([voiceKey(question)]);
		// The field keeps the focus: the next key is typed, never Space on the button.
		await expect(page.locator('#game-input')).toBeFocused();
	});

	test(
		'shows no listen button beside a question that is not recorded',
		CHROMIUM_ONLY,
		async ({ page }) => {
			await playFloup(page);

			await expect(page.locator('.question')).toBeVisible();
			await expect(page.locator('[data-floup-listen]')).toHaveCount(0);
		}
	);

	test('has no axe violation with the listen button beside a question', async ({ page }) => {
		await recordAlso(page, TEXTS);
		await playFloup(page);
		await expect(page.locator('[data-floup-listen]').getByRole('button')).toBeVisible();

		await expectNoAxeViolation(page);
	});
});
