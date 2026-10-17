import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { voiceKey } from '../src/lib/audio/voice-key';
import { parseVoiceRecordings } from '../src/lib/audio/voice-recordings';
import { readWavHeader } from '../src/lib/audio/voice-signal';
import { inRecordingOrder, LOOK_REMINDER_ID, voiceTexts } from '../src/lib/audio/voice-texts';
import { readZipEntry } from '../src/lib/audio/zip-test-support';
import { parseProgression } from '../src/lib/engine/progression/definition';
import { parseStory } from '../src/lib/engine/story';
import { linkedPaths, loadMessages, openPage, readJson, reloadPage } from './support';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;
const PAGE_URL = '/dev/voix';
const FILE_NAME = /^voix-fr__\d{4}-\d{2}-\d{2}\.zip$/;
const MIN_TARGET_PIXELS = 48;
/** Seconds of sound the simulated microphone must have produced before a take is stopped. */
const TAKE_SECONDS = 1;

const { message } = loadMessages();
const config = readJson<{ sampleRate: number }>('content/common/voice.json');
const story = parseStory(readJson('content/fr/story/azerty-decouverte.json'));
const TEXTS = inRecordingOrder(
	voiceTexts(parseProgression(readJson('content/fr/progression/azerty-decouverte.json')), story, [
		{ id: LOOK_REMINDER_ID, text: message('game_shared_look_reminder') }
	])
);
const TOTAL = TEXTS.length;
const FIRST = TEXTS[0]!;
const SECOND = TEXTS[1]!;

function button(page: Page, key: string) {
	return page.getByRole('button', { name: message(key), exact: true });
}

function positionHeading(page: Page, position: number) {
	return page.getByRole('heading', {
		level: 2,
		name: message('dev_voix_position', { position, total: TOTAL }),
		exact: true
	});
}

function exportIssue(page: Page) {
	return page.locator('#voix-export-issue');
}

function consentBox(page: Page) {
	return page.getByRole('checkbox', { name: message('dev_voix_consent_label') });
}

/** The page reads the takes kept in the browser before it lets anyone record. */
async function openRecorder(page: Page) {
	await openPage(page, PAGE_URL);
	await expect(page.locator('main[data-ready="true"]')).toBeVisible();
}

/**
 * MediaRecorder and the decoding of what it records are only exercised on Chromium. Tried on
 * Playwright's WebKit, these tests time out: the page never gets to record there. Firefox could not
 * be tried where they were written. Everything that needs no microphone runs on the three engines.
 */
function needsRecording(testInfo: TestInfo) {
	test.skip(
		testInfo.project.name !== 'chromium',
		'Recording a simulated microphone is only reliable on Chromium'
	);
}

/** Replaces the microphone with a steady tone, so that no device nor permission is needed. */
async function simulateMicrophone(page: Page) {
	await page.addInitScript(() => {
		navigator.mediaDevices.getUserMedia = async () => {
			const context = new AudioContext();
			const oscillator = context.createOscillator();
			const gain = context.createGain();
			const destination = context.createMediaStreamDestination();
			oscillator.frequency.value = 330;
			gain.gain.value = 0.3;
			oscillator.connect(gain);
			gain.connect(destination);
			oscillator.start();
			await context.resume();
			(window as unknown as { microphoneClock: () => number }).microphoneClock = () =>
				context.currentTime;
			return destination.stream;
		};
	});
}

async function refuseMicrophone(page: Page, errorName: string) {
	await page.addInitScript((name) => {
		navigator.mediaDevices.getUserMedia = () =>
			Promise.reject(new DOMException('Refused by the test', name));
	}, errorName);
}

/** Records the text on screen with the keyboard alone: Enter starts, Enter stops. */
async function recordTake(page: Page) {
	const record = page.getByTestId('record-button');
	await record.focus();
	await page.keyboard.press('Enter');
	await expect(page.getByTestId('recorder-status')).toHaveText(
		message('dev_voix_status_recording')
	);
	await expect(record).toHaveText(message('dev_voix_record_stop'));
	await page.waitForFunction(
		(seconds) =>
			((window as unknown as { microphoneClock?: () => number }).microphoneClock?.() ?? 0) >=
			seconds,
		TAKE_SECONDS
	);
	await page.keyboard.press('Enter');
	await expect(page.getByTestId('take-status')).toHaveAttribute('data-recorded', 'true');
	await expect(record).toHaveText(message('dev_voix_record_again'));
	await expect(record).toBeFocused();
}

