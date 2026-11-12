import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { NormalizedKeystroke } from '../../keyboard/types';
import { GAME_DECORS, decorFor } from '../shared/decor';
import { createGame, reduce, type GameState } from '../shared/game-state';
import { viewOf, type GameView } from '../shared/game-view';
import {
	DOCK,
	MAX_WAITING,
	SCENE,
	collectionPlace,
	frontIndex,
	isInFrame,
	labelShift,
	objectOf,
	probeOf,
	riverObjects,
	samePlace,
	upstreamOf
} from './river';
import { OBJECT_ARTS } from './shapes';

function press(state: GameState, value: string, at: number): GameState {
	const keystroke: NormalizedKeystroke = {
		kind: 'char',
		char: value,
		code: `Key${value.toUpperCase()}`,
		timestamp: at,
		composed: false
	};
	return reduce(state, { type: 'keystroke', keystroke }).state;
}

function type(state: GameState, text: string): GameState {
	return [...text].reduce(
		(current, value, index) => press(current, value, (index + 1) * 100),
		state
	);
}

/** Types the first `done` groups, moving on after each, then `text` in the next one. */
function stateAfter(groups: readonly string[], done: number, text = ''): GameState {
	let state = createGame(groups, 'retry');
	for (const group of groups.slice(0, done)) {
		state = reduce(type(state, group), { type: 'advance' }).state;
	}
	return type(state, text);
}

function viewAt(state: GameState, playCount = 0): GameView {
	return viewOf(state, false, [], playCount);
}

const GROUPS = ['fj', 'dk', 'sl fj', 'qm', 'jf kd', 'ab', 'cd', 'ef'];

describe('riverObjects', () => {
	it('keeps the object of the group at the dock while its group is typed, whatever the time', () => {
		for (const text of ['', 'd', 'x', 'dx']) {
			const view = viewAt(stateAfter(GROUPS, 1, text));
			const docked = riverObjects(view).filter((object) => object.role === 'docked');

			expect(docked).toEqual([{ index: 1, role: 'docked', place: { ...DOCK, scale: 1 } }]);
		}
	});

	it('shows the next objects waiting behind it, upstream, and never more than a few', () => {
		const view = viewAt(stateAfter(GROUPS, 0));
		const waiting = riverObjects(view).filter((object) => object.role === 'waiting');

		expect(waiting.map((object) => object.index)).toEqual([1, 2]);
		expect(waiting.length).toBeLessThanOrEqual(MAX_WAITING);
		for (const object of waiting) expect(object.place.x).toBeLessThan(DOCK.x);
	});

	it('never puts an object at the dock or behind it outside the scene', () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 12 }), fc.nat(12), (total, done) => {
				const groups = Array.from({ length: total }, () => 'f');
				const state = stateAfter(groups, Math.min(done, total - 1));
				for (const object of riverObjects(viewAt(state))) {
					expect(isInFrame(object.place)).toBe(true);
				}
			})
		);
	});

	it('does not move the object at the dock on a wrong key', () => {
		const before = riverObjects(viewAt(stateAfter(GROUPS, 0)));
		const after = riverObjects(viewAt(press(stateAfter(GROUPS, 0), 'x', 100)));

		expect(after).toEqual(before);
	});

	it('catches the object once its group is typed, and brings the next one to the dock', () => {
		const view = viewAt(stateAfter(GROUPS, 0, 'fj'));
		const objects = riverObjects(view);

		expect(objects.find((object) => object.index === 0)).toEqual({
			index: 0,
			role: 'caught',
			place: collectionPlace(0, GROUPS.length)
		});
		expect(objects.find((object) => object.role === 'docked')?.index).toBe(1);
	});

	it('keeps every object caught in the crate, one place each', () => {
		const view = viewAt(stateAfter(GROUPS, 4));
		const collected = riverObjects(view).filter((object) => object.role === 'collected');

		expect(collected.map((object) => object.index)).toEqual([0, 1, 2, 3]);
		const places = new Set(collected.map((object) => `${object.place.x} ${object.place.y}`));
		expect(places.size).toBe(4);
	});

	it('leaves nothing on the water once the last object is caught', () => {
		const view = viewAt(stateAfter(GROUPS, GROUPS.length - 1, GROUPS.at(-1)));
		const objects = riverObjects(view);

		expect(frontIndex(view)).toBe(GROUPS.length);
		expect(
			objects.filter((object) => object.role === 'docked' || object.role === 'waiting')
		).toEqual([]);
		expect(objects).toHaveLength(GROUPS.length);
	});
});

