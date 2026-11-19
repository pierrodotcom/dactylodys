import { expect as baseExpect, test, type Page } from '@playwright/test';
import type { StarCount } from '../src/lib/engine/progression/types';
import { updateSettings } from '../src/lib/state/profile';
import type { Profile } from '../src/lib/state/types';
import { CHROMIUM_ONLY } from './engines';
import {
	advancedProfile,
	installProfile,
	loadMessages,
	openPage,
	readJson,
	reloadPage,
	throughStory
} from './support';

/**
 * A child whose keyboard is a Mac (audit P-09): the instruction of a lesson says where the keys of
 * a Mac are, the keyboard drawn shows them there, and a sentence the voice has not recorded stays
 * silent. The adult reads, beside the choice of the keyboard, that the Mac one was not tried on a
 * real Mac. Texts and logic of the screens: Chromium is enough (rule 11 of the tests).
 */

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const { message } = loadMessages();
const MAC = 'fr-fr-azerty-mac';
const NAME = 'Noa';
const PASSED: StarCount = 2;

interface Lesson {
	id: string;
	title: string;
	intro: string;
	introByPlatform?: { mac?: string };
	newChars: string[];
}
const lessons = readJson<{ worlds: { lessons: Lesson[] }[] }>(
	'content/fr/progression/azerty-decouverte.json'
).worlds.flatMap((world) => world.lessons);
const gateNumbers = readJson<{ numbers: { value: number; words: string }[] }>(
	'content/fr/adult/gate-numbers.json'
).numbers;

function lessonOf(char: string): Lesson {
	const lesson = lessons.find((candidate) => candidate.newChars.includes(char));
	if (lesson === undefined) throw new Error(`No lesson brings ${char}`);
	return lesson;
}

/** « L'adresse du dino »: on a Mac, « @ » has a key of its own. */
const AT = lessonOf('@');
/** « Le klaxon rigolo »: on a Mac, « ! » is on the key 8; its PC sentence is recorded. */
const EXCLAMATION = lessonOf('!');
/** « Le chapeau du pilote »: the same sentence on every keyboard, recorded. */
const CIRCUMFLEX = lessonOf('ê');

/** A child on a Mac who passed every lesson before this one. */
function macChildBefore(lesson: Lesson): Profile {
	const index = lessons.findIndex((candidate) => candidate.id === lesson.id);
	const passed = Object.fromEntries(lessons.slice(0, index).map((before) => [before.id, PASSED]));
	return updateSettings(advancedProfile({ name: NAME, passed }), { layoutId: MAC });
}

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function intro(page: Page) {
	return page.locator('[data-intro]');
}

async function reachMap(page: Page, profile: Profile) {
	await openPage(page, '/jouer');
	await installProfile(page, profile);
	await reloadPage(page);
	const map = heading(page, message('play_map_title'));
	const player = button(page, NAME);
	await expect(map.or(player)).toBeVisible();
	if (await player.isVisible()) await player.click();
	await expect(map).toBeVisible();
}

async function openIntro(page: Page, lesson: Lesson) {
	await page.getByRole('button', { name: lesson.title }).click();
	await throughStory(page, heading(page, lesson.title));
	await expect(intro(page)).toBeVisible();
}

async function gateNumber(page: Page): Promise<number> {
	const words = (await page.locator('[data-gate-words]').textContent())?.trim();
	const number = gateNumbers.find((entry) => entry.words === words);
	if (!number) throw new Error(`unknown gate number: ${words}`);
	return number.value;
}

test.describe('A child on a Mac', CHROMIUM_ONLY, () => {
	test('reads where « @ » is on a Mac, and sees its own key lit, before its lesson', async ({
		page
	}) => {
		await reachMap(page, macChildBefore(AT));
		await openIntro(page, AT);

		await expect(intro(page)).toHaveText(AT.introByPlatform?.mac ?? '');
		// The key « @ » of a Mac, under the left little finger: not AltGr and the key « à » of a PC.
		const keyboard = page.locator('[data-intro-keys] .keyboard');
		await expect(keyboard.locator('.key[data-target]')).toHaveCount(1);
		const atKey = keyboard.locator('.key[data-code="IntlBackslash"]');
		await expect(atKey).toHaveAttribute('data-target', 'true');
		await expect(atKey).toContainText('@');
		await expect(page.locator('[data-intro-keys] .finger-hint')).toHaveText(
			message('ui_finger_hint', { key: '@', finger: message('ui_finger_left_pinky') })
		);
	});

	test('hears the instructions recorded for every keyboard, never a PC one on a Mac', async ({
		page
	}) => {
		const listen = page.getByRole('button', { name: message('ui_listen_start') });
		await reachMap(page, macChildBefore(CIRCUMFLEX));

		await openIntro(page, CIRCUMFLEX);
		await expect(intro(page)).toHaveText(CIRCUMFLEX.intro);
		await expect(listen).toBeVisible();

		await button(page, message('play_intro_back')).click();
		await expect(heading(page, message('play_map_title'))).toBeVisible();
		await openIntro(page, EXCLAMATION);
		await expect(intro(page)).toHaveText(EXCLAMATION.introByPlatform?.mac ?? '');
		// The voice says the sentence of a PC: until the one of a Mac is recorded, nothing is said.
		await expect(listen).toHaveCount(0);
	});

	test('has the adult read, beside the choice of the keyboard, that it was not tried on a Mac', async ({
		page
	}) => {
		await reachMap(page, macChildBefore(AT));
		await openPage(page, '/adulte');
		await page.locator('[data-gate-answer]').fill(String(await gateNumber(page)));
		await page.keyboard.press('Enter');
		await expect(page.locator('[data-adult-home]')).toBeVisible();
		await button(page, NAME).click();
		await page.locator('[data-child-settings]').click();
		await expect(heading(page, message('adult_settings_title', { name: NAME }))).toBeVisible();

		const layout = page.getByRole('group', { name: message('settings_layout_label') });
		await expect(layout).toContainText(message('settings_layout_hint'));
		await expect(layout).toHaveAccessibleDescription(message('settings_layout_hint'));
	});
});
