import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	learnedChars,
	lessonIds,
	parseProgression
} from '../../src/lib/engine/progression/definition';
import { listProgressionFiles } from '../../src/lib/engine/progression/test-support';
import { buildCharIndex, parseLayout } from '../../src/lib/keyboard/layout';
import type { KeySequence } from '../../src/lib/keyboard/types';
import table from './shown-ways.json';

/*
 * Audit P-09: the keyboard drawn shows a character the way its instruction teaches it, on every
 * layout: the dead key for « ê î ô û ë ï » on a Mac as on a PC (not Option + E), the key « @ » of
 * a Mac (not Option + « ` »). The way shown is the first one `buildCharIndex` gives: the games light
 * its first key, the hand shows it, a mistake marks its last key. A layout that writes a character
 * in several ways says which one to show (`preferred`).
 *
 * The table, in `shown-ways.json`, writes each way key by key: the code of the key, followed by
 * `:<level>` when a modifier is held with it. Enter has no character in the layouts: the games
 * light it by its name (`targetKeyPress`).
 */
const LAYOUTS_DIR = 'layouts';
const LINE_BREAK = /^[\r\n]+$/;
const expected: Readonly<Record<string, Readonly<Record<string, string>>>> = table;

function written(sequence: KeySequence | undefined): string {
	return (sequence ?? [])
		.map((press) => (press.level === 'base' ? press.code : `${press.code}:${press.level}`))
		.join(' ');
}

/** Every character the progressions targeting a layout may ask, line breaks aside. */
function charsByLayout(): ReadonlyMap<string, ReadonlySet<string>> {
	const byLayout = new Map<string, Set<string>>();
	for (const file of listProgressionFiles()) {
		const progression = parseProgression(file.data);
		const chars = lessonIds(progression)
			.flatMap((id) => learnedChars(progression, id))
			.filter((char) => !LINE_BREAK.test(char));
		for (const layoutId of progression.layoutIds) {
			const known = byLayout.get(layoutId) ?? new Set<string>();
			for (const char of chars) known.add(char);
			byLayout.set(layoutId, known);
		}
	}
	return byLayout;
}

const byLayout = charsByLayout();

describe('the way the keyboard drawn shows each character', () => {
	it('is written for every layout a progression targets', () => {
		expect(byLayout.size).toBeGreaterThan(0);
		expect(Object.keys(expected).sort()).toEqual([...byLayout.keys()].sort());
	});

	it.each([...byLayout].map(([layoutId, chars]) => [layoutId, chars] as const))(
		'is written on %s for every character of its progressions, and no other',
		(layoutId, chars) => {
			expect(Object.keys(expected[layoutId] ?? {}).sort()).toEqual([...chars].sort());
		}
	);

	it.each([...byLayout.keys()])('is the one the instructions teach on %s', (layoutId) => {
		const layout = parseLayout(JSON.parse(readFileSync(`${LAYOUTS_DIR}/${layoutId}.json`, 'utf8')));
		const index = buildCharIndex(layout);
		const shown = Object.fromEntries(
			Object.keys(expected[layoutId] ?? {}).map((char) => [char, written(index.get(char)?.[0])])
		);
		expect(shown).toEqual(expected[layoutId]);
	});
});
