import { describe, expect, it } from 'vitest';
import type { KeyCode, NormalizedKeystroke } from '../../keyboard/types';
import {
	completedCount,
	createGame,
	exerciseMetrics,
	exerciseOutcome,
	reduce,
	type GameAction,
	type GameState
} from './game-state';

let clock = 0;

function char(value: string, code: KeyCode | null = `Key${value.toUpperCase()}`): GameAction {
	clock += 100;
	const keystroke: NormalizedKeystroke = {
		kind: 'char',
		char: value,
		code,
		timestamp: clock,
		composed: false
	};
	return { type: 'keystroke', keystroke };
}

function key(kind: 'enter' | 'backspace'): GameAction {
	clock += 100;
	return {
		type: 'keystroke',
		keystroke: {
			kind,
			char: null,
			code: kind === 'enter' ? 'Enter' : 'Backspace',
			timestamp: clock,
			composed: false
		}
	};
}

function play(state: GameState, actions: readonly GameAction[]): GameState {
	return actions.reduce((current, action) => reduce(current, action).state, state);
}

function typeText(state: GameState, text: string): GameState {
	return play(
		state,
		[...text].map((value) => char(value))
	);
}

describe('createGame', () => {
	it('starts on the first group, calm, with nothing done', () => {
		const state = createGame(['fj', 'jf'], 'retry');

		expect(state).toMatchObject({
			groupIndex: 0,
			phase: 'typing',
			paused: false,
			errorIndex: null,
			wrongCode: null,
			mood: 'idle',
			hasFinale: false
		});
		expect(state.session.target).toEqual(['f', 'j']);
		expect(completedCount(state)).toBe(0);
	});

	it('refuses an exercise without group', () => {
		expect(() => createGame([], 'retry')).toThrow(RangeError);
	});
});

describe('a good key', () => {
	it('moves forward and plays the correct sound', () => {
		const step = reduce(createGame(['fj'], 'retry'), char('f'));

		expect(step.state.session.position).toBe(1);
		expect(step.sounds).toEqual(['correct']);
		expect(step.state.errorIndex).toBeNull();
	});
});

describe('a wrong key', () => {
	it('does not move forward, flags the character and the key, and the mood says oops', () => {
		const step = reduce(createGame(['fj'], 'retry'), char('d'));

		expect(step.state.session.position).toBe(0);
		expect(step.state.errorIndex).toBe(0);
		expect(step.state.wrongCode).toBe('KeyD');
		expect(step.state.mood).toBe('oops');
		expect(step.sounds).toEqual(['error']);
	});

	it('flags the character that is being typed, not the first one', () => {
		const state = typeText(createGame(['fjd'], 'retry'), 'fj');

		const step = reduce(state, char('k'));

		expect(step.state.errorIndex).toBe(2);
	});

	it('is forgotten with the next good key', () => {
		const wrong = reduce(createGame(['fj'], 'retry'), char('d')).state;

		const step = reduce(wrong, char('f'));

		expect(step.state.errorIndex).toBeNull();
		expect(step.state.wrongCode).toBeNull();
		expect(step.state.mood).toBe('idle');
		expect(step.state.session.position).toBe(1);
	});

	it('goes back to calm when the moment is over, and only then', () => {
		const wrong = reduce(createGame(['fj'], 'retry'), char('d')).state;

		expect(reduce(wrong, { type: 'calm' }).state.mood).toBe('idle');
		expect(reduce(wrong, { type: 'calm' }).state.errorIndex).toBe(0);
		const calm = createGame(['fj'], 'retry');
		expect(reduce(calm, { type: 'calm' }).state).toBe(calm);
	});

	it('is not counted as progress in the metrics of the group', () => {
		const state = typeText(play(createGame(['fj'], 'retry'), [char('d')]), 'fj');

		const metrics = exerciseMetrics(state);

		expect(metrics.totalKeystrokes).toBe(3);
		expect(metrics.correctKeystrokes).toBe(2);
	});

	it('never ends the game, however many mistakes are made', () => {
		const mistakes = Array.from({ length: 200 }, () => char('x'));

		const state = play(createGame(['fj'], 'retry'), mistakes);

		expect(state.phase).toBe('typing');
		expect(state.paused).toBe(false);
		expect(state.session.position).toBe(0);
		expect(typeText(state, 'fj').phase).toBe('celebrating');
	});
});

