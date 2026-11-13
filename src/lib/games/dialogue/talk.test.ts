import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { NormalizedKeystroke } from '../../keyboard/types';
import { createGame, reduce, type GameState } from '../shared/game-state';
import { viewOf, type GameView } from '../shared/game-view';
import { answerSoFar, hostFace, questionOf, reactionOf, type Reaction } from './talk';

const QUESTIONS = ['q1', 'q2', 'q3'];
const REACTIONS: readonly Reaction[] = [
	{ line: () => 'ha', face: 'laughing' },
	{ line: () => 'oh', face: 'delighted' }
];

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

function viewAfter(text: string, playCount = 0, groups = ['fj', 'dk', 'sl fj']): GameView {
	return viewOf(type(createGame(groups, 'retry'), text), false, [], playCount);
}

describe('questionOf and reactionOf', () => {
	it('ask the questions in order, one per group, and start over when they are used up', () => {
		let state = createGame(['a', 'b', 'c', 'd'], 'retry');
		const asked: (string | undefined)[] = [];
		for (const group of ['a', 'b', 'c', 'd']) {
			asked.push(questionOf(QUESTIONS, viewOf(state, false)));
			state = reduce(type(state, group), { type: 'advance' }).state;
		}

		expect(asked).toEqual(['q1', 'q2', 'q3', 'q1']);
	});

	it('go on with the next questions when the game is played again', () => {
		const firstPlay = viewAfter('', 0);
		const secondPlay = viewAfter('', 1);

		expect(questionOf(QUESTIONS, firstPlay)).toBe('q1');
		// Three groups were played the first time: the second play starts with the fourth question.
		expect(questionOf(QUESTIONS, secondPlay)).toBe('q1');
		expect(questionOf(['a', 'b', 'c', 'd', 'e'], secondPlay)).toBe('d');
	});

	it('give the reaction of the same rank as the question', () => {
		fc.assert(
			fc.property(fc.nat(20), fc.nat(2), (plays, done) => {
				const groups = ['fj', 'dk', 'sl'];
				let state = createGame(groups, 'retry');
				for (const group of groups.slice(0, done)) {
					state = reduce(type(state, group), { type: 'advance' }).state;
				}
				const view = viewOf(state, false, [], plays);
				expect(reactionOf(REACTIONS, view)).toBe(REACTIONS[view.rewardIndex % REACTIONS.length]);
			})
		);
	});
});

describe('hostFace', () => {
	it('asks while the answer is typed, even after a wrong key', () => {
		expect(hostFace(REACTIONS, viewAfter(''))).toBe('asking');
		expect(hostFace(REACTIONS, viewAfter('f'))).toBe('asking');
		expect(hostFace(REACTIONS, viewAfter('fx'))).toBe('asking');
	});

	it('takes the face of its reaction once the group is typed', () => {
		expect(hostFace(REACTIONS, viewAfter('fj'))).toBe('laughing');
		expect(hostFace(REACTIONS, viewAfter('fj', 1))).toBe('delighted');
	});

	it('is pleased when there is no reaction to give', () => {
		expect(hostFace([], viewAfter('fj'))).toBe('delighted');
	});
});

describe('answerSoFar', () => {
	it('is empty before the first good key', () => {
		expect(answerSoFar(viewAfter(''))).toBe('');
	});

	it('says the good keys only, never a wrong one', () => {
		expect(answerSoFar(viewAfter('f'))).toBe('f');
		expect(answerSoFar(viewAfter('fx'))).toBe('f');
	});

	it('says the right beginning of a group that arrives begun, never its mistakes', () => {
		const begun = createGame(['sl fj'], 'retry', { starts: [{ typed: 3, pending: ['d', 'k'] }] });
		expect(answerSoFar(viewOf(begun, false))).toBe('sl ');
		expect(answerSoFar(viewOf(type(begun, 'f'), false))).toBe('sl ');
	});

	it('says the whole group once it is typed, spaces included', () => {
		expect(answerSoFar(viewAfter('fj'))).toBe('fj');
		expect(answerSoFar(viewAfter('sl fj', 0, ['sl fj']))).toBe('sl fj');
	});
});
