import { readFileSync } from 'node:fs';
import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { CHROMIUM_ONLY } from './engines';
import {
	advancedProfile,
	expectNoAxeViolation,
	installProfile,
	loadMessages,
	openPage,
	readJson
} from './support';

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

/*
 * The pages for adults (J5, lot 5): reached from the home page and the adult space, never from a
 * screen of the child; readable at 320 pixels, by keyboard alone; the guide prints on one sheet,
 * the sheet for professionals on two pages at most.
 */
const NARROW = { width: 320, height: 640 } as const;
/** One A4 sheet, printed on both sides. */
const MAX_PRINTED_PAGES = 2;
const PRESS_BUDGET = 40;
const PROFESSIONALS = '/pour-les-professionnels';
const REVIEW_FORM =
	'https://github.com/pierrodotcom/dactylodys/issues/new?template=relecture-ergotherapeute.yml';

const { message } = loadMessages();
const gateNumbers = readJson<{ numbers: { value: number; words: string }[] }>(
	'content/fr/adult/gate-numbers.json'
).numbers;

const PAGES = [
	{ path: '/pour-les-adultes', title: message('info_link_adults') },
	{ path: PROFESSIONALS, title: message('info_link_professionals') },
	{ path: '/confidentialite', title: message('info_link_privacy') },
	{ path: '/accessibilite', title: message('info_link_accessibility') },
	{ path: '/credits', title: message('info_link_credits') }
] as const;
const PATHS = PAGES.map((info) => info.path);
const REPOSITORY = 'https://github.com/pierrodotcom/dactylodys';
/** The rows of the table of `static/ATTRIBUTIONS.md`, without its two heading lines. */
const ATTRIBUTION_ROWS = readFileSync('static/ATTRIBUTIONS.md', 'utf8')
	.split(/\r?\n/)
	.filter((line) => line.startsWith('|'))
	.slice(2);
const ATTRIBUTION_ADDRESSES = ATTRIBUTION_ROWS.flatMap(
	(row) => row.match(/https?:\/\/[^\s,)|]+/g) ?? []
);

function heading(page: Page, name: string) {
	return page.getByRole('heading', { level: 1, name });
}

function infoLinks(page: Page): Locator {
	return page.locator('[data-info-links] a');
}

async function pathsOf(links: Locator): Promise<string[]> {
	return links.evaluateAll((all) => all.map((link) => (link as HTMLAnchorElement).pathname));
}

/** Like `focusByTab` in accessibility.spec.ts: WebKit leaves links out of Tab (L-105). */
async function focusByTab(page: Page, target: Locator) {
	await expect(target).toBeVisible();
	const isWebKit = page.context().browser()?.browserType().name() === 'webkit';
	if (isWebKit && (await target.evaluate((element) => element instanceof HTMLAnchorElement))) {
		await target.focus();
		return;
	}
	for (let press = 0; press < PRESS_BUDGET; press++) {
		if (await target.evaluate((element) => element === document.activeElement)) return;
		await page.keyboard.press('Tab');
	}
	throw new Error('The element cannot be reached with the Tab key');
}

async function gateNumber(page: Page): Promise<number> {
	const words = (await page.locator('[data-gate-words]').textContent())?.trim();
	const number = gateNumbers.find((entry) => entry.words === words);
	if (!number) throw new Error(`unknown gate number: ${words}`);
	return number.value;
}

test(
	'links the pages for adults from the foot of the home page',
	CHROMIUM_ONLY,
	async ({ page }) => {
		await openPage(page, '/');
		expect(await pathsOf(page.locator('footer [data-info-links] a'))).toEqual(PATHS);

		for (const info of PAGES) {
			await openPage(page, '/');
			await page.locator('footer').getByRole('link', { name: info.title, exact: true }).click();
			await expect(page).toHaveURL(new RegExp(`${info.path}$`));
			await expect(heading(page, info.title)).toBeVisible();
			await expect(page).toHaveTitle(
				message('info_page_title', { page: info.title, appName: message('app_name') })
			);
		}
	}
);

test(
	'links the pages for adults from the adult space, and not from the screens of the child',
	CHROMIUM_ONLY,
	async ({ page }) => {
		await openPage(page, '/jouer');
		await installProfile(page, advancedProfile({ name: 'Lou', passed: {} }));
		await openPage(page, '/jouer');
		await expect(heading(page, message('play_players_title'))).toBeVisible();
		expect(await infoLinks(page).count()).toBe(0);

		await openPage(page, '/adulte');
		await page.locator('[data-gate-answer]').fill(String(await gateNumber(page)));
		await page.keyboard.press('Enter');
		await expect(page.locator('[data-adult-home]')).toBeVisible();
		const section = page.locator('[data-adult-info]');
		await expect(section.getByRole('heading', { level: 2 })).toHaveText(
			message('info_links_label')
		);
		expect(await pathsOf(section.locator('a'))).toEqual(PATHS);
	}
);

