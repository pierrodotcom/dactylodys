import { readFileSync } from 'node:fs';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parseGeometry } from '../../keyboard/geometry';
import { parseLayout } from '../../keyboard/layout';
import type { KeyboardGeometryDefinition, LayoutDefinition } from '../../keyboard/types';
import { toGraphemes } from '../graphemes';
import { computeMetrics } from '../metrics';
import { applyKeystroke, createSession } from '../session';
import { learnedChars, parseProgression } from './definition';
import { generateExercise } from './exercise';
import { keyNeighbors, mistakeFor, plantMistakes, repairStarts } from './repair';
import { seededRng } from './test-support';
import type { KeyNeighbors, RepairRules, TextBank } from './types';

const AZERTY = parseLayout(JSON.parse(readFileSync('layouts/fr-fr-azerty-pc.json', 'utf8')));
const ISO = parseGeometry(JSON.parse(readFileSync('layouts/geometry/iso-105.json', 'utf8')));
const AZERTY_NEIGHBORS = keyNeighbors(AZERTY, ISO);
const LEARNED = [...'asdfghjklmqzertyuiopwxcvbn', ' ', '\n', 'é'];
const RULES: RepairRules = { share: 0.5, maxPending: 2 };

/** A made-up layout of three keys in a row, to check nothing is assumed of a real one. */
const ROW_GEOMETRY: KeyboardGeometryDefinition = {
	schemaVersion: 1,
	id: 'row-3',
	geometry: 'iso',
	rows: [
		{
			offset: 0,
			keys: [
				{ code: 'KeyA', width: 1 },
				{ code: 'KeyB', width: 1 },
				{ code: 'KeyC', width: 1 }
			]
		},
		{ offset: 0.5, keys: [{ code: 'KeyD', width: 1 }] }
	]
};
const ROW_LAYOUT: LayoutDefinition = {
	schemaVersion: 1,
	id: 'xx-xx-test-pc',
	locale: 'xx',
	platform: 'pc',
	geometry: 'iso',
	sources: [],
	keys: {
		KeyA: { base: 'x', shift: 'X' },
		KeyB: { base: 'y', shift: 'Y' },
		KeyC: { base: 'z' },
		KeyD: { base: 'w', shift: 'W' }
	},
	deadKeys: {}
};

function backspace(timestamp: number) {
	return {
		kind: 'backspace' as const,
		char: null,
		code: 'Backspace',
		timestamp,
		composed: false
	};
}

function typeChar(char: string, timestamp: number) {
	return char === '\n'
		? { kind: 'enter' as const, char: null, code: 'Enter', timestamp, composed: false }
		: { kind: 'char' as const, char, code: null, timestamp, composed: false };
}

describe('keyNeighbors', () => {
	it('takes the keys that touch in a row and those that overlap in the rows around', () => {
		const neighbors = keyNeighbors(ROW_LAYOUT, ROW_GEOMETRY);
		expect(neighbors.get('x')).toEqual(['y', 'w']);
		expect([...(neighbors.get('y') ?? [])].sort()).toEqual(['w', 'x', 'z']);
		expect(neighbors.get('z')).toEqual(['y']);
	});

	it('keeps the level of the character, and the key without modifier when the other has none there', () => {
		const neighbors = keyNeighbors(ROW_LAYOUT, ROW_GEOMETRY);
		expect(neighbors.get('X')).toEqual(['Y', 'W']);
		expect([...(neighbors.get('Y') ?? [])].sort()).toEqual(['W', 'X', 'z']);
	});

	it('reads the neighbours of the layout of the child from its data', () => {
		const aroundF = AZERTY_NEIGHBORS.get('f') ?? [];
		expect(aroundF).toEqual(expect.arrayContaining(['d', 'g', 'r', 't']));
		expect(aroundF).not.toContain('j');
		expect(aroundF).not.toContain(' ');
	});

	it('never gives a character as its own neighbour, nor a space or a line break', () => {
		for (const [char, around] of AZERTY_NEIGHBORS) {
			expect(around).not.toContain(char);
			expect(around).not.toContain(' ');
			expect(around).not.toContain('\n');
		}
	});
});

describe('mistakeFor', () => {
	it('takes a learned key next to the expected one', () => {
		for (let seed = 0; seed < 50; seed++) {
			const mistake = mistakeFor('f', LEARNED, AZERTY_NEIGHBORS, seededRng(seed));
			expect(['d', 'g', 'r', 't', 'c', 'v']).toContain(mistake);
		}
	});

	it('takes any other learned character when no neighbour is learned', () => {
		const mistake = mistakeFor('f', ['f', 'j', ' '], AZERTY_NEIGHBORS, seededRng(1));
		expect(mistake).toBe('j');
	});

	it('takes any other learned character without the neighbours of a layout', () => {
		expect(mistakeFor('a', ['a', 'b'], undefined, seededRng(3))).toBe('b');
	});

	it('gives nothing when no other character is learned', () => {
		expect(mistakeFor('a', ['a', ' ', '\n'], AZERTY_NEIGHBORS, seededRng(3))).toBeUndefined();
	});
});

