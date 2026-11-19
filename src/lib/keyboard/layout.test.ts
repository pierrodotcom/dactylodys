import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { buildCharIndex, findUnproducible, keyCodeForChar, parseLayout } from './layout';
import { LAYOUT_IDS } from './layout-ids';
import { loadLayout } from './registry';
import type { KeySequence, LayoutDefinition } from './types';

function makeLayout(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		schemaVersion: 1,
		id: 'xx-yy-test-pc',
		locale: 'fr-FR',
		platform: 'pc',
		geometry: 'iso',
		sources: [{ name: 'Test', url: 'https://example.org/test', license: 'CC0-1.0' }],
		keys: {
			KeyA: { base: 'a', shift: 'A' },
			KeyE: { base: 'e', shift: 'E' },
			Space: { base: ' ' },
			BracketLeft: { base: { dead: 'circumflex' } },
			Digit1: { base: '1', altgr: '~' }
		},
		deadKeys: {
			circumflex: { standalone: '^', compositions: { e: 'ê', E: 'Ê', a: 'â' } }
		},
		...overrides
	};
}

function replay(layout: LayoutDefinition, sequence: KeySequence): string | null {
	const [first, second] = sequence;
	if (!first) return null;
	const output = layout.keys[first.code]?.[first.level];
	if (output === undefined) return null;
	if (typeof output === 'string') return sequence.length === 1 ? output : null;
	const definition = layout.deadKeys[output.dead];
	const next = second ? layout.keys[second.code]?.[second.level] : undefined;
	if (!definition || sequence.length !== 2 || typeof next !== 'string') return null;
	return next === ' ' ? definition.standalone : (definition.compositions[next] ?? null);
}

describe('parseLayout', () => {
	it('accepts a minimal valid layout and returns it unchanged', () => {
		const layout = parseLayout(makeLayout());
		expect(layout.id).toBe('xx-yy-test-pc');
		expect(layout.keys['BracketLeft']).toEqual({ base: { dead: 'circumflex' } });
	});

	it('normalizes outputs to NFC', () => {
		const layout = parseLayout(makeLayout({ keys: { KeyE: { base: 'é' } }, deadKeys: {} }));
		expect(layout.keys['KeyE']?.base).toBe('é');
	});

	it.each([
		['a non-object', 'nope', 'layout: expected an object'],
		['a wrong schema version', makeLayout({ schemaVersion: 2 }), 'layout.schemaVersion'],
		['a platform mismatch in the id', makeLayout({ id: 'xx-yy-test-mac' }), 'layout.id'],
		['a malformed id', makeLayout({ id: 'Test' }), 'layout.id'],
		['an unknown platform', makeLayout({ platform: 'linux' }), 'layout.platform'],
		['an unknown geometry', makeLayout({ geometry: 'jis' }), 'layout.geometry'],
		['an invalid locale', makeLayout({ locale: 'not a tag' }), 'layout.locale'],
		['no sources', makeLayout({ sources: [] }), 'layout.sources'],
		[
			'a source without a valid url',
			makeLayout({ sources: [{ name: 'x', url: 'nowhere', license: 'MIT' }] }),
			'layout.sources[0].url'
		],
		['an unknown top-level property', makeLayout({ extra: true }), 'layout.extra'],
		['no keys', makeLayout({ keys: {}, deadKeys: {} }), 'layout.keys'],
		[
			'an invalid key code',
			makeLayout({ keys: { 'key a': { base: 'a' } }, deadKeys: {} }),
			'layout.keys.key a'
		],
		['a key with no level', makeLayout({ keys: { KeyA: {} }, deadKeys: {} }), 'layout.keys.KeyA'],
		[
			'an unknown level',
			makeLayout({ keys: { KeyA: { caps: 'A' } }, deadKeys: {} }),
			'layout.keys.KeyA.caps'
		],
		[
			'an empty output',
			makeLayout({ keys: { KeyA: { base: '' } }, deadKeys: {} }),
			'layout.keys.KeyA.base'
		],
		[
			'an output made of several characters',
			makeLayout({ keys: { KeyA: { base: 'ab' } }, deadKeys: {} }),
			'layout.keys.KeyA.base'
		],
		[
			'a numeric output',
			makeLayout({ keys: { KeyA: { base: 1 } }, deadKeys: {} }),
			'layout.keys.KeyA.base'
		],
		[
			'a dead key reference to an undefined dead key',
			makeLayout({ keys: { KeyA: { base: { dead: 'ghost' } } }, deadKeys: {} }),
			'layout.keys.KeyA.base.dead'
		],
		[
			'an orphan dead key definition',
			makeLayout({ keys: { KeyA: { base: 'a' } } }),
			'layout.deadKeys.circumflex'
		],
		[
			'a composition result made of several characters',
			makeLayout({
				deadKeys: { circumflex: { standalone: '^', compositions: { e: 'êê' } } }
			}),
			'layout.deadKeys.circumflex.compositions.e'
		],
		[
			'a dead key without standalone character',
			makeLayout({ deadKeys: { circumflex: { compositions: {} } } }),
			'layout.deadKeys.circumflex.standalone'
		]
	])('rejects %s with the faulty path', (_name, data, path) => {
		expect(() => parseLayout(data)).toThrow(path);
	});
});

