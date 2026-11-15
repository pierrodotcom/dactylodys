import { describe, expect, it } from 'vitest';
import { loadShippedProgressions } from '../engine/progression/test-support';
import type { NormalizedKeystroke } from '../keyboard/types';
import { questionOf } from './dialogue/talk';
import { drawnShare, isColored } from './drawing/draw';
import { dishName, type DishTemplate } from './recipe/dish';
import { isDishReady, PREP_STAGES, prepStage } from './recipe/prep';
import { GAMES } from './registry';
import {
	COLLECTION,
	MAX_WAITING,
	collectionPlace,
	isInFrame,
	objectOf,
	riverObjects
} from './river/river';
import { departureIndex, isLastLeg, rocketPose } from './rocket/flight';
import { createGame, reduce, type GameState } from './shared/game-state';
import { viewOf, type GameView } from './shared/game-view';
import {
	FLAG_HEIGHT,
	GROUND_Y,
	SCENE as TOWER_SCENE,
	blockSize,
	blockSpot,
	flagSpot
} from './tower/blocks';
import { LOCO, WAGON } from './train/shapes';
import {
	SCENE as TRAIN_SCENE,
	isTrainComplete,
	rollStartX,
	slotX,
	trainOriginX,
	trainScale,
	wagonIndexes
} from './train/train';

/**
 * Plays that last (ADR-075, choice 4): an exercise grows by whole groups up to
 * `rules.maxGroupCount`. Every game draws from the same view of the play (`GameView`); this file
 * checks, game by game, that a play of that many groups stays right, from its first group to its
 * end. A game added to the registry is added here too.
 */

const LONGEST = Math.max(
	...loadShippedProgressions().map(({ progression }) => progression.rules.maxGroupCount ?? 0)
);
const TOTALS = Array.from({ length: LONGEST }, (_, index) => index + 1);
/** The speech bubble of the tower sits on the top band of its scene. */
const TOWER_BUBBLE_BOTTOM = 45;
/** Free room kept left of the whole train, for the scenes that bring something in from there. */
const TRAIN_LEFT_ROOM = 60;
/** As many questions as Floup has: more than the groups of the longest play. */
const QUESTIONS = Array.from({ length: 30 }, (_, index) => `question ${index}`);
/** As many objects as the river has. */
const OBJECTS = Array.from({ length: 12 }, (_, index) => `object ${index}`);
const DISH: DishTemplate = ({ first, last }) => `${first} / ${last}`;

const LONG_PLAY = TOTALS.map((index) => (index % 2 === 0 ? 'fj dk' : 'kd'));

function press(state: GameState, value: string, at: number): GameState {
	const keystroke: NormalizedKeystroke = {
		kind: 'char',
		char: value,
		code: value === ' ' ? 'Space' : `Key${value.toUpperCase()}`,
		timestamp: at,
		composed: false
	};
	return reduce(state, { type: 'keystroke', keystroke }).state;
}

/** Every view of a play typed without a mistake, key after key, from its first group to its end. */
function viewsOf(groups: readonly string[], playCount = 0): GameView[] {
	let state = createGame(groups, 'retry');
	let at = 0;
	const views = [viewOf(state, false, [], playCount)];
	for (const group of groups) {
		for (const value of group) {
			at += 100;
			state = press(state, value, at);
			views.push(viewOf(state, false, [], playCount));
		}
		state = reduce(state, { type: 'settle' }).state;
		state = reduce(state, { type: 'advance', at }).state;
		views.push(viewOf(state, false, [], playCount));
	}
	return views;
}

const views = viewsOf(LONG_PLAY);
const finished = (view: GameView) => view.phase === 'finale' || view.phase === 'complete';
const lastRewarded = (view: GameView) =>
	view.phase !== 'typing' && view.groupIndex === view.total - 1;

