import { readFileSync } from 'node:fs';
import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { CHROMIUM_ONLY } from './engines';
import {
	advancedProfile,
	installProfile,
	loadMessages,
	openPage,
	readJson,
	reloadPage,
	setRewards,
	throughStory
} from './support';

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

/*
 * The content security policy (Q-11): every page carries it, the browser enforces it, and the
 * game still works under it, with its sounds, its voice, its files and its offline copy. A
 * violation shows in the console and as a `securitypolicyviolation` event: both are watched.
 */
const STEP_TIMEOUT = 15_000;
const PAGES = [
	'/',
	'/jouer',
	'/adulte',
	'/pour-les-adultes',
	'/pour-les-professionnels',
	'/confidentialite',
	'/accessibilite',
	'/credits',
	'/dev/traces',
	'/dev/voix'
];
/** What the policy must say, whatever else it says: nothing from, nor to, another site. */
const REQUIRED_DIRECTIVES = [
	"default-src 'self'",
	"connect-src 'self'",
	"img-src 'self'",
	"font-src 'self'",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'none'"
];
const VIOLATION_MARK = 'csp-violation:';
const POLICY_MESSAGE = /content[ -]security[ -]policy/i;

const { message, templateRegex } = loadMessages();
const GROUP_LABEL = templateRegex('ui_target_text_label');
const progression = readJson<{ worlds: { lessons: { id: string; title: string }[] }[] }>(
	'content/fr/progression/azerty-decouverte.json'
);
const FIRST = progression.worlds[0]?.lessons[0] as { id: string; title: string };
const gateNumbers = readJson<{ numbers: { value: number; words: string }[] }>(
	'content/fr/adult/gate-numbers.json'
).numbers;

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

function groupLabel(page: Page): Locator {
	return page.locator('.target-text > .dd-visually-hidden').first();
}

/** Everything the browser refuses because of the policy, from the opening of the page on. */
async function watchPolicy(page: Page): Promise<string[]> {
	const violations: string[] = [];
	page.on('console', (entry) => {
		if (POLICY_MESSAGE.test(entry.text()) || entry.text().startsWith(VIOLATION_MARK)) {
			violations.push(entry.text());
		}
	});
	await page.addInitScript((mark) => {
		document.addEventListener('securitypolicyviolation', (event) => {
			console.error(`${mark} ${event.violatedDirective} ${event.blockedURI}`);
		});
	}, VIOLATION_MARK);
	return violations;
}

async function policyOf(page: Page): Promise<string> {
	const policies = page.locator('meta[http-equiv="content-security-policy" i]');
	await expect(policies).toHaveCount(1);
	return (await policies.getAttribute('content')) ?? '';
}

async function typeLessonToResult(page: Page) {
	const over = button(page, message('play_result_map'));
	const finale = button(page, message('game_shared_finale_continue'));
	for (;;) {
		const label = groupLabel(page);
		await expect(label).toHaveText(GROUP_LABEL);
		const group = GROUP_LABEL.exec((await label.textContent()) ?? '')?.groups?.['text'] ?? '';
		await page.keyboard.type(group);
		await expect(async () => {
			const ended = (await over.isVisible()) || (await finale.isVisible());
			const next = (await groupLabel(page).allTextContents()).some((text) =>
				GROUP_LABEL.test(text)
			);
			expect(ended || next).toBe(true);
		}).toPass({ timeout: STEP_TIMEOUT });
		if (await finale.isVisible()) await finale.click();
		if (await over.isVisible()) return;
	}
}

// The policy written in the pages is the same text for every engine; each one enforces it below.
test(
	'writes the policy in every page, with no source outside the site',
	CHROMIUM_ONLY,
	async ({ page }) => {
		for (const path of PAGES) {
			await openPage(page, path);
			const policy = await policyOf(page);
			for (const directive of REQUIRED_DIRECTIVES) expect(policy, path).toContain(directive);
			const scripts = /script-src ([^;]*)/.exec(policy)?.[1] ?? '';
			expect(scripts, path).toContain("'self'");
			expect(scripts, path).not.toMatch(/unsafe-inline|unsafe-eval|https?:|\*/);
			expect(policy, path).not.toMatch(/https?:\/\/|\*/);
		}
	}
);