describe('buildCharIndex', () => {
	const layout = parseLayout(makeLayout());
	const index = buildCharIndex(layout);

	it('lists direct characters with their key press', () => {
		expect(index.get('a')).toEqual([[{ code: 'KeyA', level: 'base' }]]);
		expect(index.get('~')).toEqual([[{ code: 'Digit1', level: 'altgr' }]]);
	});

	it('lists dead key compositions as two key presses', () => {
		expect(index.get('ê')).toEqual([
			[
				{ code: 'BracketLeft', level: 'base' },
				{ code: 'KeyE', level: 'base' }
			]
		]);
		expect(index.get('Ê')).toEqual([
			[
				{ code: 'BracketLeft', level: 'base' },
				{ code: 'KeyE', level: 'shift' }
			]
		]);
	});

	it('produces the standalone character of a dead key with Space', () => {
		expect(index.get('^')).toEqual([
			[
				{ code: 'BracketLeft', level: 'base' },
				{ code: 'Space', level: 'base' }
			]
		]);
	});

	it('keeps every way to produce a character, direct ones first', () => {
		const twoWays = buildCharIndex(
			parseLayout(
				makeLayout({
					keys: {
						KeyA: { base: 'a' },
						KeyE: { base: 'e' },
						Space: { base: ' ' },
						Digit2: { base: 'ê' },
						BracketLeft: { base: { dead: 'circumflex' } }
					}
				})
			)
		);
		const sequences = twoWays.get('ê') ?? [];
		expect(sequences.map((sequence) => sequence.length)).toEqual([1, 2]);
	});

	it('indexes decomposed data under its NFC form', () => {
		const decomposed: LayoutDefinition = {
			...layout,
			keys: { KeyE: { base: 'e' }, Space: { base: ' ' }, Dead: { base: { dead: 'acute' } } },
			deadKeys: { acute: { standalone: '´', compositions: { e: 'é' } } }
		};
		const result = buildCharIndex(decomposed);
		expect(result.has('é')).toBe(true);
		expect(result.has('é')).toBe(false);
	});

	it('returns an empty index when no key produces a character', () => {
		const empty: LayoutDefinition = { ...layout, keys: {}, deadKeys: {} };
		expect(buildCharIndex(empty).size).toBe(0);
	});
});

/** « ê » two ways (AltGr + E, or the dead key then E), « @ » on two keys (AltGr + 1, or its own key). */
function twoWays(preferred?: unknown): Record<string, unknown> {
	return makeLayout({
		keys: {
			KeyA: { base: 'a', shift: 'A' },
			KeyE: { base: 'e', shift: 'E', altgr: 'ê' },
			Space: { base: ' ' },
			BracketLeft: { base: { dead: 'circumflex' } },
			Digit1: { base: '1', altgr: '@' },
			IntlBackslash: { base: '@' }
		},
		...(preferred === undefined ? {} : { preferred })
	});
}

const DEAD_CIRCUMFLEX = { code: 'BracketLeft', level: 'base' } as const;
const KEY_E = { code: 'KeyE', level: 'base' } as const;

