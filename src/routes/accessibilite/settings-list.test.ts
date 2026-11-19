import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * The accessibility page lists the settings by their own labels, in the families of the settings
 * screen (ADR-083). It fell behind the game once (E-13): a setting added to the settings screen
 * must be named here too, in its family, and a setting that is gone must leave the page.
 */
const panel = readFileSync('src/routes/jouer/SettingsPanel.svelte', 'utf8');
const page = readFileSync('src/routes/accessibilite/+page.svelte', 'utf8');
const messages = JSON.parse(readFileSync('messages/fr.json', 'utf8')) as Record<string, string>;

const PANEL_FAMILY =
	/<section class="family" aria-labelledby="settings-family-(\w+)">([\s\S]*?)<\/section>/g;
const PANEL_SETTING = /legend=\{m\.(settings_\w+_label)\(\)\}/g;
const PAGE_FAMILY = /data-settings-family="(\w+)"([\s\S]*?)<\/section>/g;
const PAGE_ITEM = /<li>([\s\S]*?)<\/li>/g;
const PAGE_SETTING = /m\.(settings_\w+_label)\(\)/g;
const PAGE_DESCRIPTION = /m\.(a11y_setting_\w+)\(/;
const ADULT_ONLY = /\{#if adult\}([\s\S]*?)\{\/if\}/g;

interface Family {
	readonly id: string;
	readonly settings: readonly string[];
}

function keysOf(source: string, pattern: RegExp): string[] {
	return [...source.matchAll(pattern)].map((match) => match[1] ?? '');
}

function familiesOf(source: string, family: RegExp, setting: RegExp): Family[] {
	return [...source.matchAll(family)].map((match) => ({
		id: match[1] ?? '',
		settings: keysOf(match[2] ?? '', setting)
	}));
}

const panelFamilies = familiesOf(panel, PANEL_FAMILY, PANEL_SETTING);
const pageFamilies = familiesOf(page, PAGE_FAMILY, PAGE_SETTING);
const adultOnly = new Set(
	[...panel.matchAll(ADULT_ONLY)].flatMap((match) => keysOf(match[1] ?? '', PANEL_SETTING))
);
/** Each setting named on the page, with the message that describes it. */
const pageItems = [...page.matchAll(PAGE_ITEM)].flatMap((match) => {
	const item = match[1] ?? '';
	const description = PAGE_DESCRIPTION.exec(item)?.[1];
	return keysOf(item, PAGE_SETTING).map((setting) => ({ setting, description }));
});

describe('the settings named on the accessibility page', () => {
	it('finds the families and the settings of the settings screen', () => {
		expect(panelFamilies.map((family) => family.id)).toEqual([
			'sound',
			'screen',
			'text',
			'keyboard',
			'player'
		]);
		const settings = panelFamilies.flatMap((family) => family.settings);
		expect(settings.length).toBeGreaterThanOrEqual(15);
		expect(new Set(settings).size).toBe(settings.length);
		for (const key of settings) expect(messages[key], key).toBeTruthy();
		expect(adultOnly.size).toBeGreaterThanOrEqual(4);
	});

	it('are the settings of the settings screen, family by family, in the same order', () => {
		expect(pageFamilies).toEqual(panelFamilies);
	});

	it('give each family its title, as the settings screen names it', () => {
		for (const family of panelFamilies) {
			expect(page, family.id).toContain(`{m.settings_family_${family.id}()}`);
		}
	});

	it('say which settings only the adult changes, in the adult space', () => {
		for (const { setting, description } of pageItems) {
			expect(description, setting).toBeDefined();
			const text = messages[description ?? ''] ?? '';
			expect(text.includes('espace adulte'), `${setting} (${description})`).toBe(
				adultOnly.has(setting)
			);
		}
	});

	it('start with « Tout calmer », before the families', () => {
		const calm = page.indexOf('m.settings_calm_button()');
		expect(calm).toBeGreaterThan(page.indexOf('a11y-settings'));
		expect(calm).toBeLessThan(page.indexOf('data-settings-family'));
		expect(panel).toContain('m.settings_calm_button()');
	});

	it('says that the settings also open from the pause of a game', () => {
		expect(page).toMatch(/a11y_settings_where\(\{[^}]*pause: m\.game_shared_pause\(\)/);
		expect(messages['a11y_settings_where']).toContain('{pause}');
		expect(messages['a11y_settings_where']).toContain('{open}');
	});
});

describe('what the accessibility page claims', () => {
	const limits = page.slice(page.indexOf('a11y-limits'), page.indexOf('a11y-settings'));

	it('no longer says that everything works and that every screen is checked', () => {
		for (const [key, text] of Object.entries(messages)) {
			if (!key.startsWith('a11y_')) continue;
			expect(text, key).not.toMatch(
				/tout se fait au clavier|sans piège|chaque écran (passe|est vérifié)/i
			);
		}
	});

	it('says that the Mac keyboard was not tried on a real Mac, among the known limits', () => {
		expect(messages['a11y_limit_mac'], 'a11y_limit_mac').toBeTruthy();
		expect(limits).toContain('m.a11y_limit_mac()');
	});

	// Corrected since: Tab in a game (ADR-079), the height of a laptop and « Ma cabane » at 200 %
	// zoom (ADR-085), the keyboard drawn in the dark theme (ADR-089).
	it('no longer lists the defects corrected since', () => {
		for (const key of [
			'a11y_limit_tab',
			'a11y_limit_height',
			'a11y_limit_dark',
			'a11y_limit_zoom'
		]) {
			expect(messages[key], key).toBeUndefined();
			expect(page, key).not.toContain(`m.${key}()`);
		}
		for (const [key, text] of Object.entries(messages)) {
			if (!key.startsWith('a11y_')) continue;
			expect(text, key).not.toMatch(/voir les limites|décrit dans les limites/i);
		}
	});

	it('lists the limits that stay until version 1.0, each said once', () => {
		const shown = keysOf(limits, /m\.(a11y_limit_\w+)\(/g);
		expect(shown).toEqual(expect.arrayContaining(['a11y_limit_long_screens', 'a11y_limit_voice']));
		expect(new Set(shown).size).toBe(shown.length);
		for (const key of shown) expect(messages[key], key).toBeTruthy();
		const listed = Object.keys(messages).filter((key) => key.startsWith('a11y_limit_'));
		expect(listed.sort()).toEqual([...shown].sort());
	});
});
