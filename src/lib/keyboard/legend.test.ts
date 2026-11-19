import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { buildCharIndex } from './layout';
import { LAYOUT_IDS } from './layout-ids';
import { extraSign, keyLegend, pressSign, type KeyLegend } from './legend';
import { loadLayout } from './registry';
import type { KeyLevels, KeyOutput, LayoutDefinition, ModifierLevel } from './types';

const pc = await loadLayout('fr-fr-azerty-pc');
const mac = await loadLayout('fr-fr-azerty-mac');
const layouts = await Promise.all(LAYOUT_IDS.map((id) => loadLayout(id)));

const LEVELS: readonly ModifierLevel[] = ['base', 'shift', 'altgr', 'shiftAltgr'];
const SPACE = ' ';
const NO_BREAK_SPACE = String.fromCharCode(0xa0);

/** Every sign drawn on the key to press: its legend, and the sign added for this press. */
function drawnSigns(legend: KeyLegend | null, extra: string | null): string[] {
	if (legend === null) return [];
	return [legend.shifted, legend.base, extra].filter((sign) => sign !== null);
}

/** A letter key prints its capital, which stands for the small letter as well. */
function showsSign(signs: readonly string[], sign: string, locale: string): boolean {
	return signs.includes(sign) || signs.includes(sign.toLocaleUpperCase(locale));
}

describe('keyLegend', () => {
	it('prints a letter key as its capital alone, like a real keyboard', () => {
		expect(keyLegend(pc, 'KeyF')).toEqual({ base: 'F', shifted: null });
		expect(keyLegend(pc, 'KeyA')).toEqual({ base: 'Q', shifted: null });
		expect(keyLegend(mac, 'Semicolon')).toEqual({ base: 'M', shifted: null });
	});

	it('prints the sign with Shift above the sign without it on a digit key', () => {
		expect(keyLegend(pc, 'Digit1')).toEqual({ base: '&', shifted: '1' });
		expect(keyLegend(pc, 'Digit0')).toEqual({ base: 'à', shifted: '0' });
		expect(keyLegend(mac, 'Digit8')).toEqual({ base: '!', shifted: '8' });
	});

	it('prints both signs of a punctuation key', () => {
		expect(keyLegend(pc, 'Comma')).toEqual({ base: ';', shifted: '.' });
		expect(keyLegend(pc, 'KeyM')).toEqual({ base: ',', shifted: '?' });
		expect(keyLegend(mac, 'IntlBackslash')).toEqual({ base: '@', shifted: '#' });
	});

	it('prints the isolated signs of a dead key', () => {
		expect(keyLegend(pc, 'BracketLeft')).toEqual({ base: '^', shifted: '¨' });
		expect(keyLegend(mac, 'Backslash')).toEqual({ base: '`', shifted: '£' });
	});

	it('prints one sign on a key that writes one', () => {
		expect(keyLegend(pc, 'Backquote')).toEqual({ base: '²', shifted: null });
	});

	it('prints nothing on the space bar', () => {
		expect(keyLegend(pc, 'Space')).toEqual({ base: '', shifted: null });
		expect(keyLegend(mac, 'Space')).toEqual({ base: '', shifted: null });
	});

	it('leaves out the signs written with AltGr or Option', () => {
		expect(keyLegend(pc, 'Digit0')).not.toMatchObject({ base: '@' });
		expect(keyLegend(mac, 'KeyE')).toEqual({ base: 'E', shifted: null });
	});

	it('returns null for a key the layout does not define', () => {
		expect(keyLegend(pc, 'Tab')).toBeNull();
		expect(keyLegend(pc, 'constructor')).toBeNull();
	});
});

describe('pressSign', () => {
	it('gives the character a press writes', () => {
		expect(pressSign(pc, { code: 'KeyF', level: 'base' })).toBe('f');
		expect(pressSign(pc, { code: 'Digit1', level: 'shift' })).toBe('1');
		expect(pressSign(pc, { code: 'Digit0', level: 'altgr' })).toBe('@');
	});

	it('gives the isolated sign of a dead key', () => {
		expect(pressSign(pc, { code: 'BracketLeft', level: 'base' })).toBe('^');
		expect(pressSign(pc, { code: 'Digit2', level: 'altgr' })).toBe('~');
	});

	it('returns null for a level or a key the layout does not have', () => {
		expect(pressSign(pc, { code: 'KeyF', level: 'altgr' })).toBeNull();
		expect(pressSign(pc, { code: 'Tab', level: 'base' })).toBeNull();
	});
});

describe('extraSign', () => {
	it('adds the sign written with AltGr or Option to the key to press', () => {
		expect(extraSign(pc, { code: 'Digit0', level: 'altgr' })).toBe('@');
		expect(extraSign(mac, { code: 'KeyE', level: 'altgr' })).toBe('ê');
		expect(extraSign(mac, { code: 'KeyI', level: 'shiftAltgr' })).toBe('ï');
	});

	it('adds nothing without AltGr: the legend prints those signs already', () => {
		expect(extraSign(pc, { code: 'Digit1', level: 'shift' })).toBeNull();
		expect(extraSign(pc, { code: 'Digit1', level: 'base' })).toBeNull();
		expect(extraSign(pc, { code: 'KeyF', level: 'shift' })).toBeNull();
	});

	it('adds nothing for a level the key does not have, nor for a blank sign', () => {
		expect(extraSign(pc, { code: 'KeyF', level: 'altgr' })).toBeNull();
		expect(extraSign(mac, { code: 'Space', level: 'altgr' })).toBeNull();
	});
});

