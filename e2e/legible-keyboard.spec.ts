import { expect as baseExpect, test, type Page } from '@playwright/test';
import { CHROMIUM_ONLY } from './engines';
import { loadMessages, openPage, setRewards } from './support';

/*
 * A drawn keyboard that helps without crowding (audit E-06, E-07, E-11, E-21, E-22, E-24): the key
 * lit carries the sign asked for, shows in both themes and in the forced colours of the system,
 * the hand at rest is a contour, and a soberer keyboard can be chosen.
 */

/** WebKit is slow when two workers run at once: give the page time to react. */
const expect = baseExpect.configure({ timeout: 15_000 });

const LAPTOP = { width: 1280, height: 720 } as const;

const { message, templateRegex } = loadMessages();
const GROUP_LABEL = templateRegex('ui_target_text_label');

function button(page: Page, name: string) {
	return page.getByRole('button', { name, exact: true });
}

/** A game of the trial page, its first group on screen. */
async function startDevGame(page: Page, gameId: string) {
	await openPage(page, '/dev/jeux');
	await page.getByRole('radio', { name: message(`game_${gameId}_title`) }).check();
	await button(page, message('dev_games_play')).click();
	await expect(page.locator('.target-text > .dd-visually-hidden').first()).toHaveText(GROUP_LABEL);
}

test.beforeEach(async ({ page }) => {
	await page.setViewportSize(LAPTOP);
	await setRewards(page, 'instant');
});

test(
	'frames only the character to type, in the colour of a selection, under forced colours',
	CHROMIUM_ONLY,
	async ({ page }) => {
		await startDevGame(page, 'hatching');
		await page.emulateMedia({ forcedColors: 'active' });

		const colours = await page.evaluate(() => {
			const probe = document.createElement('span');
			document.body.append(probe);
			const system = (name: string) => {
				probe.style.color = name;
				return getComputedStyle(probe).color;
			};
			const canvas = system('Canvas');
			const highlight = system('Highlight');
			probe.remove();
			const style = (selector: string) => {
				const element = document.querySelector(selector);
				if (!element) throw new Error(`Nothing matches ${selector}`);
				return getComputedStyle(element);
			};
			return {
				canvas,
				highlight,
				next: style('.target-text [data-state="next"]').borderTopColor,
				current: style('.target-text [data-state="current"]').borderTopColor,
				currentOutline: style('.target-text [data-state="current"]').outlineColor,
				key: style('.keyboard .key[data-target]').outlineColor
			};
		});

		expect(colours.highlight).not.toBe(colours.canvas);
		// A letter still to type has no frame to see: it is drawn in the colour of the page.
		expect(colours.next).toBe(colours.canvas);
		expect(colours.current).toBe(colours.highlight);
		expect(colours.currentOutline).toBe(colours.highlight);
		expect(colours.key).toBe(colours.highlight);
	}
);