test.describe('voice recording page', () => {
	test('loads with its title, the first text to say and what is left to do', async ({ page }) => {
		await openRecorder(page);

		await expect(page).toHaveTitle(message('dev_voix_title'));
		await expect(
			page.getByRole('heading', { level: 1, name: message('dev_voix_title') })
		).toBeVisible();
		await expect(positionHeading(page, 1)).toBeVisible();
		await expect(page.getByTestId('voice-text')).toHaveText(FIRST.text);
		await expect(page.getByTestId('take-status')).toContainText(message('dev_voix_take_none'));
		await expect(page.getByTestId('voice-progress')).toContainText(
			message('dev_voix_progress', { recorded: 0, total: TOTAL })
		);
		await expect(page.getByTestId('voice-progress')).toContainText(
			message('dev_voix_remaining_other', { count: TOTAL })
		);
		await expect(page.getByText(message('dev_voix_privacy_note'))).toBeVisible();
	});

	test('is not linked from the home page', async ({ page }) => {
		await openPage(page, '/');

		expect(await linkedPaths(page)).not.toContain(PAGE_URL);
	});

	test('can be driven with the keyboard alone', async ({ page }) => {
		await openRecorder(page);
		const selector = 'main button:not(:disabled), main input';
		const total = await page.locator(selector).count();
		expect(total).toBeGreaterThanOrEqual(4);
		const visited = new Set<number>();

		await page.locator(selector).first().focus();
		for (let step = 0; step < total; step++) {
			visited.add(
				await page.evaluate(
					(css) =>
						Array.from(document.querySelectorAll(css)).indexOf(document.activeElement as Element),
					selector
				)
			);
			if (step < total - 1) await page.keyboard.press('Tab');
		}
		expect(visited.has(-1)).toBe(false);
		expect(visited.size).toBe(total);

		await button(page, 'dev_voix_next').focus();
		await page.keyboard.press('Enter');
		await expect(positionHeading(page, 2)).toBeVisible();
		await expect(page.getByTestId('voice-text')).toHaveText(SECOND.text);
		await expect(button(page, 'dev_voix_next')).toBeFocused();

		await button(page, 'dev_voix_first_missing').focus();
		await page.keyboard.press('Space');
		await expect(positionHeading(page, 1)).toBeVisible();

		await button(page, 'dev_voix_next').focus();
		await page.keyboard.press('Enter');
		await button(page, 'dev_voix_previous').focus();
		await page.keyboard.press('Enter');
		await expect(page.getByTestId('voice-text')).toHaveText(FIRST.text);

		await consentBox(page).focus();
		await page.keyboard.press('Space');
		await expect(consentBox(page)).toBeChecked();
	});

	test('offers the openings and endings of the story first (ADR-042)', async ({ page }) => {
		await openRecorder(page);
		const first = story.worlds[0];
		await expect(page.getByTestId('voice-text')).toHaveText(first?.opening ?? '');
		await button(page, 'dev_voix_next').click();
		await expect(page.getByTestId('voice-text')).toHaveText(first?.ending ?? '');
	});

	test('stops at both ends of the list of texts', async ({ page }) => {
		await openRecorder(page);

		await expect(button(page, 'dev_voix_previous')).toBeDisabled();
		for (let position = 2; position <= TOTAL; position++) {
			await button(page, 'dev_voix_next').click();
			await expect(positionHeading(page, position)).toBeVisible();
		}
		await expect(button(page, 'dev_voix_next')).toBeDisabled();
		await expect(page.getByTestId('voice-text')).toHaveText(TEXTS[TOTAL - 1]!.text);
	});

	test('gives every control a touch target of at least 48 pixels', async ({ page }) => {
		await openRecorder(page);
		const controls = page.locator('main button, main input');
		const count = await controls.count();
		expect(count).toBeGreaterThanOrEqual(8);

		for (let index = 0; index < count; index++) {
			const box = await controls.nth(index).boundingBox();
			expect(box?.height ?? 0).toBeGreaterThanOrEqual(MIN_TARGET_PIXELS);
			expect(box?.width ?? 0).toBeGreaterThanOrEqual(MIN_TARGET_PIXELS);
		}
	});

	test('refuses to export until the agreement box is checked, then until a text is recorded', async ({
		page
	}) => {
		const downloads: string[] = [];
		page.on('download', (download) => downloads.push(download.suggestedFilename()));
		await openRecorder(page);

		await page.getByTestId('export-button').click();

		await expect(exportIssue(page)).toHaveText(message('dev_voix_export_need_consent'));
		await expect(consentBox(page)).toHaveAttribute('aria-invalid', 'true');

		await consentBox(page).check();
		await expect(exportIssue(page)).toHaveCount(0);
		await page.getByTestId('export-button').click();

		await expect(exportIssue(page)).toHaveText(message('dev_voix_export_need_take'));
		expect(downloads).toEqual([]);
	});

	test('explains that the microphone needs a secure page', async ({ page }) => {
		await page.addInitScript(() => {
			Object.defineProperty(window, 'isSecureContext', { value: false });
		});
		await openRecorder(page);

		await expect(page.getByTestId('microphone-problem')).toHaveText(
			message('dev_voix_problem_insecure')
		);
		await expect(page.getByTestId('record-button')).toBeDisabled();
	});

	test('explains that the browser cannot record when it has no MediaRecorder', async ({ page }) => {
		await page.addInitScript(() => {
			// Whatever the engine thinks of a local address: this test is about the missing recorder.
			Object.defineProperty(window, 'isSecureContext', { value: true });
			Object.defineProperty(window, 'MediaRecorder', { value: undefined });
		});
		await openRecorder(page);

		await expect(page.getByTestId('microphone-problem')).toHaveText(
			message('dev_voix_problem_unsupported')
		);
		await expect(page.getByTestId('record-button')).toBeDisabled();
	});
});