describe('shipped layouts', () => {
	it.each(layouts.map((layout) => [layout.id, layout] as const))(
		'shows on %s the sign each press writes on the key to press',
		(_id, layout) => {
			fc.assert(
				fc.property(fc.constantFrom(...buildCharIndex(layout).values()), (sequences) => {
					for (const press of sequences.flat()) {
						const sign = pressSign(layout, press);
						if (sign === null || sign.trim() === '') continue;
						const signs = drawnSigns(keyLegend(layout, press.code), extraSign(layout, press));
						expect(showsSign(signs, sign, layout.locale), `${press.code} ${press.level}`).toBe(
							true
						);
					}
				})
			);
		}
	);
});

/*
 * Layouts made up of a few keys: what is printed follows from the levels the data describes,
 * whatever the language of the keyboard.
 */
const LETTERS = ['a', 'é', 'n', 'ß', 'ж'];
const OTHERS = ['1', '&', ',', '?', '@', '#', '%', '-', '«', 'ç'];
const DEAD = 'circumflex';
const outputArb: fc.Arbitrary<KeyOutput> = fc.oneof(
	fc.constantFrom(...LETTERS, ...LETTERS.map((letter) => letter.toUpperCase()), ...OTHERS),
	fc.constant({ dead: DEAD })
);
const levelsArb: fc.Arbitrary<KeyLevels> = fc
	.record(
		{
			base: outputArb,
			shift: outputArb,
			altgr: outputArb,
			shiftAltgr: outputArb,
			letter: fc.constantFrom(...LETTERS)
		},
		{ requiredKeys: ['letter'] }
	)
	.chain(({ letter, ...levels }) =>
		fc.constantFrom<KeyLevels>(
			levels,
			// A letter key, with or without signs at AltGr level.
			{ ...levels, base: letter, shift: letter.toUpperCase() }
		)
	)
	.filter((levels) => levels.base !== undefined || levels.shift !== undefined);

function layoutWith(levels: KeyLevels): LayoutDefinition {
	return {
		schemaVersion: 1,
		id: 'xx-yy-test-pc',
		locale: 'und',
		platform: 'pc',
		geometry: 'iso',
		sources: [{ name: 'Test', url: 'https://example.org/test', license: 'CC0-1.0' }],
		keys: { KeyQ: levels },
		deadKeys: { [DEAD]: { standalone: '^', compositions: {} } }
	};
}

function signOf(output: KeyOutput | undefined): string | null {
	if (output === undefined) return null;
	return typeof output === 'string' ? output : '^';
}

describe('keyLegend, for any layout', () => {
	it('prints only one sign on a letter key or a key that writes one sign', () => {
		fc.assert(
			fc.property(levelsArb, (levels) => {
				const legend = keyLegend(layoutWith(levels), 'KeyQ');
				const base = signOf(levels.base);
				const shift = signOf(levels.shift);
				const isLetterKey =
					typeof levels.base === 'string' &&
					shift !== base &&
					shift === levels.base.toLocaleUpperCase('und');
				if (isLetterKey || base === null || shift === null || shift === base) {
					expect(legend?.shifted).toBeNull();
				} else {
					expect(legend).toEqual({ base, shifted: shift });
				}
			})
		);
	});

	it('shows the sign of every level on the key to press', () => {
		fc.assert(
			fc.property(levelsArb, fc.constantFrom(...LEVELS), (levels, level) => {
				const layout = layoutWith(levels);
				const press = { code: 'KeyQ', level };
				const sign = pressSign(layout, press);
				fc.pre(sign !== null);
				const signs = drawnSigns(keyLegend(layout, 'KeyQ'), extraSign(layout, press));
				expect(showsSign(signs, sign ?? '', 'und')).toBe(true);
			})
		);
	});

	it('never prints the same sign twice on a key', () => {
		fc.assert(
			fc.property(levelsArb, fc.constantFrom(...LEVELS), (levels, level) => {
				const layout = layoutWith(levels);
				const signs = drawnSigns(
					keyLegend(layout, 'KeyQ'),
					extraSign(layout, { code: 'KeyQ', level })
				);
				expect(new Set(signs).size).toBe(signs.length);
			})
		);
	});
});

describe('keyLegend of the space bar', () => {
	it('is blank, whatever the space bar writes with a modifier', () => {
		const layout = layoutWith({ base: SPACE, altgr: NO_BREAK_SPACE });
		expect(keyLegend(layout, 'KeyQ')).toEqual({ base: '', shifted: null });
		expect(extraSign(layout, { code: 'KeyQ', level: 'altgr' })).toBeNull();
	});
});