describe('preferred ways', () => {
	it('shows first, without a preference, the direct ways in the order of the keys', () => {
		const index = buildCharIndex(parseLayout(twoWays()));
		expect(index.get('ê')?.[0]).toEqual([{ code: 'KeyE', level: 'altgr' }]);
		expect(index.get('@')?.[0]).toEqual([{ code: 'Digit1', level: 'altgr' }]);
	});

	it('shows first the way the layout prefers, the other ways after it in their order', () => {
		const layout = parseLayout(
			twoWays({
				ê: [DEAD_CIRCUMFLEX, KEY_E],
				'@': [{ code: 'IntlBackslash', level: 'base' }]
			})
		);
		const index = buildCharIndex(layout);
		expect(index.get('ê')).toEqual([[DEAD_CIRCUMFLEX, KEY_E], [{ code: 'KeyE', level: 'altgr' }]]);
		expect(index.get('@')).toEqual([
			[{ code: 'IntlBackslash', level: 'base' }],
			[{ code: 'Digit1', level: 'altgr' }]
		]);
		// The characters the layout has no preference for keep their ways.
		expect(index.get('a')).toEqual([[{ code: 'KeyA', level: 'base' }]]);
		expect(index.get('â')).toEqual([[DEAD_CIRCUMFLEX, { code: 'KeyA', level: 'base' }]]);
	});

	it('keeps the preference of the layout, under the NFC form of its character', () => {
		const layout = parseLayout(twoWays({ ê: [DEAD_CIRCUMFLEX, KEY_E] }));
		expect(layout.preferred).toEqual({ ê: [DEAD_CIRCUMFLEX, KEY_E] });
		expect(buildCharIndex(layout).get('ê')?.[0]).toEqual([DEAD_CIRCUMFLEX, KEY_E]);
	});

	it('leaves the preference out of a layout that has none', () => {
		expect(parseLayout(twoWays())).not.toHaveProperty('preferred');
	});

	it('changes nothing for a preferred way that is already the first one', () => {
		const layout = parseLayout(twoWays({ a: [{ code: 'KeyA', level: 'base' }] }));
		expect(buildCharIndex(layout).get('a')).toEqual([[{ code: 'KeyA', level: 'base' }]]);
	});

	it.each([
		['not an object', ['ê'], 'layout.preferred: expected an object'],
		['a way that is not a list', { ê: 'KeyE' }, 'layout.preferred.ê'],
		['an empty way', { ê: [] }, 'layout.preferred.ê'],
		[
			'a key press with an unknown property',
			{ '@': [{ code: 'IntlBackslash', level: 'base', finger: 1 }] },
			'layout.preferred.@[0].finger'
		],
		[
			'a key the layout does not have',
			{ '@': [{ code: 'Backquote', level: 'base' }] },
			'layout.preferred.@[0].code'
		],
		[
			'an unknown level',
			{ '@': [{ code: 'IntlBackslash', level: 'option' }] },
			'layout.preferred.@[0].level'
		],
		[
			'a level the key does not have',
			{ '@': [{ code: 'IntlBackslash', level: 'shift' }] },
			'layout.preferred.@[0].level'
		],
		[
			'keys that write another character',
			{ ê: [{ code: 'KeyE', level: 'base' }] },
			'layout.preferred.ê'
		],
		['a character no key writes', { ß: [{ code: 'KeyE', level: 'base' }] }, 'layout.preferred.ß'],
		['several characters', { êa: [DEAD_CIRCUMFLEX, KEY_E] }, 'layout.preferred key "êa"'],
		[
			'a character given twice',
			{ ê: [DEAD_CIRCUMFLEX, KEY_E], ê: [DEAD_CIRCUMFLEX, KEY_E] },
			'layout.preferred'
		]
	])('rejects a preference with %s, with the faulty path', (_name, preferred, path) => {
		expect(() => parseLayout(twoWays(preferred))).toThrow(path);
	});
});

