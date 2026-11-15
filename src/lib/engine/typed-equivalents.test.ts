import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { NormalizedKeystroke } from '../keyboard/types';
import { applyKeystroke, createSession } from './session';
import { TYPED_EQUIVALENTS, countsAs } from './typed-equivalents';
import type { ErrorPolicy } from './types';

const SPACE = ' ';
const NO_BREAK_SPACE = '\u00A0';
const NARROW_NO_BREAK_SPACE = '\u202F';
const POLICIES: readonly ErrorPolicy[] = ['retry', 'backspace'];

function char(value: string): NormalizedKeystroke {
	return { kind: 'char', char: value, code: null, timestamp: 1, composed: false };
}

describe('countsAs', () => {
	it('takes a character for itself', () => {
		expect(countsAs('a', 'a')).toBe(true);
		expect(countsAs(SPACE, SPACE)).toBe(true);
		expect(countsAs(NO_BREAK_SPACE, NO_BREAK_SPACE)).toBe(true);
	});

	// Option + Space on a Mac writes a no-break space: nothing on screen tells it from a space.
	it.each([
		['a no-break space', NO_BREAK_SPACE],
		['a narrow no-break space', NARROW_NO_BREAK_SPACE]
	])('takes %s for the space that is expected', (_name, typed) => {
		expect(countsAs(typed, SPACE)).toBe(true);
	});

	it('never takes a space for a no-break space that is expected', () => {
		expect(countsAs(SPACE, NO_BREAK_SPACE)).toBe(false);
		expect(countsAs(SPACE, NARROW_NO_BREAK_SPACE)).toBe(false);
		expect(countsAs(NO_BREAK_SPACE, NARROW_NO_BREAK_SPACE)).toBe(false);
	});

	it('takes no other look-alike: apostrophes, dashes, accents and tabs stay strict', () => {
		expect(countsAs('’', "'")).toBe(false);
		expect(countsAs('–', '-')).toBe(false);
		expect(countsAs('e', 'é')).toBe(false);
		expect(countsAs('\t', SPACE)).toBe(false);
	});

	it('only knows the space and its two no-break forms', () => {
		expect([...TYPED_EQUIVALENTS.keys()]).toEqual([SPACE]);
		expect([...(TYPED_EQUIVALENTS.get(SPACE) ?? [])]).toEqual([
			NO_BREAK_SPACE,
			NARROW_NO_BREAK_SPACE
		]);
	});

	it('is the identity but for a no-break space typed where a space is expected', () => {
		const anyChar = fc.oneof(
			fc.string({ unit: 'grapheme', minLength: 1, maxLength: 1 }),
			fc.constantFrom(SPACE, NO_BREAK_SPACE, NARROW_NO_BREAK_SPACE, '\t', 'a')
		);
		fc.assert(
			fc.property(anyChar, anyChar, (typed, expected) => {
				const equivalent =
					expected === SPACE && (typed === NO_BREAK_SPACE || typed === NARROW_NO_BREAK_SPACE);
				expect(countsAs(typed, expected)).toBe(typed === expected || equivalent);
			})
		);
	});

	it('never works the other way round', () => {
		for (const [expected, others] of TYPED_EQUIVALENTS) {
			for (const typed of others) {
				expect(countsAs(typed, expected)).toBe(true);
				expect(countsAs(expected, typed)).toBe(false);
			}
		}
	});
});

describe('a no-break space in a session', () => {
	it.each(POLICIES)('is a good key where a space is expected (%s)', (errorPolicy) => {
		const step = applyKeystroke(createSession('a b', { errorPolicy }), char('a'));

		const typed = applyKeystroke(step.state, char(NO_BREAK_SPACE));

		expect(typed.events).toEqual([{ type: 'correct', index: 1, char: SPACE }]);
		expect(typed.state.position).toBe(2);
		expect(typed.state.records[1]).toMatchObject({
			expected: SPACE,
			typed: NO_BREAK_SPACE,
			correct: true
		});
	});

	it.each(POLICIES)('is a mistake where a letter is expected (%s)', (errorPolicy) => {
		const step = applyKeystroke(createSession('ab', { errorPolicy }), char(NO_BREAK_SPACE));

		expect(step.events[0]?.type).toBe('error');
	});
});
