import { describe, expect, it } from 'vitest';
import type { NormalizedKeystroke } from '../../keyboard/types';
import { createGame, reduce, type GameState } from '../shared/game-state';
import { viewOf } from '../shared/game-view';
import {
	ASTRE_VARIANTS,
	FLIGHT,
	astreVariant,
	departureIndex,
	destinationLit,
	isLastLeg,
	notchWidth,
	rocketPose
} from './flight';

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

describe('rocketPose', () => {
	it('waits at the start of the leg before the first good key', () => {
		const pose = rocketPose(viewOf(createGame(['fjdk', 'kd'], 'retry'), false));

		expect(pose).toMatchObject({ x: FLIGHT.startX, y: FLIGHT.cruiseY, landed: false });
	});

	it('moves one notch forward with each good key', () => {
		let state = createGame(['fjdk', 'kd'], 'retry');
		const xs: number[] = [];
		for (const value of 'fjd') {
			state = press(state, value);
			xs.push(rocketPose(viewOf(state, false)).x);
		}

		const step = notchWidth(4);
		expect(xs[0]).toBeCloseTo(FLIGHT.startX + step);
		expect(xs[1]).toBeCloseTo(FLIGHT.startX + 2 * step);
		expect(xs[2]).toBeCloseTo(FLIGHT.startX + 3 * step);
	});

	it('does not move on a wrong key, and does not go back', () => {
		let state = press(createGame(['fjdk'], 'retry'), 'f');
		const before = rocketPose(viewOf(state, false));

		state = press(state, 'x');
		state = press(state, 'x');

		expect(rocketPose(viewOf(state, false))).toEqual(before);
	});

	it('reaches the next astre when the group is done', () => {
		let state = createGame(['fj', 'jf'], 'retry');
		state = press(press(state, 'f'), 'j');

		const view = viewOf(state, false);

		expect(rocketPose(view)).toMatchObject({ x: FLIGHT.endX, landed: false });
		expect(destinationLit(view)).toBe(true);
	});

	it('flies the whole leg whatever the length of the group', () => {
		for (const length of [1, 2, 5, 12]) {
			expect(notchWidth(length) * length).toBeCloseTo(FLIGHT.endX - FLIGHT.startX);
		}
	});

	it('lands on the last astre', () => {
		let state = createGame(['fj'], 'retry');
		state = press(press(state, 'f'), 'j');

		const view = viewOf(state, false);

		expect(isLastLeg(view)).toBe(true);
		expect(rocketPose(view)).toMatchObject({
			x: FLIGHT.landingX,
			y: FLIGHT.landingY,
			landed: true
		});
	});

	it('starts the next leg at the start again', () => {
		let state = createGame(['fj', 'jf'], 'retry');
		state = press(press(state, 'f'), 'j');
		state = reduce(state, { type: 'advance' }).state;

		const view = viewOf(state, false);

		expect(rocketPose(view).x).toBe(FLIGHT.startX);
		expect(destinationLit(view)).toBe(false);
		expect(isLastLeg(view)).toBe(true);
	});
});

describe('astres', () => {
	it('leaves from the home planet, then from the astre reached last', () => {
		let state = createGame(['fj', 'jf', 'dd'], 'retry');
		expect(departureIndex(viewOf(state, false))).toBeNull();

		state = press(press(state, 'f'), 'j');
		state = reduce(state, { type: 'advance' }).state;
		expect(departureIndex(viewOf(state, false))).toBe(0);
	});

	it('cycles through its looks in order', () => {
		const looks = Array.from({ length: ASTRE_VARIANTS * 2 }, (_, index) => astreVariant(index));

		expect(looks.slice(0, ASTRE_VARIANTS)).toEqual(looks.slice(ASTRE_VARIANTS));
		expect(new Set(looks).size).toBe(ASTRE_VARIANTS);
	});
});