describe('keyCodeForChar', () => {
	const index = buildCharIndex(parseLayout(makeLayout()));

	it('gives the key that writes a letter', () => {
		expect(keyCodeForChar(index, 'a')).toBe('KeyA');
		expect(keyCodeForChar(index, ' ')).toBe('Space');
	});

	it('gives the key of the letter for a capital, written with Shift', () => {
		expect(keyCodeForChar(index, 'A')).toBe('KeyA');
	});

	it('gives the key of a character written with AltGr', () => {
		expect(keyCodeForChar(index, '~')).toBe('Digit1');
	});

	it('gives the key pressed after the dead key for a composed character', () => {
		expect(keyCodeForChar(index, 'ê')).toBe('KeyE');
		expect(keyCodeForChar(index, 'Ê')).toBe('KeyE');
	});

	it('looks the character up in its NFC form', () => {
		expect(keyCodeForChar(index, 'e\u0302')).toBe('KeyE');
	});

	it('gives the key of the way the layout prefers', () => {
		const preferring = buildCharIndex(
			parseLayout(twoWays({ '@': [{ code: 'IntlBackslash', level: 'base' }] }))
		);

		expect(keyCodeForChar(preferring, '@')).toBe('IntlBackslash');
	});

	// Caps Lock writes capitals no key of the layout writes with Shift.
	it('gives the key of the small letter for a capital the layout does not write', () => {
		const accents = buildCharIndex(
			parseLayout(makeLayout({ keys: { Digit2: { base: 'é', shift: '2' } }, deadKeys: {} }))
		);

		expect(keyCodeForChar(accents, 'É')).toBe('Digit2');
	});

	it('gives no key for a character the layout does not write', () => {
		expect(keyCodeForChar(index, 'ß')).toBeNull();
		expect(keyCodeForChar(index, '')).toBeNull();
		expect(keyCodeForChar(new Map(), 'a')).toBeNull();
	});
});

describe('findUnproducible', () => {
	const index = buildCharIndex(parseLayout(makeLayout()));

	it('returns nothing when every grapheme is producible', () => {
		expect(findUnproducible(index, 'aÊe ~^')).toEqual([]);
	});

	it('returns each missing grapheme once, in order of first appearance', () => {
		expect(findUnproducible(index, 'zaxzÉx')).toEqual(['z', 'x', 'É']);
	});

	it('ignores line breaks', () => {
		expect(findUnproducible(index, 'a\ne\r\na\r')).toEqual([]);
	});

	it('works on graphemes, not code units', () => {
		expect(findUnproducible(index, '👩‍👩‍👧a')).toEqual(['👩‍👩‍👧']);
	});

	it('normalizes the text to NFC before looking up', () => {
		expect(findUnproducible(index, 'ê')).toEqual([]);
	});

	it('returns an empty list for an empty text', () => {
		expect(findUnproducible(index, '')).toEqual([]);
	});
});

const layouts = await Promise.all(LAYOUT_IDS.map((id) => loadLayout(id)));

describe('shipped layouts', () => {
	it.each(layouts.map((layout) => [layout.id, layout] as const))(
		'replaying any sequence of the index on %s gives back the indexed character',
		(_id, layout) => {
			const index = buildCharIndex(layout);
			const chars = [...index.keys()];
			expect(chars.length).toBeGreaterThan(0);
			fc.assert(
				fc.property(fc.constantFrom(...chars), (char) => {
					const sequences = index.get(char) ?? [];
					expect(sequences.length).toBeGreaterThan(0);
					for (const sequence of sequences) {
						expect(sequence.length).toBeLessThanOrEqual(2);
						expect(replay(layout, sequence)?.normalize('NFC')).toBe(char);
					}
				})
			);
		}
	);

	it.each(layouts.map((layout) => [layout.id, layout] as const))(
		'finds for any character of %s a key that takes part in writing it',
		(_id, layout) => {
			const index = buildCharIndex(layout);
			fc.assert(
				fc.property(fc.constantFrom(...index.keys()), (char) => {
					const code = keyCodeForChar(index, char);
					const lastKeys = (index.get(char) ?? []).map((sequence) => sequence.at(-1)?.code);
					expect(code).not.toBeNull();
					expect(lastKeys).toContain(code);
				})
			);
		}
	);

	it.each(layouts.map((layout) => [layout.id, layout] as const))(
		'indexes only NFC characters on %s',
		(_id, layout) => {
			for (const char of buildCharIndex(layout).keys()) {
				expect(char).toBe(char.normalize('NFC'));
			}
		}
	);
});