test('marks the page shown among the links at its foot', CHROMIUM_ONLY, async ({ page }) => {
	for (const info of PAGES) {
		await openPage(page, info.path);
		const current = page.locator('footer a[aria-current="page"]');
		await expect(current).toHaveText(info.title);
	}
});

test(
	'gives each page one title, then sections one level below',
	CHROMIUM_ONLY,
	async ({ page }) => {
		for (const info of PAGES) {
			await openPage(page, info.path);
			const levels = await page
				.locator('main :is(h1, h2, h3, h4)')
				.evaluateAll((all) => all.map((element) => Number(element.tagName.slice(1))));
			expect(levels[0], info.path).toBe(1);
			expect(
				levels.filter((level) => level === 1),
				info.path
			).toHaveLength(1);
			const jumps = levels.slice(1).filter((level, index) => level > (levels[index] ?? 0) + 1);
			expect(jumps, info.path).toEqual([]);
			await expect(page.getByRole('main')).toHaveCount(1);
			await expect(page.getByRole('contentinfo')).toHaveCount(1);
		}
	}
);

test('says on the guide that the game is no treatment', CHROMIUM_ONLY, async ({ page }) => {
	await openPage(page, '/pour-les-adultes');
	await expect(page.locator('[data-info-notice]')).toHaveText(message('guide_not_treatment'));
});

test('sends a problem to the issues of the repository', CHROMIUM_ONLY, async ({ page }) => {
	await openPage(page, '/accessibilite');
	await expect(page.locator('[data-issues-link]')).toHaveAttribute(
		'href',
		'https://github.com/pierrodotcom/dactylodys/issues'
	);
});

test('opens a page from the home page and goes back, by keyboard alone', async ({ page }) => {
	for (const info of PAGES) {
		await openPage(page, '/');
		await focusByTab(page, page.locator('footer').getByRole('link', { name: info.title }));
		await page.keyboard.press('Enter');
		await expect(heading(page, info.title)).toBeVisible();

		// Escape takes the way out at the top, as on every screen with one (ADR-046).
		await page.keyboard.press('Escape');
		await expect(page).toHaveURL(/\/$/);
		await expect(heading(page, message('app_name'))).toBeVisible();
	}
});

test.describe('the credits page', () => {
	test('names the licenses, the repository and every attribution, by keyboard alone', async ({
		page
	}) => {
		await openPage(page, '/');
		await focusByTab(
			page,
			page.locator('footer').getByRole('link', { name: message('info_link_credits'), exact: true })
		);
		await page.keyboard.press('Enter');
		await expect(heading(page, message('info_link_credits'))).toBeVisible();

		const main = page.getByRole('main');
		await expect(main).toContainText('AGPL-3.0-or-later');
		await expect(main).toContainText('CC BY-SA 4.0');
		await expect(main).toContainText('données dérivées du CLDR (licence Unicode)');
		await expect(main).not.toContainText('CC0');
		await expect(main.locator('[data-repository-link]')).toHaveAttribute('href', REPOSITORY);

		expect(ATTRIBUTION_ROWS.length).toBeGreaterThan(0);
		await expect(main.locator('[data-credit-source]')).toHaveCount(ATTRIBUTION_ROWS.length);
		const links = main.getByRole('link');
		const linked = await links.evaluateAll((all) =>
			all.map((link) => (link as HTMLAnchorElement).href)
		);
		expect(linked).toEqual(expect.arrayContaining(ATTRIBUTION_ADDRESSES));

		for (const link of await links.all()) await focusByTab(page, link);
		await page.keyboard.press('Escape');
		await expect(heading(page, message('app_name'))).toBeVisible();
	});

	test('names the host of the site on the privacy page', CHROMIUM_ONLY, async ({ page }) => {
		await openPage(page, '/confidentialite');
		const host = page.locator('[data-privacy-host]');
		await expect(host).toContainText('GitHub Pages');
		await expect(host).toContainText('adresse IP');
	});
});

