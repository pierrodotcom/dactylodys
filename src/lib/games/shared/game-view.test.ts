import { describe, expect, it } from 'vitest';
import type { NormalizedKeystroke } from '../../keyboard/types';
import { createGame, reduce, type GameState } from './game-state';
import { isRewarded, pickCyclic, viewOf } from './game-view';

function type(state: GameState, text: string): GameState {
	return [...text].reduce((current, value, index) => {
		const keystroke: NormalizedKeystroke = {
			kind: 'char',
			char: value,
			code: `Key${value.toUpperCase()}`,
			timestamp: (index + 1) * 100,
			composed: false
		};
		return reduce(current, { type: 'keystroke', keystroke }).state;
	}, state);
}

describe('viewOf', () => {
	it('gives the group, the progress in the group, the finished groups, the mood and the error', () => {
		let state = createGame(['fj', 'jf', 'dd'], 'retry');
		state = type(state, 'fj');
		state = reduce(state, { type: 'advance' }).state;
		state = type(state, 'xj');

		const view = viewOf(state, false);

		expect(view).toMatchObject({
			groupIndex: 1,
			group: ['j', 'f'],
			position: 1,
			completed: 1,
			total: 3,
			phase: 'typing',
			mood: 'idle',
			errorIndex: null
		});
	});

	it('reports the error in progress', () => {
		const state = type(createGame(['fj'], 'retry'), 'x');

		expect(viewOf(state, false)).toMatchObject({ errorIndex: 0, mood: 'oops', wrongCode: 'KeyX' });
	});

	it('has nothing waiting to be erased with the retry policy', () => {
		const state = type(createGame(['fj'], 'retry'), 'xk');

		expect(viewOf(state, false).pending).toEqual([]);
	});

	it('shows the wrong characters written after the good ones, until they are erased', () => {
		const backspace: NormalizedKeystroke = {
			kind: 'backspace',
			char: null,
			code: 'Backspace',
			timestamp: 1000,
			composed: false
		};
		const wrong = type(createGame(['fjd'], 'backspace'), 'fxk');
		expect(viewOf(wrong, false)).toMatchObject({
			position: 1,
			pending: ['x', 'k'],
			errorIndex: 1,
			mood: 'oops'
		});

		const once = reduce(wrong, { type: 'keystroke', keystroke: backspace }).state;
		expect(viewOf(once, false).pending).toEqual(['x']);

		const erased = reduce(once, {
			type: 'keystroke',
			keystroke: { ...backspace, timestamp: 1100 }
		}).state;
		expect(viewOf(erased, false)).toMatchObject({ position: 1, pending: [], errorIndex: 1 });

		const resumed = type(erased, 'j');
		expect(viewOf(resumed, false)).toMatchObject({ position: 2, pending: [], errorIndex: null });
	});

	it('counts the group whose reward is on screen as finished', () => {
		const state = type(createGame(['fj', 'jf'], 'retry'), 'fj');

		const view = viewOf(state, true);

		expect(view).toMatchObject({ completed: 1, phase: 'celebrating', reducedMotion: true });
		expect(isRewarded(view)).toBe(true);
	});

	it('goes on counting the groups from one play of the game to the next', () => {
		const state = type(createGame(['fj', 'jf', 'dd'], 'retry'), 'fj');

		expect(viewOf(state, false)).toMatchObject({ rewardIndex: 0, playOffset: 0 });
		expect(viewOf(state, false, [], 2)).toMatchObject({ rewardIndex: 6, playOffset: 6 });
	});

	it('shows a replayed game the scenes that come next, not the first ones again', () => {
		const groups = ['fj', 'jf', 'dd'];
		const scenes = ['a', 'b'];
		const firstPlay = viewOf(createGame(groups, 'retry'), false, scenes, 0).scene;
		const secondPlay = viewOf(createGame(groups, 'retry'), false, scenes, 1).scene;

		expect(firstPlay).toEqual({ kind: 'scene', id: 'a' });
		expect(secondPlay).toEqual({ kind: 'variant', index: 1 });
	});

	it('ignores a play count that is not a natural number', () => {
		const state = createGame(['fj'], 'retry');

		for (const playCount of [-1, 1.5, Number.NaN]) {
			expect(viewOf(state, false, [], playCount).rewardIndex).toBe(0);
		}
	});

	it('is not rewarded while typing', () => {
		expect(isRewarded(viewOf(createGame(['fj'], 'retry'), false))).toBe(false);
	});
});

describe('pickCyclic', () => {
	it('takes the items in order, then starts over', () => {
		const list = ['a', 'b', 'c'];

		expect([0, 1, 2, 3, 4, 5, 6].map((index) => pickCyclic(list, index))).toEqual([
			'a',
			'b',
			'c',
			'a',
			'b',
			'c',
			'a'
		]);
	});

	it('gives nothing for an empty list', () => {
		expect(pickCyclic([], 3)).toBeUndefined();
	});

	it('handles a negative index', () => {
		expect(pickCyclic(['a', 'b', 'c'], -1)).toBe('c');
	});
});
