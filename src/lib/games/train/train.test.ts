import { describe, expect, it } from 'vitest';
import type { NormalizedKeystroke } from '../../keyboard/types';
import { createGame, reduce, type GameState } from '../shared/game-state';
import { viewOf } from '../shared/game-view';
import { CARGOS, CARGO_KINDS, CARGO_TONES, LOCO, WAGON, WAGON_TONES, wagonLook } from './shapes';
import {
	SCENE,
	holdBack,
	isDeparting,
	isTrainComplete,
	rollRatio,
	rollStartX,
	slotX,
	trainOriginX,
	trainScale,
	wagonIndexes,
	wheelAngle
} from './train';

function press(state: GameState, text: string): GameState {
	return [...text].reduce((current, value) => {
		const keystroke: NormalizedKeystroke = {
			kind: 'char',
			char: value,
			code: `Key${value.toUpperCase()}`,
			timestamp: 1,
			composed: false
		};
		return reduce(current, { type: 'keystroke', keystroke }).state;
	}, state);
}

const GROUP_COUNTS = [5, 6, 7, 8, 9, 10] as const;

describe('the train layout', () => {
	it('fits the scene with any number of groups, with room left of it', () => {
		for (const total of GROUP_COUNTS) {
			const scale = trainScale(total);
			const left = trainOriginX(total) + slotX(total - 1) * scale;
			const right = trainOriginX(total) + LOCO.width * scale;

			expect(left).toBeGreaterThanOrEqual(60);
			expect(right).toBeLessThanOrEqual(SCENE.width);
		}
	});

	it('draws a long train smaller than a short one, never bigger than the short one', () => {
		const scales = GROUP_COUNTS.map((total) => trainScale(total));

		expect([...scales].sort((a, b) => b - a)).toEqual(scales);
		expect(scales[0]).toBeGreaterThan(scales[scales.length - 1] ?? 0);
	});

	it('puts the wagons one pitch apart, the first one against the locomotive', () => {
		expect(slotX(0) + WAGON.pitch).toBe(0);
		expect(slotX(3) - slotX(2)).toBe(-WAGON.pitch);
	});

	it('starts a wagon out of the scene, on the left', () => {
		for (const total of GROUP_COUNTS) {
			const right = trainOriginX(total) + (rollStartX(total) + WAGON.width) * trainScale(total);

			expect(right).toBeLessThanOrEqual(0);
		}
	});

	it('turns a wheel by its own circumference when the wagon rolls', () => {
		expect(wheelAngle(2 * Math.PI * WAGON.wheelRadius, WAGON.wheelRadius)).toBeCloseTo(360);
		expect(wheelAngle(0, WAGON.wheelRadius)).toBe(0);
	});
});

describe('the wagon that rolls in', () => {
	it('advances one notch per good key and is in place once the group is done', () => {
		let state = createGame(['fjdk', 'kd'], 'retry');
		const ratios = [rollRatio(viewOf(state, false))];
		for (const value of 'fjdk') {
			state = press(state, value);
			ratios.push(rollRatio(viewOf(state, false)));
		}

		expect(ratios).toEqual([0, 0.25, 0.5, 0.75, 1]);
	});

	it('stays where it is on a wrong key', () => {
		const state = press(createGame(['fjdk'], 'retry'), 'f');
		const after = press(state, 'x');

		expect(rollRatio(viewOf(after, false))).toBe(rollRatio(viewOf(state, false)));
	});

	it('draws the hooked wagons and the one in motion, none after the end', () => {
		let state = createGame(['fj', 'dk', 'sl'], 'retry');
		expect(wagonIndexes(viewOf(state, false))).toEqual([0]);

		state = press(state, 'fj');
		state = reduce(state, { type: 'advance' }).state;
		expect(wagonIndexes(viewOf(state, false))).toEqual([0, 1]);

		state = press(state, 'dk');
		state = reduce(state, { type: 'advance' }).state;
		state = press(state, 'sl');
		expect(wagonIndexes(viewOf(state, false))).toEqual([0, 1, 2]);
	});

	it('is complete, and the train leaves, only after the last group', () => {
		let state = createGame(['fj', 'dk'], 'retry', { finale: true });
		state = press(state, 'fj');
		expect(isTrainComplete(viewOf(state, false))).toBe(false);

		state = reduce(state, { type: 'advance' }).state;
		state = press(state, 'dk');
		expect(isTrainComplete(viewOf(state, false))).toBe(true);
		expect(isDeparting(viewOf(state, false))).toBe(false);

		state = reduce(state, { type: 'advance' }).state;
		expect(isDeparting(viewOf(state, false))).toBe(true);
	});
});

describe('holdBack', () => {
	const SCENES = ['bounce-hook', 'whistle-puff', 'sliding-stop'];

	it('keeps the wagon short of its place while a scene that finishes the way is pending', () => {
		const view = viewOf(createGame(['fj'], 'retry'), false, SCENES);

		expect(holdBack(view)).toBeGreaterThan(0);
	});

	it('keeps nothing back for a scene that does not move the wagon', () => {
		const view = viewOf(createGame(['fj', 'dk'], 'retry'), false, ['whistle-puff']);

		expect(holdBack(view)).toBe(0);
	});

	it('puts the wagon in its place once the group is done, whatever the scene', () => {
		const state = press(createGame(['fj'], 'retry'), 'fj');

		expect(holdBack(viewOf(state, false, SCENES))).toBe(0);
	});

	it('keeps nothing back with calm motion, which plays no scene', () => {
		expect(holdBack(viewOf(createGame(['fj'], 'retry'), true, SCENES))).toBe(0);
	});
});

describe('wagonLook', () => {
	it('is fixed for a group and different for every wagon of a train of ten', () => {
		const looks = Array.from({ length: 10 }, (_, index) => wagonLook(index));
		const keys = looks.map((look) => `${look.tone}:${look.cargo}`);

		expect(new Set(keys).size).toBe(10);
		expect(wagonLook(7)).toEqual(wagonLook(7));
	});

	it('stays within the colours and the loads that exist', () => {
		for (let index = 0; index < 30; index++) {
			const look = wagonLook(index);

			expect(look.tone).toBeLessThan(WAGON_TONES);
			expect(look.cargo).toBeLessThan(CARGO_KINDS);
		}
	});

	it('has loads of four items, each with a known tone, for the wave', () => {
		expect(CARGOS).toHaveLength(CARGO_KINDS);
		for (const cargo of CARGOS) {
			expect(cargo).toHaveLength(4);
			for (const item of cargo) expect(item.tone).toBeLessThan(CARGO_TONES);
		}
	});
});