test.describe('voice recording page, with a microphone', () => {
	for (const [errorName, problem] of [
		['NotAllowedError', 'dev_voix_problem_denied'],
		['NotFoundError', 'dev_voix_problem_missing']
	] as const) {
		test(`explains what to do when the microphone answers ${errorName}`, async ({
			page
		}, testInfo) => {
			needsRecording(testInfo);
			await refuseMicrophone(page, errorName);
			await openRecorder(page);

			await page.getByTestId('record-button').click();

			await expect(page.getByTestId('microphone-problem')).toHaveText(message(problem));
			await expect(page.getByTestId('record-button')).toBeEnabled();
			await expect(page.getByTestId('record-button')).toHaveText(message('dev_voix_record'));
		});
	}

	test('records a take with the keyboard, keeps it across a reload and exports a valid archive', async ({
		page,
		baseURL
	}, testInfo) => {
		needsRecording(testInfo);
		const origin = new URL(baseURL ?? '').origin;
		const outgoing: string[] = [];
		page.on('request', (request) => {
			const url = new URL(request.url());
			if (/^https?:$/.test(url.protocol) && (url.origin !== origin || request.method() !== 'GET')) {
				outgoing.push(`${request.method()} ${request.url()}`);
			}
		});
		await simulateMicrophone(page);
		await openRecorder(page);
		await expect(button(page, 'dev_voix_replay')).toBeDisabled();

		await recordTake(page);

		await expect(page.getByTestId('recorder-status')).toContainText(
			message('dev_voix_status_saved', { duration: '' }).split('(')[0]!
		);
		await expect(button(page, 'dev_voix_replay')).toBeEnabled();
		await expect(page.getByTestId('voice-progress')).toContainText(
			message('dev_voix_progress', { recorded: 1, total: TOTAL })
		);

		await reloadPage(page);
		await expect(page.locator('main[data-ready="true"]')).toBeVisible();
		await expect(positionHeading(page, 2)).toBeVisible();
		await expect(page.getByTestId('voice-progress')).toContainText(
			message('dev_voix_progress', { recorded: 1, total: TOTAL })
		);
		await button(page, 'dev_voix_previous').click();
		await expect(page.getByTestId('take-status')).toHaveAttribute('data-recorded', 'true');

		await page.getByLabel(message('dev_voix_credit_label')).fill('  Camille   Testeuse ');
		await consentBox(page).check();
		const downloadPromise = page.waitForEvent('download');
		await page.getByTestId('export-button').click();
		const download = await downloadPromise;

		expect(download.suggestedFilename()).toMatch(FILE_NAME);
		await expect(
			page.getByText(message('dev_voix_export_done', { filename: download.suggestedFilename() }))
		).toBeVisible();
		const archive = readFileSync(await download.path());
		const recordings = parseVoiceRecordings(
			JSON.parse(new TextDecoder().decode(await readZipEntry(archive, 'enregistrements.json')))
		);
		expect(recordings).toMatchObject({
			locale: 'fr',
			credit: 'Camille Testeuse',
			sampleRate: config.sampleRate
		});
		expect(recordings.clips).toHaveLength(1);
		const clip = recordings.clips[0]!;
		expect(clip).toMatchObject({
			key: voiceKey(FIRST.text),
			text: FIRST.text,
			origin: FIRST.origin,
			file: `${FIRST.key}.wav`
		});
		const header = readWavHeader(await readZipEntry(archive, clip.file));
		expect(header).toMatchObject({
			sampleRate: config.sampleRate,
			channels: 1,
			bitsPerSample: 16,
			durationMs: clip.durationMs
		});
		expect(header.durationMs).toBeGreaterThan((TAKE_SECONDS * 1000) / 2);
		expect(outgoing).toEqual([]);
	});

	test('erases every take only after a confirmation', async ({ page }, testInfo) => {
		needsRecording(testInfo);
		await simulateMicrophone(page);
		await openRecorder(page);
		await recordTake(page);

		await button(page, 'dev_voix_clear_button').focus();
		await page.keyboard.press('Enter');
		await expect(
			page.getByText(message('dev_voix_clear_question_one', { count: 1 }))
		).toBeVisible();
		await expect(button(page, 'dev_voix_clear_cancel')).toBeFocused();

		await page.keyboard.press('Enter');
		await expect(button(page, 'dev_voix_clear_button')).toBeFocused();
		await expect(page.getByTestId('take-status')).toHaveAttribute('data-recorded', 'true');

		await page.keyboard.press('Enter');
		await button(page, 'dev_voix_clear_confirm').focus();
		await page.keyboard.press('Enter');

		await expect(page.getByText(message('dev_voix_clear_done'))).toBeVisible();
		await expect(page.getByTestId('take-status')).toHaveAttribute('data-recorded', 'false');
		await expect(page.getByTestId('record-button')).toBeFocused();
		await expect(button(page, 'dev_voix_clear_button')).toBeDisabled();

		await reloadPage(page);
		await expect(page.locator('main[data-ready="true"]')).toBeVisible();
		await expect(page.getByTestId('voice-progress')).toContainText(
			message('dev_voix_progress', { recorded: 0, total: TOTAL })
		);
	});
});

