import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { toGraphemes } from '../src/lib/engine/graphemes';
import { updateSettings } from '../src/lib/state/profile';
import type { Profile, Settings } from '../src/lib/state/types';
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

/**
 * Finer sensory settings (ADR-057): light effects apart from motion, a soft background sound,
 * and "Calm everything" in one press.
 */

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;

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
const gateNumbers = readJson<{ numbers: { value: number; words: string }[] }>(
	'content/fr/adult/gate-numbers.json'
).numbers;

const NAME = 'Lou';

function child(patch: Partial<Settings> = {}): Profile {
	return updateSettings(advancedProfile({ name: NAME, passed: {} }), patch);
}

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function choice(page: Page, legend: string, option: string): Locator {
	return page.getByRole('group', { name: legend }).getByRole('radio', { name: option });
}

function groupLabel(page: Page): Locator {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

async function currentGroup(page: Page): Promise<string> {
	const text = groupLabel(page);
	await expect(text).toHaveText(GROUP_LABEL);
	return GROUP_LABEL.exec((await text.textContent()) ?? '')?.groups?.['text'] ?? '';
}

async function installChild(page: Page, profile: Profile) {
	await openPage(page, '/jouer');
	await installProfile(page, profile);
	await reloadPage(page);
}

async function reachMap(page: Page) {
	await openPage(page, '/jouer');
	const map = heading(page, message('play_map_title'));
	const player = button(page, NAME);
	await expect(map.or(player)).toBeVisible();
	if (await player.isVisible()) await player.click();
	await expect(map).toBeVisible();
}

async function startFirstLesson(page: Page): Promise<string> {
	await page.getByRole('button', { name: FIRST.title }).click();
	await throughStory(page, heading(page, FIRST.title));
	await page.locator('button[data-proposed]').click();
	await expect(page.locator('#game-input')).toBeFocused();
	return currentGroup(page);
}

async function openSettings(page: Page) {
	await button(page, message('play_settings_open')).click();
	await expect(heading(page, message('settings_title'))).toBeVisible();
}

/** Keyboard only: the focus is put on the control, then a key acts. */
async function press(page: Page, control: Locator, key: 'Enter' | 'Space') {
	await control.focus();
	await page.keyboard.press(key);
}

async function gateNumber(page: Page): Promise<number> {
	const words = (await page.locator('[data-gate-words]').textContent())?.trim();
	const number = gateNumbers.find((entry) => entry.words === words);
	if (!number) throw new Error(`unknown gate number: ${words}`);
	return number.value;
}

test.beforeEach(async ({ page }) => {
	await shortenRewards(page);
});

test.describe('Light effects', () => {
	for (const effects of [true, false]) {
		test(`${effects ? 'shows' : 'hides'} the light effects with motion allowed, and always the information`, async ({
			page
		}) => {
			await installChild(page, child({ effects, motion: 'full' }));
			await reachMap(page);
			const group = await startFirstLesson(page);
			const [first = ''] = toGraphemes(group);

			// The expected key is lit, a mistake is marked, whatever the effects.
			await expect(page.locator('.keyboard .key[data-target]').first()).toBeVisible();
			await page.keyboard.type('k');
			await expect(page.locator('.target-text [data-error]')).toBeVisible();
			await expect(page.locator('.keyboard .key[data-wrong]')).toBeVisible();

			await page.keyboard.type(first);
			await page.keyboard.type(group.slice(first.length));
			await expect(groupLabel(page)).toHaveText(GROUP_DONE);
			// A group with a mistake sends no note: the next one is typed without any.
			await page.keyboard.press('Enter');
			const next = await currentGroup(page);
			await page.keyboard.type(next);
			await expect(groupLabel(page)).toHaveText(GROUP_DONE);

			const note = page.locator('.keyboard .note');
			await expect(note).toHaveCount(1);
			await expect(note).toHaveAttribute('data-effect');
			if (effects) {
				await expect(note).toBeVisible();
			} else {
				await expect(page.locator('html')).toHaveAttribute('data-effects', 'off');
				await expect(note).toBeHidden();
				await expect(page.locator('[data-effect]:visible')).toHaveCount(0);
			}
			await expect(page.locator('.keyboard')).toBeVisible();
		});
	}
});

test.describe('Calm everything', () => {
	test('reduces motion and cuts the effects and the sounds in one press, keyboard only', async ({
		page
	}) => {
		const profile = child({ motion: 'full', voiceEnabled: true, ambience: 'soft-noise' });
		await installChild(page, profile);
		await reachMap(page);
		await openSettings(page);

		const calm = button(page, message('settings_calm_button'));
		const status = page.locator('[data-calm-status]');
		await press(page, calm, 'Enter');

		await expect(status).toContainText(message('settings_calm_done'));
		for (const key of ['settings_calm_motion', 'settings_calm_effects', 'settings_calm_sound']) {
			await expect(status.getByRole('listitem').filter({ hasText: message(key) })).toHaveCount(1);
		}
		await expect(
			choice(page, message('settings_motion_label'), message('settings_motion_reduced'))
		).toBeChecked();
		await expect(
			choice(page, message('settings_effects_label'), message('settings_off'))
		).toBeChecked();
		await expect(
			choice(page, message('settings_sound_label'), message('settings_off'))
		).toBeChecked();
		// The voice and the background sound stay as they were.
		await expect(
			choice(page, message('settings_voice_label'), message('settings_on'))
		).toBeChecked();
		await expect(
			choice(page, message('settings_ambience_label'), message('settings_ambience_soft_noise'))
		).toBeChecked();
		await expect
			.poll(async () => (await storedRecord(page, profile))?.['settings'])
			.toMatchObject({
				motion: 'reduced',
				effects: false,
				soundEnabled: false,
				voiceEnabled: true,
				ambience: 'soft-noise'
			});
		await expect(page.locator('html')).toHaveAttribute('data-effects', 'off');

		// Pressed again, it says so instead of doing nothing.
		await press(page, calm, 'Enter');
		await expect(status).toHaveText(message('settings_calm_already'));

		// Each setting can still be changed, one by one.
		const effectsOn = choice(page, message('settings_effects_label'), message('settings_on'));
		await press(page, effectsOn, 'Space');
		await expect(effectsOn).toBeChecked();
		await expect(status).toHaveCount(0);
		// One status for the page: saving still speaks there.
		await expect(page.getByRole('status')).toHaveText(message('settings_saved'));
		await expect
			.poll(async () => (await storedRecord(page, profile))?.['settings'])
			.toMatchObject({ effects: true, motion: 'reduced', soundEnabled: false });
		await expect(page.locator('html')).not.toHaveAttribute('data-effects', 'off');
	});

	test('shows the light effects and the background sound in the settings of the adult space', async ({
		page
	}) => {
		const profile = child();
		await installChild(page, profile);
		await openPage(page, '/adulte');
		await page.locator('[data-gate-answer]').fill(String(await gateNumber(page)));
		await page.keyboard.press('Enter');
		await expect(page.locator('[data-adult-home]')).toBeVisible();
		await button(page, NAME).click();
		await press(page, page.locator('[data-child-settings]'), 'Enter');
		await expect(heading(page, message('adult_settings_title', { name: NAME }))).toBeVisible();

		await expect(
			choice(page, message('settings_effects_label'), message('settings_on'))
		).toBeChecked();
		const soft = choice(
			page,
			message('settings_ambience_label'),
			message('settings_ambience_soft_noise')
		);
		await press(page, soft, 'Space');
		await expect(soft).toBeChecked();
		await expect(page.getByText(message('settings_ambience_hint'))).toBeVisible();
		await expect
			.poll(async () => (await storedRecord(page, profile))?.['settings'])
			.toMatchObject({ ambience: 'soft-noise' });
	});
});

test.describe('Soft background sound', () => {
	test('starts in a game and stops at the pause and when the page is hidden', async ({ page }) => {
		await page.addInitScript(() => {
			const log: string[] = [];
			const param = {
				setValueAtTime() {},
				linearRampToValueAtTime() {},
				cancelScheduledValues() {}
			};
			class FakeAudioContext {
				currentTime = 0;
				sampleRate = 100;
				state = 'running';
				destination = {};
				createOscillator() {
					return { type: '', frequency: param, connect() {}, start() {}, stop() {} };
				}
				createGain() {
					return { gain: param, connect() {} };
				}
				createBuffer(_channels: number, length: number) {
					const data = new Float32Array(length);
					return { getChannelData: () => data };
				}
				createBiquadFilter() {
					return { type: '', frequency: { value: 0 }, connect() {} };
				}
				createBufferSource() {
					return {
						buffer: null,
						loop: false,
						connect() {},
						start() {
							log.push('start');
						},
						stop() {
							log.push('stop');
						}
					};
				}
				resume() {
					return Promise.resolve();
				}
				close() {
					return Promise.resolve();
				}
			}
			Object.assign(window, { AudioContext: FakeAudioContext, ambienceLog: log });
		});
		const ambienceLog = () =>
			page.evaluate(() => (window as unknown as { ambienceLog: string[] }).ambienceLog.join(' '));

		await installChild(page, child({ ambience: 'soft-noise' }));
		await reachMap(page);
		// On the screens between two games, the sound already plays.
		await expect.poll(ambienceLog).toBe('start');
		await startFirstLesson(page);
		await expect.poll(ambienceLog).toBe('start');

		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).toBeVisible();
		await expect.poll(ambienceLog).toBe('start stop');

		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).toHaveCount(0);
		await expect.poll(ambienceLog).toBe('start stop start');

		await page.evaluate(() => {
			Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
			document.dispatchEvent(new Event('visibilitychange'));
		});
		await expect.poll(ambienceLog).toBe('start stop start stop');
	});

	test('stays silent when the profile has none', async ({ page }) => {
		await page.addInitScript(() => {
			const created: unknown[] = [];
			class FakeAudioContext {
				constructor() {
					created.push(this);
				}
			}
			Object.assign(window, { AudioContext: FakeAudioContext, createdAudioContexts: created });
		});
		await installChild(page, child({ soundEnabled: false }));
		await reachMap(page);
		await startFirstLesson(page);
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).toBeVisible();
		const count = await page.evaluate(
			() => (window as unknown as { createdAudioContexts: unknown[] }).createdAudioContexts.length
		);
		expect(count).toBe(0);
	});
});

for (const colorScheme of COLOR_SCHEMES) {
	test.describe(`Sensory settings, ${colorScheme} theme`, () => {
		test.use({ colorScheme });

		test('has no axe violation on the settings of the child, once calmed', async ({ page }) => {
			await installChild(page, child());
			await reachMap(page);
			await openSettings(page);
			await press(page, button(page, message('settings_calm_button')), 'Enter');
			await expect(page.locator('[data-calm-status]')).toContainText(message('settings_calm_done'));

			await page.evaluate(() => document.fonts.ready);
			const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
			expect(results.violations).toEqual([]);
		});
	});
}
