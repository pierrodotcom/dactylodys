import { describe, expect, it } from 'vitest';
import type { NormalizedKeystroke } from '../../keyboard/types';
import { createGame, reduce, type GameState } from '../shared/game-state';
import { viewOf } from '../shared/game-view';
import {
	INGREDIENT_VARIANTS,
	PREP_STAGES,
	ingredientPlace,
	ingredientVariant,
	isDishReady,
	isPouring,
	liquidPath,
	prepStage
} from './prep';
import { INGREDIENTS } from './shapes';

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

describe('prepStage', () => {
	it('starts with a whole ingredient', () => {
		expect(prepStage(viewOf(createGame(['fjdk'], 'retry'), false))).toBe(0);
	});

	it('cuts a little more with the good keys, and never goes back', () => {
		let state = createGame(['fjdkfjdk'], 'retry');
		let previous = 0;
		for (const value of 'fjdkfjd') {
			state = press(state, value);
			const stage = prepStage(viewOf(state, false));
			expect(stage).toBeGreaterThanOrEqual(previous);
			previous = stage;
		}

		expect(previous).toBeGreaterThan(0);
	});

	it('does not cut on a wrong key', () => {
		const state = press(press(createGame(['fjdk'], 'retry'), 'f'), 'f');

		expect(prepStage(viewOf(press(state, 'x'), false))).toBe(prepStage(viewOf(state, false)));
	});

	it('keeps the last cut for the end of the group', () => {
		const almost = typeAll(createGame(['fjdkfjdk'], 'retry'), 'fjdkfjd');
		expect(prepStage(viewOf(almost, false))).toBeLessThan(PREP_STAGES);

		expect(prepStage(viewOf(press(almost, 'k'), false))).toBe(PREP_STAGES);
	});
});

describe('where the ingredient is', () => {
	it('is on the board while typed, in the pot once done, and gone for the final picture', () => {
		const game = createGame(['fj'], 'retry', { finale: true });
		expect(ingredientPlace(viewOf(game, false))).toBe('board');

		const done = typeAll(game, 'fj');
		expect(ingredientPlace(viewOf(done, false))).toBe('pot');
		expect(isDishReady(viewOf(done, false))).toBe(false);

		const finale = reduce(done, { type: 'advance' }).state;
		expect(ingredientPlace(viewOf(finale, false))).toBe('none');
		expect(isDishReady(viewOf(finale, false))).toBe(true);
	});
});

describe('the jug', () => {
	it('lowers the liquid with each stage until it is empty', () => {
		const levels = Array.from({ length: PREP_STAGES + 1 }, (_, stage) => liquidPath(stage));

		expect(levels[0]).toMatch(/^M/);
		expect(levels[PREP_STAGES]).toBeNull();
		const tops = levels
			.slice(0, PREP_STAGES)
			.map((path) => Number(/ (-?[\d.]+)L/.exec(path ?? '')?.[1]));
		expect([...tops].sort((a, b) => a - b)).toEqual(tops);
		expect(new Set(tops).size).toBe(PREP_STAGES);
	});

	it('pours only while it is being emptied', () => {
		expect([0, 1, 2, 3, 4].map(isPouring)).toEqual([false, true, true, true, false]);
	});
});

describe('ingredients', () => {
	it('has a drawing for each look', () => {
		expect(INGREDIENTS).toHaveLength(INGREDIENT_VARIANTS);
	});

	it('gives each solid ingredient one cut per stage', () => {
		for (const drawing of INGREDIENTS.slice(0, INGREDIENT_VARIANTS - 1)) {
			expect(drawing.cuts).toHaveLength(PREP_STAGES);
		}
	});

	it('follows one another in order, then starts over', () => {
		expect([0, 1, 4, 5, 6].map(ingredientVariant)).toEqual([0, 1, 4, 0, 1]);
	});
});
