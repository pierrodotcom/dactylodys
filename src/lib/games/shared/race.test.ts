import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { NormalizedKeystroke } from '../../keyboard/types';
import { createGame, exerciseOutcome, reduce, type GameAction, type GameState } from './game-state';
import {
	STOPPED_CLOCK,
	clockMs,
	exerciseCharCount,
	followGame,
	typedCharCount,
	type RaceClock
} from './race';

function char(value: string, timestamp: number): GameAction {
	const keystroke: NormalizedKeystroke = {
		kind: 'char',
		char: value,
		code: `Key${value.toUpperCase()}`,
		timestamp,
		composed: false
	};
	return { type: 'keystroke', keystroke };
}

interface Race {
	game: GameState;
	clock: RaceClock;
}

function act(race: Race, action: GameAction, at: number): Race {
	const game = reduce(race.game, action).state;
	return { game, clock: followGame(race.clock, game, at) };
}

function start(groups: readonly string[]): Race {
	return { game: createGame(groups, 'retry'), clock: STOPPED_CLOCK };
}

describe('race clock', () => {
	it('does not run before the first keystroke of a group', () => {
		const race = start(['ab']);
		expect(clockMs(race.clock, 5000)).toBe(0);
	});

	it('runs from the first keystroke to the last one of each group, not in between', () => {
		let race = start(['ab', 'cd']);
		race = act(race, char('a', 1000), 1000);
		expect(clockMs(race.clock, 1500)).toBe(500);
		race = act(race, char('b', 2000), 2000);
		expect(clockMs(race.clock, 9000)).toBe(1000);
		race = act(race, { type: 'settle' }, 3000);
		race = act(race, { type: 'advance' }, 4000);
		expect(clockMs(race.clock, 6000)).toBe(1000);
		race = act(race, char('c', 6000), 6000);
		race = act(race, char('d', 6400), 6400);
		expect(clockMs(race.clock, 20_000)).toBe(1400);
	});

	it('stops during the pause and goes on at the resume', () => {
		let race = start(['abc']);
		race = act(race, char('a', 1000), 1000);
		race = act(race, { type: 'pause' }, 1300);
		expect(clockMs(race.clock, 60_000)).toBe(300);
		race = act(race, { type: 'resume' }, 60_000);
		expect(clockMs(race.clock, 60_200)).toBe(500);
	});

	it('stays stopped at a resume before the group has started', () => {
		let race = start(['abc']);
		race = act(race, { type: 'pause' }, 100);
		race = act(race, { type: 'resume' }, 200);
		expect(clockMs(race.clock, 900)).toBe(0);
	});
});

describe('the race and the pace kept for the next one', () => {
	it('ends the race on the time the pace of the play is recorded with, pauses and waits or not', () => {
		const steps = fc.array(
			fc.record({
				delta: fc.integer({ min: 0, max: 20_000 }),
				pause: fc.option(fc.integer({ min: 0, max: 200_000 }), { nil: null }),
				wrong: fc.boolean()
			}),
			{ minLength: 6, maxLength: 6 }
		);
		fc.assert(
			fc.property(steps, (items) => {
				const groups = ['ab', 'c', 'abc'];
				let at = 0;
				let race: Race = { game: createGame(groups, 'retry', { at }), clock: STOPPED_CLOCK };
				for (const [index, value] of [...groups.join('')].entries()) {
					const item = items[index] ?? { delta: 0, pause: null, wrong: false };
					at += item.delta;
					if (item.pause !== null) {
						race = act(race, { type: 'pause', at }, at);
						at += item.pause;
						race = act(race, { type: 'resume', at }, at);
					}
					if (item.wrong) race = act(race, char('x', at), at);
					race = act(race, char(value, at), at);
					if (race.game.phase === 'celebrating') {
						at += item.delta;
						race = act(race, { type: 'advance', at }, at);
					}
				}
				const { pace } = exerciseOutcome(race.game);
				expect(race.game.phase).toBe('complete');
				expect(pace.at(-1)?.activeMs).toBe(clockMs(race.clock, at + 5000));
			})
		);
	});
});

describe('typed characters', () => {
	it('counts the graphemes of the groups, a composed accent as one', () => {
		expect(exerciseCharCount(['ab', 'é c', 'é'])).toBe(6);
	});

	it('counts the right characters typed so far, the whole group once it is done', () => {
		let race = start(['ab', 'cd']);
		expect(typedCharCount(race.game)).toBe(0);
		race = act(race, char('a', 10), 10);
		race = act(race, char('x', 20), 20);
		expect(typedCharCount(race.game)).toBe(1);
		race = act(race, char('b', 30), 30);
		expect(typedCharCount(race.game)).toBe(2);
		race = act(race, { type: 'settle' }, 40);
		race = act(race, { type: 'advance' }, 50);
		race = act(race, char('c', 60), 60);
		expect(typedCharCount(race.game)).toBe(3);
	});
});
