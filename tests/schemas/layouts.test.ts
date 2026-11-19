import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	fingerForKey,
	isReducedFingering,
	modifierCodes,
	parseFingeringProfile
} from '../../src/lib/keyboard/fingering';
import { parseGeometry } from '../../src/lib/keyboard/geometry';
import { buildCharIndex, findUnproducible, parseLayout } from '../../src/lib/keyboard/layout';
import { FINGERING_PROFILE_IDS, LAYOUT_IDS } from '../../src/lib/keyboard/layout-ids';
import type { Finger, FingeringProfile } from '../../src/lib/keyboard/types';

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
	const profileCases = fingeringProfiles.map((profile) => [profile.id, profile] as const);

	function sameGeometry(profile: FingeringProfile) {
		return layouts.filter((layout) => layout.geometry === profile.geometry);
	}

	it.each(profileCases)(
		'assigns a finger to every key of every %s-compatible layout',
		(_id, profile) => {
			expect(sameGeometry(profile).length).toBeGreaterThan(0);
			for (const layout of sameGeometry(profile)) {
				for (const code of Object.keys(layout.keys)) {
					expect(fingerForKey(profile, code), `${layout.id} ${code}`).not.toBeNull();
				}
			}
			for (const code of EXTRA_KEYS) expect(fingerForKey(profile, code), code).not.toBeNull();
		}
	);

	// A finger with keys rests somewhere, and a finger without a resting place has no key: the hand
	// drawn shows it folded, never on a key (ADR-075, choice 6).
	it.each(profileCases)(
		'gives a home key to every finger it uses, and no key to any other, in %s',
		(_id, profile) => {
			const used = [...new Set(Object.values(profile.fingers))].sort();
			expect(Object.keys(profile.homeKeys).sort()).toEqual(used);
		}
	);

	it.each(profileCases)(
		'rests the index fingers on F and J and the right thumb on Space in %s',
		(_id, profile) => {
			expect(fingerForKey(profile, 'Space')).toBe('right-thumb');
			expect(profile.homeKeys['right-thumb']).toBe('Space');
			expect(profile.homeKeys['left-index']).toBe('KeyF');
			expect(profile.homeKeys['right-index']).toBe('KeyJ');
		}
	);

	it.each(profileCases)(
		'holds Shift with the hand that does not type the key, a finger it uses, in %s',
		(_id, profile) => {
			for (const layout of sameGeometry(profile)) {
				for (const code of Object.keys(layout.keys)) {
					const [shift = ''] = modifierCodes({ code, level: 'shift' }, profile);
					const holding = fingerForKey(profile, shift);
					expect(holding, `${layout.id} ${code}`).not.toBeNull();
					expect(handOf(holding), `${layout.id} ${code}`).not.toBe(
						handOf(fingerForKey(profile, code))
					);
				}
			}
		}
	);
});

function handOf(finger: Finger | null): string | undefined {
	return finger?.split('-')[0];
}

function fingeringOf(id: string): FingeringProfile {
	const profile = fingeringProfiles.find((candidate) => candidate.id === id);
	if (!profile) throw new Error(`Expected the fingering profile ${id}`);
	return profile;
}

/** The keys of each row of the drawing, from left to right. */
const GEOMETRY_ROWS = parseGeometry(readJson('layouts/geometry/iso-105.json')).rows.map((row) =>
	row.keys.map((key) => key.code)
);
const TEN = fingeringOf('ten-fingers-iso');

describe('the fingering with ten fingers', () => {
	it('uses the eight fingers and the right thumb: it is not a reduced one', () => {
		expect(Object.keys(TEN.homeKeys)).toHaveLength(9);
		expect(isReducedFingering(TEN)).toBe(false);
	});
});

describe('the fingering with two index fingers (ADR-075, choice 6)', () => {
	const TWO = fingeringOf('two-index-iso');

	it('types with the two index fingers and the right thumb, nothing else', () => {
		expect([...new Set(Object.values(TWO.fingers))].sort()).toEqual([
			'left-index',
			'right-index',
			'right-thumb'
		]);
		expect(isReducedFingering(TWO)).toBe(true);
	});

	it('cuts the keyboard between T and Y, G and H, B and N', () => {
		const cut = (left: string, right: string) => [TWO.fingers[left], TWO.fingers[right]];
		expect(cut('KeyT', 'KeyY')).toEqual(['left-index', 'right-index']);
		expect(cut('KeyG', 'KeyH')).toEqual(['left-index', 'right-index']);
		expect(cut('KeyB', 'KeyN')).toEqual(['left-index', 'right-index']);
	});

	it('gives each key to the index of the hand that types it with ten fingers, the thumb its keys', () => {
		expect(Object.keys(TWO.fingers).sort()).toEqual(Object.keys(TEN.fingers).sort());
		for (const [code, finger] of Object.entries(TEN.fingers)) {
			const expected = finger.endsWith('thumb') ? finger : `${handOf(finger)}-index`;
			expect(TWO.fingers[code], code).toBe(expected);
		}
	});

	it('never puts a key of the left index right of a key of the right index in a row', () => {
		for (const row of GEOMETRY_ROWS) {
			const hands = row
				.map((code) => TWO.fingers[code])
				.filter((finger) => finger !== undefined && !finger.endsWith('thumb'))
				.map((finger) => handOf(finger ?? null));
			const firstRight = hands.indexOf('right');
			if (firstRight >= 0) expect(hands.slice(firstRight), row.join(' ')).not.toContain('left');
		}
	});
});

describe('the fingering with six fingers (ADR-075, choice 6)', () => {
	const SIX = fingeringOf('six-fingers-iso');

	it('uses no little finger', () => {
		const fingers = [...Object.values(SIX.fingers), ...Object.keys(SIX.homeKeys)];
		expect(fingers.filter((finger) => finger.endsWith('pinky'))).toEqual([]);
		expect(isReducedFingering(SIX)).toBe(true);
	});

	it('gives the keys of a little finger to the ring finger of its hand, and keeps the others', () => {
		expect(Object.keys(SIX.fingers).sort()).toEqual(Object.keys(TEN.fingers).sort());
		for (const [code, finger] of Object.entries(TEN.fingers)) {
			expect(SIX.fingers[code], code).toBe(finger.replace('-pinky', '-ring'));
		}
	});

	it('rests the ring, middle and index fingers where ten fingers rest them', () => {
		for (const [finger, code] of Object.entries(SIX.homeKeys)) {
			expect(TEN.homeKeys[finger as Finger], finger).toBe(code);
		}
	});
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
		expect(findUnproducible(PC_INDEX, '\u00A0')).toEqual(['\u00A0']);
		expect(findUnproducible(MAC_INDEX, '\u00A0')).toEqual([]);
	});
});