describe('keys that are not characters', () => {
	it('ignores Enter, a habit at the end of a word, instead of calling it a mistake', () => {
		const state = createGame(['fj'], 'retry');

		const step = reduce(state, key('enter'));

		expect(step.state).toBe(state);
		expect(step.sounds).toEqual([]);
	});

	it('ignores Backspace when a wrong key does not need erasing', () => {
		const state = createGame(['fj'], 'retry');

		expect(reduce(state, key('backspace')).state).toBe(state);
	});

	it('expects Backspace to erase when the policy asks for it', () => {
		let state = createGame(['fj'], 'backspace');
		state = play(state, [char('d')]);
		expect(state.errorIndex).toBe(0);

		state = play(state, [key('backspace'), char('f'), char('j')]);

		expect(state.phase).toBe('celebrating');
	});
});

describe('a group typed to the end', () => {
	it('starts the reward with the group sound', () => {
		const state = typeText(createGame(['fj', 'jf'], 'retry'), 'f');

		const step = reduce(state, char('j'));

		expect(step.state.phase).toBe('celebrating');
		expect(step.state.mood).toBe('happy');
		expect(step.sounds).toEqual(['groupDone']);
		expect(completedCount(step.state)).toBe(1);
		expect(step.state.finished).toHaveLength(1);
	});

	it('moves to the next group when the time of the reward is over', () => {
		const rewarded = typeText(createGame(['fj', 'jf'], 'retry'), 'fj');

		const step = reduce(rewarded, { type: 'advance' });

		expect(step.state).toMatchObject({ groupIndex: 1, phase: 'typing', mood: 'idle' });
		expect(step.state.session.target).toEqual(['j', 'f']);
		expect(step.state.session.position).toBe(0);
		expect(completedCount(step.state)).toBe(1);
	});

	it('moves to the next group at the next key, without counting that key', () => {
		const rewarded = typeText(createGame(['fj', 'jf'], 'retry'), 'fj');

		const step = reduce(rewarded, char('x'));

		expect(step.state.groupIndex).toBe(1);
		expect(step.state.session.position).toBe(0);
		expect(step.state.errorIndex).toBeNull();
		expect(step.state.session.records).toHaveLength(0);
		expect(step.sounds).toEqual([]);
	});

	it('does not move on by itself while paused', () => {
		const rewarded = typeText(createGame(['fj', 'jf'], 'retry'), 'fj');
		const paused = reduce(rewarded, { type: 'pause' }).state;

		expect(reduce(paused, { type: 'advance' }).state).toBe(paused);
	});

	it('does not move on when nothing is waiting for it', () => {
		const typing = createGame(['fj', 'jf'], 'retry');

		expect(reduce(typing, { type: 'advance' }).state).toBe(typing);
	});
});

describe('the last group', () => {
	it('plays the lesson sound and cheers', () => {
		const state = typeText(createGame(['fj'], 'retry'), 'f');

		const step = reduce(state, char('j'));

		expect(step.sounds).toEqual(['lessonDone']);
		expect(step.state.mood).toBe('cheer');
		expect(step.state.phase).toBe('celebrating');
	});

	it('completes after its reward, and reports the metrics of every group', () => {
		let state = typeText(createGame(['fj', 'jf'], 'retry'), 'fj');
		state = play(state, [{ type: 'advance' }]);
		state = typeText(state, 'jf');

		state = play(state, [{ type: 'advance' }]);

		expect(state.phase).toBe('complete');
		expect(completedCount(state)).toBe(2);
		const metrics = exerciseMetrics(state);
		expect(metrics.totalKeystrokes).toBe(4);
		expect(metrics.accuracy).toBe(100);
	});

	it('completes at the next key too', () => {
		const rewarded = typeText(createGame(['fj'], 'retry'), 'fj');

		expect(reduce(rewarded, char('x')).state.phase).toBe('complete');
	});

	it('ignores everything once complete', () => {
		const complete = play(typeText(createGame(['fj'], 'retry'), 'fj'), [{ type: 'advance' }]);

		expect(reduce(complete, char('f')).state).toBe(complete);
		expect(reduce(complete, { type: 'pause' }).state).toBe(complete);
		expect(reduce(complete, { type: 'finish' }).state).toBe(complete);
	});
});