/** What each game draws from the number of groups, checked over a long play. */
const CHECKS: Readonly<Record<string, () => void>> = {
	tower: () => {
		let previous = Number.POSITIVE_INFINITY;
		for (const total of TOTALS) {
			const size = blockSize(total);
			const top = blockSpot(total - 1, size).y - size.height;
			expect(top, `${total} blocks`).toBeGreaterThan(TOWER_BUBBLE_BOTTOM);
			expect(flagSpot(total).y - FLAG_HEIGHT, `${total} blocks`).toBeGreaterThanOrEqual(
				TOWER_BUBBLE_BOTTOM
			);
			expect(blockSpot(0, size).y).toBe(GROUND_Y);
			expect(size.height).toBeLessThanOrEqual(previous);
			expect(size.width).toBeLessThan(TOWER_SCENE.width);
			previous = size.height;
		}
	},
	train: () => {
		for (const total of TOTALS) {
			const scale = trainScale(total);
			const left = trainOriginX(total) + slotX(total - 1) * scale;
			expect(left, `${total} wagons`).toBeGreaterThanOrEqual(TRAIN_LEFT_ROOM);
			expect(trainOriginX(total) + LOCO.width * scale).toBeLessThanOrEqual(TRAIN_SCENE.width);
			expect(trainOriginX(total) + (rollStartX(total) + WAGON.width) * scale).toBeLessThanOrEqual(
				0
			);
		}
		for (const view of views) {
			expect(wagonIndexes(view)).toHaveLength(Math.min(view.total, view.groupIndex + 1));
			expect(isTrainComplete(view)).toBe(lastRewarded(view));
		}
	},
	river: () => {
		for (const view of views) {
			const objects = riverObjects(view);
			expect(objects.filter((object) => object.role === 'waiting').length).toBeLessThanOrEqual(
				MAX_WAITING
			);
			for (const object of objects) expect(isInFrame(object.place), `${object.index}`).toBe(true);
		}
		const places = TOTALS.map((index) => collectionPlace(index - 1, LONGEST));
		expect(new Set(places.map((place) => `${place.x} ${place.y}`)).size).toBe(LONGEST);
		for (const place of places) {
			expect(place.x).toBeGreaterThan(COLLECTION.x);
			expect(place.x).toBeLessThan(COLLECTION.x + COLLECTION.width);
		}
		const caught = TOTALS.map((index) => objectOf(OBJECTS, views[0] as GameView, index - 1));
		expect(new Set(caught).size).toBe(Math.min(LONGEST, OBJECTS.length));
	},
	drawing: () => {
		let share = 0;
		for (const view of views) {
			expect(drawnShare(view)).toBeGreaterThanOrEqual(share);
			share = drawnShare(view);
			expect(isColored(view)).toBe(finished(view) || lastRewarded(view));
		}
		expect(share).toBe(1);
	},
	rocket: () => {
		for (const view of views) {
			expect(rocketPose(view).landed).toBe(lastRewarded(view) || finished(view));
			expect(isLastLeg(view)).toBe(view.groupIndex === LONGEST - 1);
			expect(departureIndex(view)).toBe(view.groupIndex === 0 ? null : view.groupIndex - 1);
		}
	},
	recipe: () => {
		for (const view of views) {
			// Every ingredient is ready once its group is done, whatever the number of groups.
			expect(prepStage(view) === PREP_STAGES).toBe(view.phase !== 'typing');
			expect(prepStage(view)).toBeGreaterThanOrEqual(0);
			expect(isDishReady(view)).toBe(finished(view));
		}
		expect(dishName(LONG_PLAY, [DISH])).toBe(`${LONG_PLAY[0]} / ${LONG_PLAY.at(-1)}`);
	},
	dialogue: () => {
		const asked = views
			.filter((view) => view.phase === 'typing')
			.map((view) => questionOf(QUESTIONS, view));
		expect(new Set(asked).size).toBe(LONGEST);
	},
	// One big egg in the scene and one small egg per group in the row above it: only the row
	// depends on the number of groups, and it follows the view.
	hatching: () => {
		const hatched = views.map((view) => view.completed);
		expect(hatched).toEqual([...hatched].sort((a, b) => a - b));
		expect(hatched.at(-1)).toBe(LONGEST);
	}
};

describe('a play as long as an exercise can grow', () => {
	it('is the longest play the shipped progressions allow', () => {
		expect(LONGEST).toBeGreaterThanOrEqual(8);
		expect(views.at(-1)?.total).toBe(LONGEST);
		expect(finished(views.at(-1) as GameView)).toBe(true);
	});

	it('is checked for every game of the registry', () => {
		expect(Object.keys(CHECKS).sort()).toEqual(GAMES.map((game) => game.id).sort());
	});

	it.each(GAMES.map((game) => game.id))('stays right in the game %s', (id) => {
		CHECKS[id]?.();
	});

	it('counts every group once in the view the games draw from', () => {
		const ranks = new Set(views.map((view) => view.rewardIndex - view.playOffset));
		expect([...ranks]).toEqual(TOTALS.map((index) => index - 1));
		expect(viewsOf(LONG_PLAY, 3)[0]?.playOffset).toBe(3 * LONGEST);
	});
});
