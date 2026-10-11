import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fingerForKey, parseFingeringProfile } from '../../src/lib/keyboard/fingering';
import { buildCharIndex, findUnproducible, parseLayout } from '../../src/lib/keyboard/layout';
import { FINGERING_PROFILE_IDS, LAYOUT_IDS } from '../../src/lib/keyboard/layout-ids';

const LAYOUTS_DIR = 'layouts';
const FINGERING_DIR = 'layouts/fingering';

const WRITING_KEY_CODES = [
	'Backquote',
	'Backslash',
	'BracketLeft',
	'BracketRight',
	'Comma',
	'Digit0',
	'Digit1',
	'Digit2',
	'Digit3',
	'Digit4',
	'Digit5',
	'Digit6',
	'Digit7',
	'Digit8',
	'Digit9',
	'Equal',
	'IntlBackslash',
	'IntlRo',
	'IntlYen',
	'KeyA',
	'KeyB',
	'KeyC',
	'KeyD',
	'KeyE',
	'KeyF',
	'KeyG',
	'KeyH',
	'KeyI',
	'KeyJ',
	'KeyK',
	'KeyL',
	'KeyM',
	'KeyN',
	'KeyO',
	'KeyP',
	'KeyQ',
	'KeyR',
	'KeyS',
	'KeyT',
	'KeyU',
	'KeyV',
	'KeyW',
	'KeyX',
	'KeyY',
	'KeyZ',
	'Minus',
	'Period',
	'Quote',
	'Semicolon',
	'Slash'
];

const FUNCTIONAL_KEY_CODES = [
	'AltLeft',
	'AltRight',
	'Backspace',
	'CapsLock',
	'ContextMenu',
	'ControlLeft',
	'ControlRight',
	'Enter',
	'MetaLeft',
	'MetaRight',
	'ShiftLeft',
	'ShiftRight',
	'Space',
	'Tab',
	'Delete',
	'End',
	'Help',
	'Home',
	'Insert',
	'PageDown',
	'PageUp',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'ArrowUp',
	'Escape',
	'PrintScreen',
	'ScrollLock',
	'Pause',
	'NumLock'
];

const VALID_KEY_CODES: ReadonlySet<string> = new Set([
	...WRITING_KEY_CODES,
	...FUNCTIONAL_KEY_CODES,
	...Array.from({ length: 24 }, (_, i) => `F${i + 1}`)
]);

function listIds(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
		.map((entry) => entry.name.slice(0, -'.json'.length))
		.sort();
}

function readJson(path: string): unknown {
	return JSON.parse(readFileSync(path, 'utf8'));
}

const layouts = LAYOUT_IDS.map((id) => parseLayout(readJson(`${LAYOUTS_DIR}/${id}.json`)));
const fingeringProfiles = FINGERING_PROFILE_IDS.map((id) =>
	parseFingeringProfile(readJson(`${FINGERING_DIR}/${id}.json`))
);
const byId = Object.fromEntries(layouts.map((layout) => [layout.id, layout]));
const PC = byId['fr-fr-azerty-pc'];
const MAC = byId['fr-fr-azerty-mac'];

if (!PC || !MAC) throw new Error('Expected both shipped layouts');

const PC_INDEX = buildCharIndex(PC);
const MAC_INDEX = buildCharIndex(MAC);

const SENTENCES = [
	'Le garçon mange une pomme à midi, puis il joue dehors.',
	"L'été dernier, nous avons visité une forêt près de la côte ; ça m'a beaucoup plu !",
	'Mon e-mail est jean@exemple.fr et ça coûte 12,50 € (taxes comprises).',
	'Il a dit : "où est le Noël des îles ?" Réponse : 100 % de réussite.',
	'Une naïve brebis égarée a bêlé 3 fois près du pré, ça suffit.',
	'Voici 5 + 5 = 10, puis 7 * 8 - 6 / 3 ; enfin [a], {b}, #c, <d> et _e.'
];

