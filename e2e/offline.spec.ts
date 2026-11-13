import AxeBuilder from '@axe-core/playwright';
import {
	expect as baseExpect,
	test,
	type BrowserContext,
	type Locator,
	type Page
} from '@playwright/test';
import { loadMessages, openPage, readJson, shortenRewards, throughStory } from './support';

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;
const PLAYER_NAME = 'Mini';
const STEP_TIMEOUT = 15_000;
const IPHONE_USER_AGENT =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
/** Every page that is prerendered, which must open without a connection. */
const PAGES = [
	'/',
	'/jouer',
	'/adulte',
	'/pour-les-adultes',
	'/pour-les-professionnels',
	'/confidentialite',
	'/accessibilite',
	'/dev/ui',
	'/dev/compagnon'
];

const { message, templateRegex } = loadMessages();
const GROUP_LABEL = templateRegex('ui_target_text_label');
const progression = readJson<{ worlds: { lessons: { id: string; title: string }[] }[] }>(
	'content/fr/progression/azerty-decouverte.json'
);
const FIRST = progression.worlds[0]?.lessons[0] as { id: string; title: string };
const keyboardCheckCodes = readJson<{ keyboardCheckCodes: string[] }>(
	'content/common/play-rules.json'
).keyboardCheckCodes;
const azerty = readJson<{ keys: Record<string, { base?: string }> }>(
	'layouts/fr-fr-azerty-pc.json'
);
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

/** The first visit: the service worker has taken the page and the whole site is in its cache. */
async function visitOnce(page: Page, url = '/') {
	await openPage(page, url);
	await page.evaluate(() => navigator.serviceWorker.ready);
	await expect
		.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
		.toBe(true);
}

async function goOffline(context: BrowserContext) {
	await context.setOffline(true);
}

async function passGate(page: Page) {
	const words = (await page.locator('[data-gate-words]').textContent())?.trim();
	const asked = gateNumbers.find((entry) => entry.words === words);
	if (!asked) throw new Error(`unknown gate number: ${words}`);
	await page.getByLabel(message('adult_gate_answer_label')).fill(String(asked.value));
	await button(page, message('adult_gate_enter')).click();
	await expect(page.locator('[data-adult-home]')).toBeVisible();
}

async function adultHome(page: Page) {
	await openPage(page, '/adulte');
	await passGate(page);
}

