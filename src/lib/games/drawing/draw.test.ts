import { describe, expect, it } from 'vitest';
import type { NormalizedKeystroke } from '../../keyboard/types';
import { createGame, reduce, type GameState } from '../shared/game-state';
import { viewOf } from '../shared/game-view';
import { drawnShare, isColored, locateShare, pictureFor, strokeFractions } from './draw';
import { DRAWINGS, ellipseLength, paintOrder } from './shapes';

function press(state: GameState, value: string): GameState {
	const keystroke: NormalizedKeystroke = {
		kind: 'char',
		char: value,
		code: `Key${value.toUpperCase()}`,
		timestamp: 1,
		composed: false
	};
	return reduce(state, { type: 'keystroke', keystroke }).state;
}

function typeAll(state: GameState, text: string): GameState {
	return [...text].reduce(press, state);
}

describe('pictureFor', () => {
	it('gives the same drawing to the same play of a lesson, never at random', () => {
		expect(pictureFor('fr.lesson.oeufs-f-j', 3)).toBe(pictureFor('fr.lesson.oeufs-f-j', 3));
	});

	it('draws another subject at each new play, and every subject before the first comes back', () => {
		const lesson = 'fr.lesson.oeufs-f-j';
		const plays = DRAWINGS.map((_, count) => pictureFor(lesson, count).id);
		expect(new Set(plays).size).toBe(DRAWINGS.length);
		for (let count = 0; count < 3 * DRAWINGS.length; count++) {
			expect(pictureFor(lesson, count + 1).id).not.toBe(pictureFor(lesson, count).id);
		}
	});

	it('spreads the lessons over several drawings', () => {
		const lessons = Array.from({ length: 24 }, (_, index) => `fr.lesson.lesson-${index}`);

		expect(new Set(lessons.map((lesson) => pictureFor(lesson).id)).size).toBeGreaterThanOrEqual(4);
	});
});

describe('the drawings', () => {
	it('are at least six, with distinct identifiers', () => {
		expect(DRAWINGS.length).toBeGreaterThanOrEqual(6);
		expect(new Set(DRAWINGS.map((picture) => picture.id)).size).toBe(DRAWINGS.length);
	});

	it('have strokes with a positive weight, and no stroke without a path', () => {
		for (const picture of DRAWINGS) {
			expect(picture.strokes.length).toBeGreaterThan(3);
			for (const stroke of picture.strokes) {
				expect(stroke.d).toMatch(/^M/);
				expect(stroke.weight).toBeGreaterThan(0);
			}
		}
	});

	it('paint every coloured stroke once, the back ones first', () => {
		for (const picture of DRAWINGS) {
			const coloured = picture.strokes.filter((stroke) => stroke.tone !== undefined);
			const painted = paintOrder(picture);
			const ranks = painted.map((stroke) =>
				['back', 'middle', 'front'].indexOf(stroke.layer ?? 'middle')
			);

			expect(painted).toHaveLength(coloured.length);
			expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
		}
	});

	it('measure a circle as 2 pi r', () => {
		expect(ellipseLength(10, 10)).toBe(63);
	});
});

describe('strokeFractions', () => {
	it('draws nothing at the start and everything at the end', () => {
		expect(strokeFractions([10, 20], 0)).toEqual([0, 0]);
		expect(strokeFractions([10, 20], 1)).toEqual([1, 1]);
	});

	it('draws the strokes one after the other, each for as long as it is long', () => {
		const fractions = strokeFractions([10, 20, 10], 0.5);

		expect(fractions[0]).toBe(1);
		expect(fractions[1]).toBe(0.5);
		expect(fractions[2]).toBe(0);
	});

	it('only goes forward with the share', () => {
		let before = strokeFractions([5, 15, 30], 0);
		for (let share = 0.05; share <= 1; share += 0.05) {
			const now = strokeFractions([5, 15, 30], share);
			now.forEach((fraction, index) => expect(fraction).toBeGreaterThanOrEqual(before[index] ?? 0));
			before = now;
		}
	});
});

describe('locateShare', () => {
	it('finds the stroke being drawn and how far along it is', () => {
		expect(locateShare([10, 10], 0.25)).toEqual({ index: 0, fraction: 0.5 });
		expect(locateShare([10, 10], 0.75)).toEqual({ index: 1, fraction: 0.5 });
	});

	it('stays on the last stroke once everything is drawn', () => {
		expect(locateShare([10, 10], 1)).toEqual({ index: 1, fraction: 1 });
	});
});

describe('drawnShare', () => {
	it('is nothing before the first good key, whatever the number of groups', () => {
		for (const count of [5, 10]) {
			const groups = Array.from({ length: count }, () => 'fjdk');
			expect(drawnShare(viewOf(createGame(groups, 'retry'), false))).toBe(0);
		}
	});

	it('grows with every good key, and never with a wrong one', () => {
		let state = createGame(['fjdk', 'fjdk'], 'retry');
		let previous = 0;
		for (const value of 'fjd') {
			state = press(state, value);
			const share = drawnShare(viewOf(state, false));
			expect(share).toBeGreaterThan(previous);
			previous = share;
		}

		expect(drawnShare(viewOf(press(state, 'x'), false))).toBe(previous);
	});

	it('counts a finished group once, while its reward is on screen', () => {
		const state = typeAll(createGame(['fj', 'dk', 'sl', 'qm', 'jf'], 'retry'), 'fj');

		expect(drawnShare(viewOf(state, false))).toBeCloseTo(1 / 5);
	});

	it('is complete with the last group', () => {
		const state = typeAll(createGame(['fj'], 'retry'), 'fj');

		expect(drawnShare(viewOf(state, false))).toBe(1);
	});
});

describe('isColored', () => {
	it('shows the colours only once the last group is done', () => {
		const start = createGame(['fj', 'dk'], 'retry');
		const first = typeAll(start, 'fj');
		const last = typeAll(
			reduce(reduce(first, { type: 'settle' }).state, { type: 'advance' }).state,
			'dk'
		);

		expect(isColored(viewOf(typeAll(start, 'f'), false))).toBe(false);
		expect(isColored(viewOf(first, false))).toBe(false);
		expect(isColored(viewOf(last, false))).toBe(true);
	});
});