describe('samePlace', () => {
	it('gives every object the same place while a group is typed, so that no key sends it again', () => {
		const before = riverObjects(viewAt(stateAfter(GROUPS, 1)));
		for (const text of ['d', 'dx', 'x']) {
			const after = riverObjects(viewAt(stateAfter(GROUPS, 1, text)));
			for (const object of after) {
				const earlier = before.find((item) => item.index === object.index);
				if (earlier) {
					expect(samePlace(earlier.place, object.place)).toBe(true);
				}
			}
		}
	});

	it('tells a new place from the old one', () => {
		expect(samePlace({ x: 1, y: 2, scale: 1 }, { x: 1, y: 2, scale: 1 })).toBe(true);
		expect(samePlace({ x: 1, y: 2, scale: 1 }, { x: 1, y: 2, scale: 0.5 })).toBe(false);
		expect(samePlace({ x: 1, y: 2, scale: 1 }, { x: 3, y: 2, scale: 1 })).toBe(false);
	});
});

describe('collectionPlace', () => {
	it('puts every object of an exercise inside the scene, smaller than on the water', () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 20 }), (total) => {
				for (let index = 0; index < total; index++) {
					const place = collectionPlace(index, total);
					expect(isInFrame(place)).toBe(true);
					expect(place.scale).toBeLessThan(1);
					expect(place.y).toBeLessThan(SCENE.height);
				}
			})
		);
	});
});

describe('upstreamOf', () => {
	it('starts a floating object one place further up the river, to the left', () => {
		expect(upstreamOf({ ...DOCK, scale: 1 }).x).toBeLessThan(DOCK.x);
	});
});

describe('objectOf', () => {
	it('gives a different drawing to each group, in order, without chance', () => {
		const view = viewAt(stateAfter(GROUPS, 0));
		const ids = GROUPS.map((_, index) => objectOf(OBJECT_ARTS, view, index)?.id);

		expect(ids).toEqual(OBJECT_ARTS.slice(0, GROUPS.length).map((art) => art.id));
	});

	it('goes on with the next objects when the game is played again', () => {
		const second = viewAt(stateAfter(GROUPS, 0), 1);

		expect(objectOf(OBJECT_ARTS, second, 0)?.id).toBe(OBJECT_ARTS[GROUPS.length]?.id);
	});

	it('has at least twelve different drawings, each with something to draw', () => {
		expect(OBJECT_ARTS.length).toBeGreaterThanOrEqual(12);
		expect(new Set(OBJECT_ARTS.map((art) => art.id)).size).toBe(OBJECT_ARTS.length);
		for (const art of OBJECT_ARTS) expect(art.parts.length).toBeGreaterThan(0);
	});
});

describe('probeOf', () => {
	it('moves on with every good key, never with a wrong one', () => {
		expect(probeOf(viewAt(stateAfter(GROUPS, 0)))).toBe(0);
		expect(probeOf(viewAt(press(stateAfter(GROUPS, 0), 'x', 100)))).toBe(0);
		expect(probeOf(viewAt(stateAfter(GROUPS, 0, 'f')))).toBe(1);
		expect(probeOf(viewAt(stateAfter(GROUPS, 0, 'fj')))).toBe(2);
	});
});

describe('labelShift', () => {
	it('leaves a label that fits where it is', () => {
		expect(labelShift(DOCK.x, 100, 6)).toBe(0);
	});

	it('moves a label back inside the scene near an edge', () => {
		const shift = labelShift(40, 120, 6);

		expect(40 + shift - 60).toBeGreaterThanOrEqual(6);
		const right = SCENE.width - 20;
		expect(right + labelShift(right, 120, 6) + 60).toBeLessThanOrEqual(SCENE.width - 6);
	});

	it('centres a label wider than the scene', () => {
		const width = SCENE.width + 40;

		expect(DOCK.x + labelShift(DOCK.x, width, 6)).toBe(SCENE.width / 2);
	});
});

describe('the decors of the river', () => {
	it('starts on a sunny day, then a sunset, then a night', () => {
		expect(GAME_DECORS.river).toEqual(['day', 'sunset', 'night']);
		expect([0, 1, 2, 3].map((plays) => decorFor('river', plays))).toEqual([
			'day',
			'sunset',
			'night',
			'day'
		]);
	});
});