async function typeLessonToResult(page: Page) {
	for (;;) {
		const label = groupLabel(page);
		await expect(label).toHaveText(GROUP_LABEL);
		const group = GROUP_LABEL.exec((await label.textContent()) ?? '')?.groups?.['text'] ?? '';
		await page.keyboard.type(group);
		await page.keyboard.press('Enter');
		const over = button(page, message('play_result_map'));
		const finale = button(page, message('game_shared_finale_continue'));
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

test.describe('offline', () => {
	test.use({ serviceWorkers: 'allow' });

	test.beforeEach(async ({ page }) => {
		await shortenRewards(page);
	});

	test('plays a whole lesson without a connection after one visit', async ({ page, context }) => {
		test.slow();
		await visitOnce(page);
		await goOffline(context);

		await page.reload();
		await expect(page.getByRole('link', { name: message('home_play'), exact: true })).toBeVisible();
		await page.getByRole('link', { name: message('home_play'), exact: true }).click();
		await expect(page).toHaveURL(/\/jouer$/);
		await expect(heading(page, message('play_players_title'))).toBeVisible();

		await button(page, message('play_new_player')).click();
		await page.getByLabel(message('play_new_label')).fill(PLAYER_NAME);
		await button(page, message('play_new_submit')).click();
		await button(page, message('play_check_continue')).click();
		for (const code of keyboardCheckCodes) {
			const letter = azerty.keys[code]?.base ?? '';
			await expect(
				heading(page, message('play_check_prompt', { key: letter.toLocaleUpperCase('fr') }))
			).toBeVisible();
			await page.keyboard.press(letter);
		}
		await button(page, message('play_check_continue')).click();
		await expect(heading(page, message('play_map_title'))).toBeVisible();

		await page.getByRole('button', { name: FIRST.title }).click();
		await throughStory(page, heading(page, FIRST.title));
		await page.locator('button[data-proposed]').click();
		await typeLessonToResult(page);
		await expect(heading(page, message('play_result_headline_3'))).toBeVisible();
	});

	test('opens every page of the site without a connection', async ({ page, context }) => {
		await visitOnce(page);
		await goOffline(context);
		for (const path of PAGES) {
			const response = await page.goto(path);
			expect(response?.status(), path).toBe(200);
			await expect(page.locator('h1').first(), path).toBeVisible();
		}
	});

	test('keeps the voices and answers the pieces of a sound that browsers ask for', async ({
		page,
		context
	}) => {
		await visitOnce(page);
		await goOffline(context);
		const result = await page.evaluate(async () => {
			const manifestResponse = await fetch('voice/fr/manifest.json');
			const manifest = (await manifestResponse.json()) as {
				clips: Record<string, { file: string }>;
			};
			const file = Object.values(manifest.clips)[0]?.file ?? '';
			const whole = await fetch(`voice/fr/${file}`);
			const piece = await fetch(`voice/fr/${file}`, { headers: { Range: 'bytes=0-9' } });
			return {
				manifest: manifestResponse.status,
				whole: whole.status,
				piece: piece.status,
				pieceLength: (await piece.arrayBuffer()).byteLength
			};
		});
		expect(result).toEqual({ manifest: 200, whole: 200, piece: 206, pieceLength: 10 });
	});

	test('keeps nothing that comes from another site', async ({ page, baseURL }) => {
		await visitOnce(page);
		const foreign = await page.evaluate(
			async (origin) => {
				const urls: string[] = [];
				for (const name of await caches.keys()) {
					for (const request of await (await caches.open(name)).keys()) {
						if (new URL(request.url).origin !== origin) urls.push(request.url);
					}
				}
				return urls;
			},
			new URL(baseURL ?? '').origin
		);
		expect(foreign).toEqual([]);
	});
});

test.describe('installation', () => {
	test('serves a manifest named after app_name with icons that exist', async ({
		page,
		request
	}) => {
		await openPage(page, '/');
		const link = page.locator('link[rel="manifest"]');
		await expect(link).toHaveCount(1);
		const href = await link.getAttribute('href');
		const response = await page.request.get(new URL(href ?? '', page.url()).href);
		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toMatch(/json/);

		const manifest = (await response.json()) as {
			name: string;
			short_name: string;
			display: string;
			start_url: string;
			icons: { src: string; sizes: string; purpose: string }[];
		};
		expect(manifest.name).toBe(message('app_name'));
		expect(manifest.short_name).toBe(message('app_name'));
		expect(manifest.display).toBe('standalone');
		expect(new URL(manifest.start_url, response.url()).href).toBe(new URL('./', page.url()).href);
		expect(manifest.icons.map((icon) => `${icon.sizes} ${icon.purpose}`)).toEqual([
			'192x192 any',
			'512x512 any',
			'512x512 maskable'
		]);
		const icons = [
			...manifest.icons.map((icon) => new URL(icon.src, response.url()).href),
			new URL(
				(await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')) ?? '',
				page.url()
			).href
		];
		for (const icon of icons) {
			const answer = await request.get(icon);
			expect(answer.status(), icon).toBe(200);
			expect(answer.headers()['content-type'], icon).toBe('image/png');
		}
		await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);
	});

	test('shows nothing about installing on the child side', async ({ page }) => {
		await openPage(page, '/jouer');
		await expect(page.getByText(message('adult_install_title'))).toHaveCount(0);
		await expect(button(page, message('adult_install_button'))).toHaveCount(0);
	});

	test('says it cannot install from a browser that offers no installation', async ({ page }) => {
		await adultHome(page);
		await expect(
			page.getByRole('heading', { level: 2, name: message('adult_install_title') })
		).toBeVisible();
		await expect(page.locator('[data-install-answer]')).toHaveText(message('adult_install_other'));
		await expect(button(page, message('adult_install_button'))).toHaveCount(0);
	});

	test('offers the button when the browser sends its installation offer, and starts it by keyboard', async ({
		page
	}) => {
		await adultHome(page);
		await page.evaluate(() => {
			const offer = new Event('beforeinstallprompt', { cancelable: true });
			Object.assign(offer, {
				prompt: () => Promise.resolve(),
				userChoice: Promise.resolve({ outcome: 'accepted' })
			});
			window.dispatchEvent(offer);
			(window as unknown as { offerSeen: boolean }).offerSeen = offer.defaultPrevented;
		});
		expect(await page.evaluate(() => (window as unknown as { offerSeen: boolean }).offerSeen)).toBe(
			true
		);
		const install = button(page, message('adult_install_button'));
		await expect(install).toBeVisible();
		const box = await install.boundingBox();
		expect(box?.height ?? 0).toBeGreaterThanOrEqual(48);

		await install.focus();
		await page.keyboard.press('Enter');
		await expect(page.locator('[data-install-answer]')).toHaveText(
			message('adult_install_started')
		);
		await expect(install).toHaveCount(0);
	});

	test('keeps an offer sent before the adult space was opened', async ({ page }) => {
		await openPage(page, '/jouer');
		await page.evaluate(() => {
			const offer = new Event('beforeinstallprompt', { cancelable: true });
			Object.assign(offer, {
				prompt: () => Promise.resolve(),
				userChoice: Promise.resolve({ outcome: 'dismissed' })
			});
			window.dispatchEvent(offer);
		});
		await page.locator('[data-adult-entry]').click();
		await passGate(page);
		await button(page, message('adult_install_button')).click();
		await expect(page.locator('[data-install-answer]')).toHaveText(
			message('adult_install_declined')
		);
	});

	test('says it is installed once the browser reports the installation', async ({ page }) => {
		await adultHome(page);
		await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
		await expect(page.locator('[data-install-answer]')).toHaveText(
			message('adult_install_done', { appName: message('app_name') })
		);
	});

	test.describe('on an iPhone', () => {
		test.use({ userAgent: IPHONE_USER_AGENT });

		test('explains the Share menu, which is the only way there', async ({ page }) => {
			await adultHome(page);
			await expect(page.locator('[data-install-answer]')).toHaveText(message('adult_install_ios'));
			await expect(button(page, message('adult_install_button'))).toHaveCount(0);
		});
	});

	for (const colorScheme of COLOR_SCHEMES) {
		test.describe(`${colorScheme} theme`, () => {
			test.use({ colorScheme });

			test('has no axe violation on the adult home with the installation offered', async ({
				page
			}) => {
				await adultHome(page);
				await page.evaluate(() => {
					const offer = new Event('beforeinstallprompt', { cancelable: true });
					Object.assign(offer, {
						prompt: () => Promise.resolve(),
						userChoice: Promise.resolve({ outcome: 'accepted' })
					});
					window.dispatchEvent(offer);
				});
				await expect(button(page, message('adult_install_button'))).toBeVisible();
				const scan = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
				expect(scan.violations).toEqual([]);
			});
		});
	}
});
