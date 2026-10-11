import { describe, expect, it } from 'vitest';
import type { KeyCode, NormalizedKeystroke } from '../../keyboard/types';
import {
	createHatching,
	crackStage,
	exerciseMetrics,
	hatchedCount,
	reduce,
	type HatchingAction,
	type HatchingState
} from './state';

let clock = 0;

function char(value: string, code: KeyCode | null = `Key${value.toUpperCase()}`): HatchingAction {
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

function key(kind: 'enter' | 'backspace'): HatchingAction {
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

function play(state: HatchingState, actions: readonly HatchingAction[]): HatchingState {
	return actions.reduce((current, action) => reduce(current, action).state, state);
}

function typeText(state: HatchingState, text: string): HatchingState {
	return play(
		state,
		[...text].map((value) => char(value))
	);
}

describe('crackStage', () => {
	it('shows no crack before the first good key', () => {
		expect(crackStage(0, 4, 4)).toBe(0);
	});

	it('shows more cracks as the group advances', () => {
		const stages = [1, 2, 3].map((position) => crackStage(position, 4, 4));

		expect(stages).toEqual([1, 2, 3]);
	});

	it('shows a crack after the first good key, even in a short group', () => {
		expect(crackStage(1, 2, 4)).toBeGreaterThan(0);
	});

	it('never exceeds the number of cracks, and never goes down', () => {
		for (const length of [2, 3, 5, 9]) {
			let previous = 0;
			for (let position = 0; position <= length; position++) {
				const stage = crackStage(position, length, 4);
				expect(stage).toBeLessThanOrEqual(4);
				expect(stage).toBeGreaterThanOrEqual(previous);
				previous = stage;
			}
		}
	});

	it('handles an empty group', () => {
		expect(crackStage(0, 0, 4)).toBe(0);
	});
});

describe('createHatching', () => {
	it('starts on the first egg, calm, with nothing hatched', () => {
		const state = createHatching(['fj', 'jf'], 'retry');

		expect(state).toMatchObject({
			groupIndex: 0,
			phase: 'typing',
			paused: false,
			errorIndex: null,
			wrongCode: null,
			mood: 'idle'
		});
		expect(state.session.target).toEqual(['f', 'j']);
		expect(hatchedCount(state)).toBe(0);
	});

	it('refuses an exercise without group', () => {
		expect(() => createHatching([], 'retry')).toThrow(RangeError);
	});
});

describe('a good key', () => {
	it('moves forward and plays the correct sound', () => {
		const step = reduce(createHatching(['fj'], 'retry'), char('f'));

		expect(step.state.session.position).toBe(1);
		expect(step.sounds).toEqual(['correct']);
		expect(step.state.errorIndex).toBeNull();
	});
});

describe('a wrong key', () => {
	it('does not move forward, flags the character and the key, and the companion says oops', () => {
		const step = reduce(createHatching(['fj'], 'retry'), char('d'));

		expect(step.state.session.position).toBe(0);
		expect(step.state.errorIndex).toBe(0);
		expect(step.state.wrongCode).toBe('KeyD');
		expect(step.state.mood).toBe('oops');
		expect(step.sounds).toEqual(['error']);
	});

	it('flags the character that is being typed, not the first one', () => {
		const state = typeText(createHatching(['fjd'], 'retry'), 'fj');

		const step = reduce(state, char('k'));

		expect(step.state.errorIndex).toBe(2);
	});

	it('is forgotten with the next good key', () => {
		const wrong = reduce(createHatching(['fj'], 'retry'), char('d')).state;

		const step = reduce(wrong, char('f'));

		expect(step.state.errorIndex).toBeNull();
		expect(step.state.wrongCode).toBeNull();
		expect(step.state.mood).toBe('idle');
		expect(step.state.session.position).toBe(1);
	});

	it('goes back to calm when the moment is over, and only then', () => {
		const wrong = reduce(createHatching(['fj'], 'retry'), char('d')).state;

		expect(reduce(wrong, { type: 'calm' }).state.mood).toBe('idle');
		expect(reduce(wrong, { type: 'calm' }).state.errorIndex).toBe(0);
		const calm = createHatching(['fj'], 'retry');
		expect(reduce(calm, { type: 'calm' }).state).toBe(calm);
	});

	it('is not counted as progress in the metrics of the group', () => {
		const state = typeText(play(createHatching(['fj'], 'retry'), [char('d')]), 'fj');

		const metrics = exerciseMetrics(state);

		expect(metrics.totalKeystrokes).toBe(3);
		expect(metrics.correctKeystrokes).toBe(2);
	});
});

describe('keys that are not characters', () => {
	it('ignores Enter, a habit at the end of a word, instead of calling it a mistake', () => {
		const state = createHatching(['fj'], 'retry');

		const step = reduce(state, key('enter'));

		expect(step.state).toBe(state);
		expect(step.sounds).toEqual([]);
	});

	it('ignores Backspace when a wrong key does not need erasing', () => {
		const state = createHatching(['fj'], 'retry');

		expect(reduce(state, key('backspace')).state).toBe(state);
	});

	it('expects Backspace to erase when the policy asks for it', () => {
		let state = createHatching(['fj'], 'backspace');
		state = play(state, [char('d')]);
		expect(state.errorIndex).toBe(0);

		state = play(state, [key('backspace'), char('f'), char('j')]);

		expect(state.phase).toBe('hatched');
	});
});

describe('a group typed to the end', () => {
	it('hatches the egg with the group sound', () => {
		const state = typeText(createHatching(['fj', 'jf'], 'retry'), 'f');

		const step = reduce(state, char('j'));

		expect(step.state.phase).toBe('hatched');
		expect(step.state.mood).toBe('happy');
		expect(step.sounds).toEqual(['groupDone']);
		expect(hatchedCount(step.state)).toBe(1);
		expect(step.state.finished).toHaveLength(1);
	});

	it('moves to the next egg when the time of the baby dino is over', () => {
		const hatched = typeText(createHatching(['fj', 'jf'], 'retry'), 'fj');

		const step = reduce(hatched, { type: 'advance' });

		expect(step.state).toMatchObject({ groupIndex: 1, phase: 'typing', mood: 'idle' });
		expect(step.state.session.target).toEqual(['j', 'f']);
		expect(step.state.session.position).toBe(0);
		expect(hatchedCount(step.state)).toBe(1);
	});

	it('moves to the next egg at the next key, without counting that key', () => {
		const hatched = typeText(createHatching(['fj', 'jf'], 'retry'), 'fj');

		const step = reduce(hatched, char('x'));

		expect(step.state.groupIndex).toBe(1);
		expect(step.state.session.position).toBe(0);
		expect(step.state.errorIndex).toBeNull();
		expect(step.state.session.records).toHaveLength(0);
		expect(step.sounds).toEqual([]);
	});

	it('does not move on by itself while paused', () => {
		const hatched = typeText(createHatching(['fj', 'jf'], 'retry'), 'fj');
		const paused = reduce(hatched, { type: 'pause' }).state;

		expect(reduce(paused, { type: 'advance' }).state).toBe(paused);
	});
});

describe('the last egg', () => {
	it('plays the lesson sound and cheers', () => {
		const state = typeText(createHatching(['fj'], 'retry'), 'f');

		const step = reduce(state, char('j'));

		expect(step.sounds).toEqual(['lessonDone']);
		expect(step.state.mood).toBe('cheer');
		expect(step.state.phase).toBe('hatched');
	});

	it('completes after its baby dino, and reports the metrics of every group', () => {
		let state = typeText(createHatching(['fj', 'jf'], 'retry'), 'fj');
		state = play(state, [{ type: 'advance' }]);
		state = typeText(state, 'jf');

		state = play(state, [{ type: 'advance' }]);

		expect(state.phase).toBe('complete');
		expect(hatchedCount(state)).toBe(2);
		const metrics = exerciseMetrics(state);
		expect(metrics.totalKeystrokes).toBe(4);
		expect(metrics.accuracy).toBe(100);
	});

	it('completes at the next key too', () => {
		const hatched = typeText(createHatching(['fj'], 'retry'), 'fj');

		expect(reduce(hatched, char('x')).state.phase).toBe('complete');
	});

	it('ignores everything once complete', () => {
		const complete = play(typeText(createHatching(['fj'], 'retry'), 'fj'), [{ type: 'advance' }]);

		expect(reduce(complete, char('f')).state).toBe(complete);
		expect(reduce(complete, { type: 'pause' }).state).toBe(complete);
	});
});

describe('pause', () => {
	it('ignores the keys until the child resumes', () => {
		let state = reduce(createHatching(['fj'], 'retry'), { type: 'pause' }).state;
		expect(state.paused).toBe(true);

		state = play(state, [char('f')]);
		expect(state.session.position).toBe(0);

		state = play(state, [{ type: 'resume' }, char('f')]);
		expect(state.paused).toBe(false);
		expect(state.session.position).toBe(1);
	});

	it('loses nothing: the position and the mistake are kept', () => {
		let state = typeText(createHatching(['fjd'], 'retry'), 'f');
		state = play(state, [char('x')]);

		const paused = play(state, [{ type: 'pause' }, { type: 'resume' }]);

		expect(paused.session.position).toBe(1);
		expect(paused.errorIndex).toBe(1);
	});

	it('is idempotent', () => {
		const paused = reduce(createHatching(['fj'], 'retry'), { type: 'pause' }).state;

		expect(reduce(paused, { type: 'pause' }).state).toBe(paused);
		const running = createHatching(['fj'], 'retry');
		expect(reduce(running, { type: 'resume' }).state).toBe(running);
	});
});