describe('the outcome of an exercise', () => {
	function playGroups(groups: readonly string[], typed: readonly string[]): GameState {
		let state = createGame(groups, 'retry');
		for (const text of typed) {
			state = typeText(state, text);
			state = play(state, [{ type: 'advance' }]);
		}
		return state;
	}

	it('carries the metrics of the whole exercise', () => {
		const state = playGroups(['fjf', 'jf'], ['fjf', 'jf']);

		expect(exerciseOutcome(state).metrics).toEqual(exerciseMetrics(state));
	});

	it('gives the pace as one point at the end of each group, cumulated', () => {
		const state = playGroups(['fjf', 'jf'], ['fjf', 'jf']);

		expect(exerciseOutcome(state).pace).toEqual([
			{ correctChars: 3, activeMs: 200 },
			{ correctChars: 5, activeMs: 300 }
		]);
	});

	it('ends the pace on the correct keystrokes and the time of the metrics', () => {
		const { metrics, pace } = exerciseOutcome(playGroups(['fj', 'jfj', 'f'], ['fxj', 'jfj', 'f']));

		expect(pace).toHaveLength(3);
		expect(pace[pace.length - 1]).toEqual({
			correctChars: metrics.correctKeystrokes,
			activeMs: metrics.elapsedMs
		});
	});

	it('counts a mistake as time spent, not as a character', () => {
		const state = playGroups(['fj'], ['fxj']);

		expect(exerciseOutcome(state).pace).toEqual([{ correctChars: 2, activeMs: 200 }]);
	});

	it('leaves the time between two groups out of the pace', () => {
		let state = typeText(createGame(['fj', 'jf'], 'retry'), 'fj');
		clock += 60_000;
		state = play(state, [{ type: 'advance' }]);
		clock += 60_000;
		state = play(typeText(state, 'jf'), [{ type: 'advance' }]);

		expect(exerciseOutcome(state).pace).toEqual([
			{ correctChars: 2, activeMs: 100 },
			{ correctChars: 4, activeMs: 200 }
		]);
	});

	it('gives no time to a group of a single character', () => {
		const state = playGroups(['f', 'jf'], ['f', 'jf']);

		expect(exerciseOutcome(state).pace).toEqual([
			{ correctChars: 1, activeMs: 0 },
			{ correctChars: 3, activeMs: 100 }
		]);
	});
});

describe('a game with a final picture', () => {
	const withFinale = () => createGame(['fj'], 'retry', { finale: true });

	it('shows the final picture after the last reward instead of completing', () => {
		const rewarded = typeText(withFinale(), 'fj');

		const state = play(rewarded, [{ type: 'advance' }]);

		expect(state.phase).toBe('finale');
		expect(state.mood).toBe('cheer');
	});

	it('shows it at the next key too', () => {
		const rewarded = typeText(withFinale(), 'fj');

		expect(reduce(rewarded, char('x')).state.phase).toBe('finale');
	});

	it('waits for the child: keys and time do not end it', () => {
		const state = play(typeText(withFinale(), 'fj'), [{ type: 'advance' }]);

		expect(reduce(state, char('x')).state).toBe(state);
		expect(reduce(state, key('enter')).state).toBe(state);
		expect(reduce(state, { type: 'advance' }).state).toBe(state);
		expect(reduce(state, { type: 'pause' }).state).toBe(state);
	});

	it('completes when the child goes on', () => {
		const state = play(typeText(withFinale(), 'fj'), [{ type: 'advance' }]);

		const step = reduce(state, { type: 'finish' });

		expect(step.state.phase).toBe('complete');
		expect(exerciseMetrics(step.state).totalKeystrokes).toBe(2);
	});

	it('cannot be skipped before the last reward', () => {
		const typing = withFinale();

		expect(reduce(typing, { type: 'finish' }).state).toBe(typing);
	});
});

describe('pause', () => {
	it('ignores the keys until the child resumes', () => {
		let state = reduce(createGame(['fj'], 'retry'), { type: 'pause' }).state;
		expect(state.paused).toBe(true);

		state = play(state, [char('f')]);
		expect(state.session.position).toBe(0);

		state = play(state, [{ type: 'resume' }, char('f')]);
		expect(state.paused).toBe(false);
		expect(state.session.position).toBe(1);
	});

	it('loses nothing: the position and the mistake are kept', () => {
		let state = typeText(createGame(['fjd'], 'retry'), 'f');
		state = play(state, [char('x')]);

		const paused = play(state, [{ type: 'pause' }, { type: 'resume' }]);

		expect(paused.session.position).toBe(1);
		expect(paused.errorIndex).toBe(1);
	});

	it('is idempotent', () => {
		const paused = reduce(createGame(['fj'], 'retry'), { type: 'pause' }).state;

		expect(reduce(paused, { type: 'pause' }).state).toBe(paused);
		const running = createGame(['fj'], 'retry');
		expect(reduce(running, { type: 'resume' }).state).toBe(running);
	});
});

describe('determinism', () => {
	it('gives the same state for the same keys', () => {
		const actions = [char('f'), char('x'), char('j'), { type: 'advance' } as const];

		const first = play(createGame(['fj', 'jf'], 'retry'), actions);
		const second = play(createGame(['fj', 'jf'], 'retry'), actions);

		expect(second).toEqual(first);
	});
});
