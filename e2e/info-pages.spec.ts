import AxeBuilder from '@axe-core/playwright';
import { expect as baseExpect, test, type Locator, type Page } from '@playwright/test';
import { installProfile, advancedProfile, loadMessages, openPage, readJson } from './support';

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

/*
 * The pages for adults (J5, lot 5): reached from the home page and the adult space, never from a
 * screen of the child; readable at 320 pixels, by keyboard alone; the guide prints on one sheet.
 */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;
const NARROW = { width: 320, height: 640 } as const;
/** One A4 sheet, printed on both sides. */
const MAX_PRINTED_PAGES = 2;
const PRESS_BUDGET = 40;

const { message } = loadMessages();
const gateNumbers = readJson<{ numbers: { value: number; words: string }[] }>(
	'content/fr/adult/gate-numbers.json'
).numbers;

const PAGES = [
	{ path: '/pour-les-adultes', title: message('info_link_adults') },
	{ path: '/confidentialite', title: message('info_link_privacy') },
	{ path: '/accessibilite', title: message('info_link_accessibility') }
] as const;
const PATHS = PAGES.map((info) => info.path);

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

async function expectNoAxeViolation(page: Page) {
	await page.evaluate(() => document.fonts.ready);
	const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
	expect(results.violations).toEqual([]);
}

async function gateNumber(page: Page): Promise<number> {
	const words = (await page.locator('[data-gate-words]').textContent())?.trim();
	const number = gateNumbers.find((entry) => entry.words === words);
	if (!number) throw new Error(`unknown gate number: ${words}`);
	return number.value;
}

test('links the three pages from the foot of the home page', async ({ page }) => {
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
});

test('links the three pages from the adult space, and not from the screens of the child', async ({
	page
}) => {
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
	await expect(section.getByRole('heading', { level: 2 })).toHaveText(message('info_links_label'));
	expect(await pathsOf(section.locator('a'))).toEqual(PATHS);
});

test('marks the page shown among the links at its foot', async ({ page }) => {
	for (const info of PAGES) {
		await openPage(page, info.path);
		const current = page.locator('footer a[aria-current="page"]');
		await expect(current).toHaveText(info.title);
	}
});

test('gives each page one title, then sections one level below', async ({ page }) => {
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
});

test('says on the guide that the game is no treatment', async ({ page }) => {
	await openPage(page, '/pour-les-adultes');
	await expect(page.locator('[data-info-notice]')).toHaveText(message('guide_not_treatment'));
});

test('sends a problem to the issues of the repository', async ({ page }) => {
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

test.describe('reflow at 320 pixels', () => {
	test.use({ viewport: NARROW });

	test('keeps the three pages and the home page within the width of the page', async ({ page }) => {
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
	test('prints the guide for adults on one A4 sheet, both sides', async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== 'chromium', 'Only Chromium prints a page to PDF');
		await openPage(page, '/pour-les-adultes');
		await page.evaluate(() => document.fonts.ready);
		await page.emulateMedia({ media: 'print' });
		const pdf = (await page.pdf({ preferCSSPageSize: true, printBackground: false })).toString(
			'latin1'
		);
		const pages = pdf.match(/\/Type\s*\/Page(?![a-zA-Z])/g)?.length ?? 0;

		expect(pages).toBeGreaterThan(0);
		expect(pages).toBeLessThanOrEqual(MAX_PRINTED_PAGES);
	});

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

for (const colorScheme of COLOR_SCHEMES) {
	test.describe(`pages for adults, ${colorScheme} theme`, () => {
		test.use({ colorScheme });

		test('has no axe violation on the three pages and the home page', async ({ page }) => {
			for (const path of ['/', ...PATHS]) {
				await openPage(page, path);
				await expectNoAxeViolation(page);
			}
		});

		test('has no axe violation at 320 pixels on the three pages', async ({ page }) => {
			await page.setViewportSize(NARROW);
			for (const path of PATHS) {
				await openPage(page, path);
				await expectNoAxeViolation(page);
			}
		});
	});
}