const learnedArbitrary = fc.uniqueArray(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzé'), {
	minLength: 1,
	maxLength: 12
});

const plantArbitrary = learnedArbitrary.chain((learned) =>
	fc.record({
		learned: fc.constant([...learned, ' ']),
		group: fc
			.array(fc.constantFrom(...learned, ' '), { minLength: 1, maxLength: 24 })
			.map((chars) => chars.join('')),
		maxPending: fc.integer({ min: 1, max: 3 }),
		seed: fc.integer(),
		withLayout: fc.boolean()
	})
);

describe('plantMistakes', () => {
	it('is reproducible with the same random source', () => {
		const first = plantMistakes('bonjour mamie', RULES, LEARNED, AZERTY_NEIGHBORS, seededRng(7));
		const second = plantMistakes('bonjour mamie', RULES, LEARNED, AZERTY_NEIGHBORS, seededRng(7));
		expect(second).toEqual(first);
	});

	it('leaves a group of a single grapheme as it is', () => {
		expect(plantMistakes('a', RULES, LEARNED, AZERTY_NEIGHBORS, seededRng(1))).toBeNull();
	});

	it('never writes a mistake in place of a space', () => {
		expect(plantMistakes('a b', RULES, LEARNED, AZERTY_NEIGHBORS, seededRng(1))).toEqual({
			typed: 2,
			pending: [expect.any(String)]
		});
	});

	it('always plants a valid start: a right beginning, then learned characters, the first one wrong', () => {
		fc.assert(
			fc.property(plantArbitrary, ({ learned, group, maxPending, seed, withLayout }) => {
				const neighbors: KeyNeighbors | undefined = withLayout ? AZERTY_NEIGHBORS : undefined;
				const start = plantMistakes(
					group,
					{ share: 1, maxPending },
					learned,
					neighbors,
					seededRng(seed)
				);
				const graphemes = toGraphemes(group);
				const typable = learned.filter((char) => char !== ' ');
				if (start === null) {
					// Only when there is no place, or no other character to write.
					return graphemes.slice(1).every((g) => g === ' ') || typable.length < 2;
				}
				const expected = graphemes[start.typed] as string;
				const near = (neighbors?.get(expected) ?? []).filter(
					(char) => char !== expected && typable.includes(char)
				);
				expect(() => createSession(group, { start })).not.toThrow();
				return (
					start.typed >= 1 &&
					start.typed < graphemes.length &&
					expected !== ' ' &&
					start.pending.length >= 1 &&
					start.pending.length <= maxPending &&
					start.pending.every((char) => typable.includes(char)) &&
					start.pending[0] !== expected &&
					(near.length === 0 || near.includes(start.pending[0] as string))
				);
			})
		);
	});

	it('gives a group that ends without any mistake once the planted ones are erased', () => {
		fc.assert(
			fc.property(plantArbitrary, ({ learned, group, maxPending, seed }) => {
				const start = plantMistakes(
					group,
					{ share: 1, maxPending },
					learned,
					undefined,
					seededRng(seed)
				);
				if (start === null) return true;
				let state = createSession(group, { errorPolicy: 'retry', start });
				const keys = [
					...start.pending.map((_, i) => backspace(i)),
					...state.target.slice(start.typed).map((char, i) => typeChar(char, 100 + i))
				];
				for (const key of keys) state = applyKeystroke(state, key).state;
				const metrics = computeMetrics(state);
				return state.endedAt !== null && metrics.accuracy === 100 && metrics.errorCount === 0;
			})
		);
	});
});

describe('repairStarts', () => {
	const groups = ['bonjour', 'salut', 'Chère mamie,\nmerci', 'pour le gâteau.', 'Bisous !'];

	it('plants mistakes in every group before the text and in a share of the text', () => {
		for (let seed = 0; seed < 30; seed++) {
			const starts = repairStarts(groups, 2, RULES, LEARNED, AZERTY_NEIGHBORS, seededRng(seed));
			expect(starts).toHaveLength(groups.length);
			expect(starts[0]).not.toBeNull();
			expect(starts[1]).not.toBeNull();
			expect(starts.slice(2).filter((start) => start !== null)).toHaveLength(2);
		}
	});

	it('plants at least one mistake in the text when the share is positive, none when it is 0', () => {
		const few = repairStarts(
			groups,
			2,
			{ share: 0.01, maxPending: 1 },
			LEARNED,
			undefined,
			seededRng(1)
		);
		expect(few.slice(2).filter((start) => start !== null)).toHaveLength(1);
		const none = repairStarts(
			groups,
			2,
			{ share: 0, maxPending: 1 },
			LEARNED,
			undefined,
			seededRng(1)
		);
		expect(none.slice(2)).toEqual([null, null, null]);
	});

	it('always opens on a group to repair when the text comes first', () => {
		for (let seed = 0; seed < 30; seed++) {
			const starts = repairStarts(groups, 0, RULES, LEARNED, AZERTY_NEIGHBORS, seededRng(seed));
			expect(starts[0]).not.toBeNull();
			expect(starts.filter((start) => start !== null)).toHaveLength(3);
		}
	});

	it('plants mistakes in every group of an exercise without text', () => {
		const starts = repairStarts(groups, groups.length, RULES, LEARNED, undefined, seededRng(4));
		expect(starts.every((start) => start !== null)).toBe(true);
	});

	it('is reproducible with the same random source', () => {
		const once = repairStarts(groups, 2, RULES, LEARNED, AZERTY_NEIGHBORS, seededRng(11));
		const again = repairStarts(groups, 2, RULES, LEARNED, AZERTY_NEIGHBORS, seededRng(11));
		expect(again).toEqual(once);
	});
});

