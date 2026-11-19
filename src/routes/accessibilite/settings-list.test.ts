import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * The accessibility page lists the settings by their own labels. It fell behind the game once
 * (E-13): a setting added to the settings screen must be named here too, and a setting that is
 * gone must leave the page.
 */
const panel = readFileSync('src/routes/jouer/SettingsPanel.svelte', 'utf8');
const page = readFileSync('src/routes/accessibilite/+page.svelte', 'utf8');
const messages = JSON.parse(readFileSync('messages/fr.json', 'utf8')) as Record<string, string>;

/** What names a setting on its screen: the legend of a group of choices, or the calm button. */
const PANEL_SETTING = /legend=\{m\.(settings_\w+_label)\(\)\}|m\.(settings_calm_button)\(\)/g;
const PAGE_SETTING = /m\.(settings_\w+_label|settings_calm_button)\(\)/g;

function keysOf(source: string, pattern: RegExp): string[] {
	return [...source.matchAll(pattern)].map((match) => match[1] ?? match[2] ?? '').sort();
}

const list = page.slice(page.indexOf('data-settings-list'));

describe('the settings named on the accessibility page', () => {
	const inPanel = keysOf(panel, PANEL_SETTING);
	const onPage = keysOf(list, PAGE_SETTING);

	it('finds the settings of the settings screen', () => {
		expect(inPanel.length).toBeGreaterThanOrEqual(14);
		expect(new Set(inPanel).size).toBe(inPanel.length);
		expect(inPanel).toContain('settings_calm_button');
		for (const key of inPanel) expect(messages[key], key).toBeTruthy();
	});

	it('are exactly the settings of the settings screen', () => {
		expect(onPage).toEqual(inPanel);
	});

	it('says that the settings also open from the pause of a game', () => {
		expect(page).toMatch(/a11y_settings_where\(\{[^}]*pause: m\.game_shared_pause\(\)/);
		expect(messages['a11y_settings_where']).toContain('{pause}');
		expect(messages['a11y_settings_where']).toContain('{open}');
	});
});

describe('what the accessibility page claims', () => {
	it('no longer says that everything works and that every screen is checked', () => {
		for (const [key, text] of Object.entries(messages)) {
			if (!key.startsWith('a11y_')) continue;
			expect(text, key).not.toMatch(
				/tout se fait au clavier|sans piège|chaque écran (passe|est vérifié)/i
			);
		}
	});

	it('says that the Mac keyboard was not tried on a real Mac, among the known limits', () => {
		const limits = page.slice(page.indexOf('a11y-limits'), page.indexOf('a11y-ongoing'));
		expect(messages['a11y_limit_mac'], 'a11y_limit_mac').toBeTruthy();
		expect(limits).toContain('m.a11y_limit_mac()');
	});

	it('lists the known defects that are being corrected', () => {
		for (const key of [
			'a11y_limit_tab',
			'a11y_limit_height',
			'a11y_limit_dark',
			'a11y_limit_zoom'
		]) {
			expect(messages[key], key).toBeTruthy();
			expect(page, key).toContain(`m.${key}()`);
		}
	});
});