test.describe('a page for adults opened from the adult space', () => {
	async function openAdultSpace(page: Page) {
		await openPage(page, '/adulte');
		await page.locator('[data-gate-answer]').fill(String(await gateNumber(page)));
		await page.keyboard.press('Enter');
		await expect(page.locator('[data-adult-home]')).toBeVisible();
	}

	function adultLink(page: Page, title: string): Locator {
		return page.locator('[data-adult-info]').getByRole('link', { name: title, exact: true });
	}

	function wayOut(page: Page): Locator {
		return page.locator('[data-screen-back]').getByRole('button');
	}

	test('leads back to the adult space without the gate, by keyboard alone', async ({ page }) => {
		await openAdultSpace(page);
		for (const info of PAGES) {
			await focusByTab(page, adultLink(page, info.title));
			await page.keyboard.press('Enter');
			await expect(heading(page, info.title)).toBeVisible();
			await expect(wayOut(page)).toHaveText(message('info_back'));

			await page.keyboard.press('Escape');
			await expect(page).toHaveURL(/\/adulte$/);
			await expect(page.locator('[data-adult-home]')).toBeVisible();
			await expect(page.locator('[data-gate-answer]')).toHaveCount(0);
		}
	});

	test('stays open from one page to the next and through the Back button of the browser', async ({
		page
	}) => {
		await openAdultSpace(page);
		await adultLink(page, message('info_link_privacy')).click();
		await expect(heading(page, message('info_link_privacy'))).toBeVisible();
		await page
			.locator('footer')
			.getByRole('link', { name: message('info_link_credits'), exact: true })
			.click();
		await expect(heading(page, message('info_link_credits'))).toBeVisible();
		await expect(wayOut(page)).toHaveText(message('info_back'));

		await page.goBack();
		await expect(heading(page, message('info_link_privacy'))).toBeVisible();
		await page.goBack();
		await expect(page.locator('[data-adult-home]')).toBeVisible();
		await expect(page.locator('[data-gate-answer]')).toHaveCount(0);
	});

	test('meets the gate again once the adult has left the adult space', async ({ page }) => {
		await openAdultSpace(page);
		await adultLink(page, message('info_link_accessibility')).click();
		// The way out of the page for adults, not the one of the adult space still on screen.
		await expect(heading(page, message('info_link_accessibility'))).toBeVisible();
		await wayOut(page).click();
		await expect(page.locator('[data-adult-home]')).toBeVisible();

		await wayOut(page).click();
		await expect(page).toHaveURL(/\/jouer$/);
		await page.goBack();
		await expect(page).toHaveURL(/\/adulte$/);
		await expect(page.locator('[data-gate-answer]')).toBeVisible();
		await expect(page.locator('[data-adult-home]')).toHaveCount(0);
	});

	/*
	 * A navigation started while another one is on its way runs no `beforeNavigate` (SvelteKit): an
	 * adult who leaves while a page for adults is still opening (a slow machine) did not close the
	 * space, and the Back button of the browser showed it again without the gate (ADR-087).
	 */
	test('meets the gate again when the adult left while a page for adults was still opening', async ({
		page
	}) => {
		await openAdultSpace(page);
		let release = () => {};
		const held = new Promise<void>((resolve) => {
			release = resolve;
		});
		let holding = true;
		// The code of the first page to open next is held on its way, as on a slow machine.
		await page.route('**/_app/immutable/nodes/**', async (route) => {
			if (holding) {
				holding = false;
				await held;
			}
			await route.continue();
		});
		await adultLink(page, message('info_link_accessibility')).click();
		await expect(page.locator('[data-adult-home]')).toBeVisible();
		await expect(wayOut(page)).toHaveText(message('adult_back_to_players'));
		await wayOut(page).click();
		await expect(page).toHaveURL(/\/jouer$/);
		release();

		await page.goBack();
		await expect(page).toHaveURL(/\/adulte$/);
		await expect(page.locator('[data-gate-answer]')).toBeVisible();
		await expect(page.locator('[data-adult-home]')).toHaveCount(0);
	});

	test(
		'leads to the home page when it was not opened from the adult space',
		CHROMIUM_ONLY,
		async ({ page }) => {
			await openPage(page, '/adulte');
			await expect(page.locator('[data-gate-answer]')).toBeVisible();
			await openPage(page, '/credits');
			await expect(wayOut(page)).toHaveText(message('info_back_home'));
		}
	);
});

test.describe('reflow at 320 pixels', CHROMIUM_ONLY, () => {
	test.use({ viewport: NARROW });

	test('keeps the pages for adults and the home page within the width of the page', async ({
		page
	}) => {
		const outside: Record<string, number> = {};
		for (const path of ['/', ...PATHS]) {
			await openPage(page, path);
			await page.evaluate(() => document.fonts.ready);
			const extra = await page.evaluate(
				() => document.documentElement.scrollWidth - document.documentElement.clientWidth
			);
			if (extra > 0) outside[path] = extra;
		}
		expect(outside).toEqual({});
	});
});