const PROGRESSION = parseProgression({
	schemaVersion: 1,
	id: 'fr.progression.test',
	locale: 'fr-FR',
	layoutIds: ['fr-fr-azerty-pc'],
	rules: {
		unlockAccuracy: 80,
		starThresholds: [80, 90, 97],
		newCharWeight: 0.6,
		weakCharBoost: 2,
		themeBoost: 2,
		newCharMinCount: 0,
		recentCharWindow: 30,
		textGroupLength: 12
	},
	worlds: [
		{
			id: 'fr.world.one',
			title: 'One',
			themeId: 'dinos',
			gameIds: ['hatching'],
			lessons: [
				{
					id: 'fr.lesson.a',
					title: 'A',
					intro: 'Intro A.',
					newChars: ['f', 'j', 'd', 'k', ' ', '\n'],
					words: [],
					mix: { drills: 1, words: 0, phrases: 0 },
					unlocks: [],
					groupCount: 6,
					targetLength: 20,
					groupLength: [3, 6]
				},
				{
					id: 'fr.lesson.repair',
					title: 'Repair',
					intro: 'Intro.',
					newChars: [],
					words: [],
					mix: { drills: 1, words: 0, phrases: 0 },
					unlocks: [],
					groupCount: 8,
					targetLength: 40,
					groupLength: [3, 6],
					repair: { share: 0.5, maxPending: 2 }
				}
			]
		}
	]
});

const TEXTS: TextBank = {
	schemaVersion: 1,
	id: 'fr.texts.test',
	locale: 'fr-FR',
	texts: [
		{
			id: 'fr.text.kdj',
			lessonId: 'fr.lesson.repair',
			lines: ['fd jk', 'dk jf', 'jd fk', 'kj df'],
			level: 1,
			review: 'agent'
		}
	]
};

describe('generateExercise in a lesson of repairs', () => {
	it('gives a start for each group, and none in the other lessons', () => {
		const repair = generateExercise(PROGRESSION, 'fr.lesson.repair', seededRng(3));
		expect(repair.starts).toHaveLength(repair.groups.length);
		expect(repair.starts?.every((start) => start !== null)).toBe(true);
		expect(generateExercise(PROGRESSION, 'fr.lesson.a', seededRng(3)).starts).toBeUndefined();
	});

	it('repairs every group before the text and a share of the lines of the text', () => {
		for (let seed = 0; seed < 20; seed++) {
			const exercise = generateExercise(PROGRESSION, 'fr.lesson.repair', seededRng(seed), {
				texts: TEXTS
			});
			const textFrom = exercise.groups.indexOf('fd jk\ndk jf\n');
			expect(textFrom).toBeGreaterThan(0);
			const starts = exercise.starts ?? [];
			expect(starts.slice(0, textFrom).every((start) => start !== null)).toBe(true);
			expect(starts.slice(textFrom).filter((start) => start !== null)).toHaveLength(1);
		}
	});

	it('only writes learned characters, each start valid for its group, and is reproducible', () => {
		const learned = learnedChars(PROGRESSION, 'fr.lesson.repair');
		for (let seed = 0; seed < 30; seed++) {
			const context = { texts: TEXTS, neighbors: AZERTY_NEIGHBORS };
			const exercise = generateExercise(PROGRESSION, 'fr.lesson.repair', seededRng(seed), context);
			expect(generateExercise(PROGRESSION, 'fr.lesson.repair', seededRng(seed), context)).toEqual(
				exercise
			);
			exercise.groups.forEach((group, index) => {
				const start = exercise.starts?.[index] ?? null;
				if (start === null) return;
				expect(() => createSession(group, { start })).not.toThrow();
				for (const char of start.pending) expect(learned).toContain(char);
			});
		}
	});

	it('gives the same groups as without repairs: the mistakes are planted last', () => {
		const plain = parseProgression(
			JSON.parse(
				JSON.stringify(PROGRESSION, (key, value: unknown) => (key === 'repair' ? undefined : value))
			)
		);
		for (let seed = 0; seed < 10; seed++) {
			expect(generateExercise(PROGRESSION, 'fr.lesson.repair', seededRng(seed)).groups).toEqual(
				generateExercise(plain, 'fr.lesson.repair', seededRng(seed)).groups
			);
		}
	});
});
