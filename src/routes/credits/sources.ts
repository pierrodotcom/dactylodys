import { voice } from '../../../static/voice/fr/manifest.json';

/** Names of licenses are the same in every language: they are not messages. */
export const CODE_LICENSE = 'AGPL-3.0-or-later';
export const CONTENT_LICENSE = 'CC BY-SA 4.0';

export interface CreditSource {
	readonly id: string;
	/** What tells its row apart in the table of `static/ATTRIBUTIONS.md`. */
	readonly attribution: string;
	/** As written in that table, or the part of it that names the license. */
	readonly license: string;
	/** Where the resource comes from; none for a recording made for the project. */
	readonly url?: string;
}

/**
 * What the game owes to others, one entry per row of `static/ATTRIBUTIONS.md`: a test fails when
 * a row has no entry here, so that nothing declared there is missing from the credits page.
 */
export const CREDIT_SOURCES = [
	{
		id: 'font',
		attribution: 'Atkinson Hyperlegible Next',
		license: 'SIL Open Font License 1.1',
		url: 'https://github.com/googlefonts/atkinson-hyperlegible-next'
	},
	{
		id: 'layout_pc',
		attribution: '`layouts/fr-fr-azerty-pc.json`',
		license: 'Unicode-DFS-2016',
		url: 'https://github.com/unicode-org/cldr/blob/release-43/keyboards/windows/fr-t-k0-windows.xml'
	},
	{
		id: 'layout_mac',
		attribution: '`layouts/fr-fr-azerty-mac.json`',
		license: 'Unicode-DFS-2016',
		url: 'https://github.com/unicode-org/cldr/blob/release-43/keyboards/osx/fr-t-k0-osx.xml'
	},
	{
		id: 'lexique',
		attribution: 'Lexique 3.83',
		license: CONTENT_LICENSE,
		url: 'http://www.lexique.org/'
	},
	{
		id: 'wiktionary',
		attribution: 'Wiktionnaire',
		license: CONTENT_LICENSE,
		url: 'https://fr.wiktionary.org/'
	},
	{
		id: 'voice',
		attribution: '`static/voice/fr/`',
		license: voice.license
	}
] as const satisfies readonly CreditSource[];

export type CreditSourceId = (typeof CREDIT_SOURCES)[number]['id'];

/** The name the person who lent their voice asked to be credited with, or that they stay anonymous. */
export const VOICE_AUTHOR = voice.name;