test.describe('printing', () => {
	for (const path of ['/pour-les-adultes', PROFESSIONALS]) {
		// Only Chromium prints a page to PDF.
		test(`prints ${path} on one A4 sheet, both sides`, CHROMIUM_ONLY, async ({ page }) => {
			await openPage(page, path);
			await page.evaluate(() => document.fonts.ready);
			await page.emulateMedia({ media: 'print' });
			const pdf = (await page.pdf({ preferCSSPageSize: true, printBackground: false })).toString(
				'latin1'
			);
			const pages = pdf.match(/\/Type\s*\/Page(?![a-zA-Z])/g)?.length ?? 0;

			expect(pages).toBeGreaterThan(0);
			expect(pages).toBeLessThanOrEqual(MAX_PRINTED_PAGES);
		});
	}

	test('prints dark ink on light paper in the dark theme, without its buttons', async ({
		page
	}) => {
		await page.emulateMedia({ colorScheme: 'dark' });
		await openPage(page, '/pour-les-adultes');
		const screen = await page.evaluate(() => getComputedStyle(document.body).color);
		await page.emulateMedia({ colorScheme: 'dark', media: 'print' });

		const printed = await page.evaluate(() => {
			const probe = document.createElement('span');
			probe.style.color = 'var(--dd-color-print-text)';
			document.body.append(probe);
			const ink = getComputedStyle(probe).color;
			probe.remove();
			return { body: getComputedStyle(document.body).color, ink };
		});
		expect(printed.body).toBe(printed.ink);
		expect(printed.body).not.toBe(screen);
		await expect(page.locator('[data-screen-back]')).toBeHidden();
		await expect(page.locator('footer')).toBeHidden();
		await expect(page.getByRole('button', { name: message('info_print') })).toBeHidden();
	});
});

test.describe('the sheet for professionals', () => {
	const title = message('info_link_professionals');

	test('opens from the guide for adults, by keyboard alone', async ({ page }) => {
		await openPage(page, '/pour-les-adultes');
		const link = page.locator('main [data-professionals-link]');
		await expect(link).toHaveText(message('guide_professionals_link'));
		await focusByTab(page, link);
		await page.keyboard.press('Enter');

		await expect(page).toHaveURL(new RegExp(`${PROFESSIONALS}$`));
		await expect(heading(page, title)).toBeVisible();
	});

	test('prints with its button, by keyboard alone', async ({ page }) => {
		await openPage(page, PROFESSIONALS);
		await page.evaluate(() => {
			const counted = window as unknown as { printed: number };
			counted.printed = 0;
			window.print = () => {
				counted.printed += 1;
			};
		});
		await focusByTab(page, page.getByRole('button', { name: message('info_print') }));
		await page.keyboard.press('Enter');

		await expect
			.poll(() => page.evaluate(() => (window as unknown as { printed: number }).printed))
			.toBe(1);
	});

	test('gives on paper the addresses that cannot be clicked there', async ({ page }) => {
		await openPage(page, PROFESSIONALS);
		const gameAddress = page.locator('[data-game-address]');
		const formAddress = page.getByText(message('pro_review_address', { url: REVIEW_FORM }));
		await expect(gameAddress).toBeHidden();
		await expect(formAddress).toBeHidden();
		await expect(page.locator('[data-review-link]')).toBeVisible();

		await page.emulateMedia({ media: 'print' });
		const url = new URL('/', page.url()).href;
		await expect(gameAddress).toHaveText(message('pro_game_address', { url }));
		await expect(formAddress).toBeVisible();
		await expect(page.locator('[data-review-link]')).toBeHidden();
		await expect(page.locator('[data-research-link]')).toBeHidden();
	});

	test('says that the game is no treatment', CHROMIUM_ONLY, async ({ page }) => {
		await openPage(page, PROFESSIONALS);
		await expect(page.locator('[data-info-notice]')).toHaveText(message('pro_not_treatment'));
	});

	test('sends the review to the issue form of the repository', CHROMIUM_ONLY, async ({ page }) => {
		await openPage(page, PROFESSIONALS);
		await expect(page.locator('[data-review-link]')).toHaveAttribute('href', REVIEW_FORM);
		const questions = await page.locator('[data-review-questions] > li').count();
		expect(questions).toBeGreaterThanOrEqual(5);
		expect(questions).toBeLessThanOrEqual(8);
	});

	test('shows the same section titles as its Markdown version', CHROMIUM_ONLY, async ({ page }) => {
		const sheet = readFileSync('docs/fiche-professionnels.md', 'utf8');
		const headings = [...sheet.matchAll(/^## (.+)$/gm)].map((match) => match[1]?.trim());

		await openPage(page, PROFESSIONALS);
		await expect(page.locator('main h2')).toHaveText(headings as string[]);
	});
});

test.describe('pages for adults, light and dark themes', () => {
	test('has no axe violation on the pages for adults and the home page', async ({ page }) => {
		for (const path of ['/', ...PATHS]) {
			await openPage(page, path);
			await expectNoAxeViolation(page);
		}
	});

	test('has no axe violation at 320 pixels on the pages for adults', async ({ page }) => {
		await page.setViewportSize(NARROW);
		for (const path of PATHS) {
			await openPage(page, path);
			await expectNoAxeViolation(page);
		}
	});
});