describe('layout files', () => {
	it('has one file per layout identifier and no other file', () => {
		expect(listIds(LAYOUTS_DIR)).toEqual([...LAYOUT_IDS].sort());
	});

	it('has one file per fingering profile identifier and no other file', () => {
		expect(listIds(FINGERING_DIR)).toEqual([...FINGERING_PROFILE_IDS].sort());
	});

	it.each(LAYOUT_IDS)('declares its own identifier in %s', (id) => {
		expect(parseLayout(readJson(`${LAYOUTS_DIR}/${id}.json`)).id).toBe(id);
	});

	it.each(FINGERING_PROFILE_IDS)('declares its own identifier in %s', (id) => {
		expect(parseFingeringProfile(readJson(`${FINGERING_DIR}/${id}.json`)).id).toBe(id);
	});

	it.each(layouts.map((layout) => [layout.id, layout] as const))(
		'lists at least one source with a license in %s',
		(_id, layout) => {
			expect(layout.sources.length).toBeGreaterThan(0);
			for (const source of layout.sources) {
				expect(source.license).not.toBe('');
				expect(source.url).toMatch(/^https:\/\//);
			}
		}
	);
});

describe('key codes', () => {
	it.each(layouts.map((layout) => [layout.id, layout] as const))(
		'uses only valid KeyboardEvent.code values in %s',
		(_id, layout) => {
			const unknown = Object.keys(layout.keys).filter((code) => !VALID_KEY_CODES.has(code));
			expect(unknown).toEqual([]);
		}
	);

	it.each(fingeringProfiles.map((profile) => [profile.id, profile] as const))(
		'uses only valid KeyboardEvent.code values in %s',
		(_id, profile) => {
			const unknown = Object.keys(profile.fingers).filter((code) => !VALID_KEY_CODES.has(code));
			expect(unknown).toEqual([]);
		}
	);
});

describe('dead keys', () => {
	it.each(layouts.map((layout) => [layout.id, layout] as const))(
		'points every dead key reference to a definition in %s',
		(_id, layout) => {
			const references = Object.values(layout.keys).flatMap((levels) =>
				Object.values(levels).flatMap((output) => (typeof output === 'object' ? [output.dead] : []))
			);
			expect(references.length).toBeGreaterThan(0);
			for (const name of references) expect(Object.keys(layout.deadKeys)).toContain(name);
		}
	);

	it.each(layouts.map((layout) => [layout.id, layout] as const))(
		'has no orphan dead key definition in %s',
		(_id, layout) => {
			const referenced = new Set(
				Object.values(layout.keys).flatMap((levels) =>
					Object.values(levels).flatMap((output) =>
						typeof output === 'object' ? [output.dead] : []
					)
				)
			);
			expect([...referenced].sort()).toEqual(Object.keys(layout.deadKeys).sort());
		}
	);

	it.each(layouts.map((layout) => [layout.id, layout] as const))(
		'defines lowercase and uppercase compositions for the vowels of each accent in %s',
		(_id, layout) => {
			for (const name of ['circumflex', 'diaeresis', 'grave']) {
				const compositions = layout.deadKeys[name]?.compositions ?? {};
				for (const vowel of ['a', 'e', 'i', 'o', 'u']) {
					expect(compositions).toHaveProperty([vowel]);
					expect(compositions).toHaveProperty([vowel.toUpperCase()]);
				}
			}
		}
	);
});

describe('fingering coverage', () => {
	const EXTRA_KEYS = [
		'ShiftLeft',
		'ShiftRight',
		'AltRight',
		'Enter',
		'Backspace',
		'Tab',
		'CapsLock'
	];
	const HOME_KEYS = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Space'];

	it.each(fingeringProfiles.map((profile) => [profile.id, profile] as const))(
		'assigns a finger to every key of every %s-compatible layout',
		(_id, profile) => {
			const sameGeometry = layouts.filter((layout) => layout.geometry === profile.geometry);
			expect(sameGeometry.length).toBeGreaterThan(0);
			for (const layout of sameGeometry) {
				for (const code of Object.keys(layout.keys)) {
					expect(fingerForKey(profile, code), `${layout.id} ${code}`).not.toBeNull();
				}
			}
			for (const code of EXTRA_KEYS) expect(fingerForKey(profile, code), code).not.toBeNull();
		}
	);

	it.each(fingeringProfiles.map((profile) => [profile.id, profile] as const))(
		'puts the thumb on Space and the eight resting fingers on their home keys in %s',
		(_id, profile) => {
			expect(fingerForKey(profile, 'Space')).toBe('right-thumb');
			expect(Object.values(profile.homeKeys).sort()).toEqual([...HOME_KEYS].sort());
			expect(profile.homeKeys['left-index']).toBe('KeyF');
			expect(profile.homeKeys['right-index']).toBe('KeyJ');
		}
	);
});

describe('French text on the shipped layouts', () => {
	it.each(SENTENCES)('can type %s on every layout', (sentence) => {
		expect(findUnproducible(PC_INDEX, sentence)).toEqual([]);
		expect(findUnproducible(MAC_INDEX, sentence)).toEqual([]);
	});

	it('types typographic French on the Mac layout', () => {
		const text =
			"Le cœur de l'œuvre : « ça va ? » Oui — à bientôt…\nÀ l'école, Éric et Élodie ont mangé.";
		expect(findUnproducible(MAC_INDEX, text)).toEqual([]);
	});

	it('types the euro sign and the at sign on both layouts', () => {
		expect(findUnproducible(PC_INDEX, '€@')).toEqual([]);
		expect(findUnproducible(MAC_INDEX, '€@')).toEqual([]);
	});

	it('flags the capital letters that need Caps Lock on fr-fr-azerty-pc', () => {
		expect(findUnproducible(PC_INDEX, 'É Ç')).toEqual(['É', 'Ç']);
	});

	it('flags the characters AZERTY PC lacks entirely', () => {
		expect(findUnproducible(PC_INDEX, 'œ « »')).toEqual(['œ', '«', '»']);
	});

	it('types Ê and Ë with a dead key on fr-fr-azerty-pc', () => {
		expect(findUnproducible(PC_INDEX, 'ÊË')).toEqual([]);
		expect(PC_INDEX.get('Ê')).toEqual([
			[
				{ code: 'BracketLeft', level: 'base' },
				{ code: 'KeyE', level: 'shift' }
			]
		]);
		expect(PC_INDEX.get('Ë')).toEqual([
			[
				{ code: 'BracketLeft', level: 'shift' },
				{ code: 'KeyE', level: 'shift' }
			]
		]);
	});

	it('reaches È and À on fr-fr-azerty-pc only through the AltGr+7 dead grave accent', () => {
		for (const char of ['È', 'À']) {
			const sequences = PC_INDEX.get(char) ?? [];
			expect(sequences).toHaveLength(1);
			expect(sequences[0]?.[0]).toEqual({ code: 'Digit7', level: 'altgr' });
		}
	});

	it('types the capitals É, È, À and Ç on fr-fr-azerty-mac', () => {
		expect(findUnproducible(MAC_INDEX, 'ÉÈÀÇ')).toEqual([]);
	});

	it('types non-breaking space only on fr-fr-azerty-mac', () => {
		expect(findUnproducible(PC_INDEX, ' ')).toEqual([' ']);
		expect(findUnproducible(MAC_INDEX, ' ')).toEqual([]);
	});
});