test('lets the browser refuse a script written in the page and a request to another site', async ({
	page
}) => {
	const violations = await watchPolicy(page);
	await openPage(page, '/');
	expect(violations).toEqual([]);

	const result = await page.evaluate(async () => {
		const script = document.createElement('script');
		script.textContent = 'window.injectedScriptRan = true;';
		document.body.append(script);
		const sent = await fetch('https://third-party.invalid/collect', { mode: 'no-cors' }).then(
			() => true,
			() => false
		);
		return { ran: 'injectedScriptRan' in window, sent };
	});

	expect(result).toEqual({ ran: false, sent: false });
	await expect.poll(() => violations.some((text) => text.includes('script-src'))).toBe(true);
	await expect.poll(() => violations.some((text) => text.includes('connect-src'))).toBe(true);
});

test('plays a whole lesson with sounds and voice without any violation of the policy', async ({
	page
}, testInfo) => {
	const violations = await watchPolicy(page);
	const voices: number[] = [];
	page.on('response', (response) => {
		if (/\/voice\/fr\/[^/]+\.mp3$/.test(new URL(response.url()).pathname)) {
			voices.push(response.status());
		}
	});
	await setRewards(page, 'instant');

	const child = advancedProfile({ name: 'Mina', passed: {} });
	await openPage(page, '/jouer');
	await installProfile(page, {
		...child,
		settings: { ...child.settings, soundEnabled: true, voiceEnabled: true }
	});
	await openPage(page, '/');
	await page.getByRole('link', { name: message('home_play'), exact: true }).click();
	await page.getByRole('button', { name: child.name }).click();
	await expect(heading(page, message('play_map_title'))).toBeVisible();

	await page.getByRole('button', { name: FIRST.title }).click();
	await throughStory(page, heading(page, FIRST.title));
	await page.locator('button[data-proposed]').click();
	await typeLessonToResult(page);
	await button(page, message('play_result_map')).click();
	await expect(heading(page, message('play_map_title'))).toBeVisible();

	// The voice was asked for, and the policy let it through. The WebKit of Playwright for Windows
	// has no audio player and asks for no sound at all (Q-06): nothing to count there.
	if (testInfo.project.name !== 'webkit') expect(voices.length).toBeGreaterThan(0);
	expect(voices.filter((status) => status >= 400)).toEqual([]);
	expect(violations).toEqual([]);
});

test('saves and loads a backup file without any violation of the policy', async ({ page }) => {
	const violations = await watchPolicy(page);
	const child = advancedProfile({ name: 'Mina', passed: { [FIRST.id]: 3 } });
	await openPage(page, '/jouer');
	await installProfile(page, child);
	await reloadPage(page);

	await openPage(page, '/adulte');
	const words = (await page.locator('[data-gate-words]').textContent())?.trim();
	const asked = gateNumbers.find((entry) => entry.words === words);
	await page.locator('[data-gate-answer]').fill(String(asked?.value ?? ''));
	await page.keyboard.press('Enter');
	await expect(page.locator('[data-adult-home]')).toBeVisible();

	const download = page.waitForEvent('download');
	await page.locator('[data-backup-all]').click();
	const text = readFileSync(await (await download).path(), 'utf8');
	expect((JSON.parse(text) as { profiles: { name: string }[] }).profiles[0]?.name).toBe(child.name);

	await page.locator('[data-backup-load] input[type="file"]').setInputFiles({
		name: 'sauvegarde.json',
		mimeType: 'application/json',
		buffer: Buffer.from(text)
	});
	await expect(page.locator('[data-import-conflicts]')).toContainText(
		message('adult_import_conflict_legend', { name: child.name })
	);
	expect(violations).toEqual([]);
});

test.describe('with the offline copy', () => {
	test.use({ serviceWorkers: 'allow' });

	test('installs the service worker under the policy', async ({ page }) => {
		// The worker downloads the whole game before it is ready: long on a busy machine.
		test.slow();
		const violations = await watchPolicy(page);
		await openPage(page, '/');
		await page.evaluate(() => navigator.serviceWorker.ready);
		await expect
			.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
			.toBe(true);
		expect(violations).toEqual([]);
	});
});