for (const colorScheme of COLOR_SCHEMES) {
	test.describe(`voice recording page, ${colorScheme} theme`, () => {
		test.use({ colorScheme });

		test('has no axe violation for WCAG A and AA', async ({ page }) => {
			await openRecorder(page);
			await page.evaluate(() => document.fonts.ready);

			const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

			expect(results.violations).toEqual([]);
		});

		test('has no axe violation with a refused export and a refused microphone', async ({
			page
		}) => {
			await refuseMicrophone(page, 'NotAllowedError');
			await openRecorder(page);
			await page.getByTestId('record-button').click();
			await expect(page.getByTestId('microphone-problem')).toBeVisible();
			await page.getByTestId('export-button').click();
			await expect(page.getByText(message('dev_voix_export_need_consent'))).toBeVisible();
			await page.evaluate(() => document.fonts.ready);

			const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

			expect(results.violations).toEqual([]);
		});

		test('has no axe violation once a take is recorded and the erase question is asked', async ({
			page
		}) => {
			await simulateMicrophone(page);
			await openRecorder(page);
			await recordTake(page);
			await button(page, 'dev_voix_clear_button').click();
			await expect(button(page, 'dev_voix_clear_confirm')).toBeVisible();
			await page.evaluate(() => document.fonts.ready);

			const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

			expect(results.violations).toEqual([]);
		});
	});
}
