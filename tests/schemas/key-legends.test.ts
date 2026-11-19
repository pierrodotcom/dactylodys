import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	learnedChars,
	lessonIds,
	parseProgression
} from '../../src/lib/engine/progression/definition';
import { listProgressionFiles } from '../../src/lib/engine/progression/test-support';
import { buildCharIndex, parseLayout } from '../../src/lib/keyboard/layout';
import { extraSign, keyLegend, pressSign } from '../../src/lib/keyboard/legend';
import type { KeyPress, LayoutDefinition } from '../../src/lib/keyboard/types';

/*
 * Audit E-06: the key lit for a character carries it, as the real keyboard does: « 1 » on the key
 * « & 1 », « ? » on the key « , ? », « @ » on the key « à » of a PC. A character written through a
 * dead key is shown key by key: the dead key carries its sign, the next key its letter. The space
 * bar and Enter carry no sign: their shape and their name tell them.
 */
const LAYOUTS_DIR = 'layouts';
const UNPRINTED = /^[\s]$/u;

/** Every sign drawn on the key to press: its legend, and the sign added for this press. */
function drawnSigns(layout: LayoutDefinition, press: KeyPress): string[] {
	const legend = keyLegend(layout, press.code);
	if (legend === null) return [];
	return [legend.shifted, legend.base, extraSign(layout, press)].filter((sign) => sign !== null);
}

/** A letter key prints its capital, which stands for the small letter as well. */
function carries(layout: LayoutDefinition, press: KeyPress, sign: string): boolean {
	const signs = drawnSigns(layout, press);
	return signs.includes(sign) || signs.includes(sign.toLocaleUpperCase(layout.locale));
}

const pairs = listProgressionFiles().flatMap((file) =>
	parseProgression(file.data).layoutIds.map((layoutId) => [file.path, layoutId, file] as const)
);

describe('the drawn keyboard', () => {
	it('is checked on every layout of every progression', () => {
		expect(pairs.length).toBeGreaterThan(0);
	});

	it.each(pairs)(
		'%s: on %s, the key lit for each character carries it',
		(_path, layoutId, file) => {
			const layout = parseLayout(
				JSON.parse(readFileSync(`${LAYOUTS_DIR}/${layoutId}.json`, 'utf8'))
			);
			const index = buildCharIndex(layout);
			const progression = parseProgression(file.data);
			const chars = new Set(lessonIds(progression).flatMap((id) => learnedChars(progression, id)));
			const missing: string[] = [];
			for (const char of chars) {
				if (UNPRINTED.test(char)) continue;
				// The way the games show it: the first one the layout gives.
				const sequence = index.get(char)?.[0] ?? [];
				expect(sequence.length, char).toBeGreaterThan(0);
				const [only] = sequence;
				const shown =
					sequence.length === 1 && only !== undefined
						? carries(layout, only, char)
						: sequence.every((press) => carries(layout, press, pressSign(layout, press) ?? ''));
				if (!shown) missing.push(char);
			}
			expect(missing).toEqual([]);
		}
	);
});
