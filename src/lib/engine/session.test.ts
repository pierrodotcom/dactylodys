import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { KeystrokeKind, NormalizedKeystroke } from '../keyboard/types';
import { toGraphemes } from './graphemes';
import { computeMetrics } from './metrics';
import { applyKeystroke, createSession, isComplete } from './session';
import type { ErrorPolicy, SessionEvent, SessionState } from './types';

const POLICIES: readonly ErrorPolicy[] = ['retry', 'backspace'];

function char(value: string, timestamp: number): NormalizedKeystroke {
	return { kind: 'char', char: value, code: null, timestamp, composed: false };
}

function enter(timestamp: number): NormalizedKeystroke {
	return { kind: 'enter', char: null, code: 'Enter', timestamp, composed: false };
}

function backspace(timestamp: number): NormalizedKeystroke {
	return { kind: 'backspace', char: null, code: 'Backspace', timestamp, composed: false };
}

function keystrokeFor(grapheme: string, timestamp: number): NormalizedKeystroke {
	return grapheme === '\n' ? enter(timestamp) : char(grapheme, timestamp);
}

function run(initial: SessionState, keystrokes: readonly NormalizedKeystroke[]) {
	let state = initial;
	const events: SessionEvent[] = [];
	for (const keystroke of keystrokes) {
		const step = applyKeystroke(state, keystroke);
		state = step.state;
		events.push(...step.events);
	}
	return { state, events };
}

function deepFreeze<T>(value: T): T {
	if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
		Object.freeze(value);
		for (const child of Object.values(value)) {
			deepFreeze(child);
		}
	}
	return value;
}

describe('createSession', () => {
	it('starts with an empty progress and the retry policy by default', () => {
		const state = createSession('abc');
		expect(state).toEqual({
			target: ['a', 'b', 'c'],
			position: 0,
			pending: [],
			startedAt: null,
			endedAt: null,
			records: [],
			options: { errorPolicy: 'retry' }
		});
	});

	it('uses the requested error policy', () => {
		expect(createSession('a', { errorPolicy: 'backspace' }).options.errorPolicy).toBe('backspace');
		expect(createSession('a', {}).options.errorPolicy).toBe('retry');
		expect(createSession('a', { errorPolicy: undefined }).options.errorPolicy).toBe('retry');
	});

	it('throws a RangeError on an empty text', () => {
		expect(() => createSession('')).toThrow(RangeError);
	});

	it('splits the text into NFC graphemes with normalized line breaks', () => {
		const state = createSession('é\r\n\u{1F44D}\u{1F3FD}');
		expect(state.target).toEqual(['é', '\n', '\u{1F44D}\u{1F3FD}']);
	});

	it('is not complete before any keystroke', () => {
		expect(isComplete(createSession('a'))).toBe(false);
	});
});

describe.each(POLICIES)('applyKeystroke with the %s policy', (errorPolicy) => {
	const start = (text: string) => createSession(text, { errorPolicy });

	it('advances and emits correct on the expected character', () => {
		const step = applyKeystroke(start('ab'), char('a', 100));
		expect(step.state.position).toBe(1);
		expect(step.events).toEqual([{ type: 'correct', index: 0, char: 'a' }]);
	});

	it('sets startedAt to the timestamp of the first keystroke only', () => {
		const first = applyKeystroke(start('abc'), char('a', 100));
		const second = applyKeystroke(first.state, char('b', 250));
		expect(first.state.startedAt).toBe(100);
		expect(second.state.startedAt).toBe(100);
	});

	it('records every keystroke with its expected grapheme and index', () => {
		const { state } = run(start('ab'), [char('x', 10), char('a', 20), char('b', 30)]);
		expect(state.records).toEqual([
			{
				targetIndex: 0,
				expected: 'a',
				typed: 'x',
				kind: 'char',
				correct: false,
				code: null,
				timestamp: 10
			},
			...(errorPolicy === 'retry'
				? [
						{
							targetIndex: 0,
							expected: 'a',
							typed: 'a',
							kind: 'char',
							correct: true,
							code: null,
							timestamp: 20
						},
						{
							targetIndex: 1,
							expected: 'b',
							typed: 'b',
							kind: 'char',
							correct: true,
							code: null,
							timestamp: 30
						}
					]
				: [
						{
							targetIndex: 0,
							expected: 'a',
							typed: 'a',
							kind: 'char',
							correct: false,
							code: null,
							timestamp: 20
						},
						{
							targetIndex: 0,
							expected: 'a',
							typed: 'b',
							kind: 'char',
							correct: false,
							code: null,
							timestamp: 30
						}
					])
		]);
	});

	it('keeps the physical key code in the record', () => {
		const keystroke: NormalizedKeystroke = { ...char('a', 5), code: 'KeyQ' };
		expect(applyKeystroke(start('a'), keystroke).state.records[0]?.code).toBe('KeyQ');
	});

	it('emits completed after correct and sets endedAt on the last grapheme', () => {
		const step = applyKeystroke(run(start('ab'), [char('a', 100)]).state, char('b', 400));
		expect(step.events).toEqual([
			{ type: 'correct', index: 1, char: 'b' },
			{ type: 'completed', endedAt: 400 }
		]);
		expect(step.state.endedAt).toBe(400);
		expect(step.state.position).toBe(2);
		expect(isComplete(step.state)).toBe(true);
	});

	it('returns the same state and no event once the session is complete', () => {
		const done = run(start('a'), [char('a', 1)]).state;
		for (const keystroke of [char('a', 2), char('z', 3), enter(4), backspace(5)]) {
			const step = applyKeystroke(done, keystroke);
			expect(step.state).toBe(done);
			expect(step.events).toEqual([]);
		}
	});

	it('treats Enter as a line feed', () => {
		const state = run(start('a\nb'), [char('a', 1)]).state;
		const step = applyKeystroke(state, enter(2));
		expect(step.events).toEqual([{ type: 'correct', index: 1, char: '\n' }]);
		expect(step.state.records.at(-1)).toMatchObject({ kind: 'enter', typed: '\n', correct: true });
	});

	it('reports an error when Enter is pressed but another character is expected', () => {
		const step = applyKeystroke(start('ab'), enter(1));
		expect(step.events).toEqual([{ type: 'error', index: 0, expected: 'a', typed: '\n' }]);
		expect(step.state.position).toBe(0);
	});

	it('reports an error when a character is typed but a line break is expected', () => {
		const step = applyKeystroke(start('\n'), char('a', 1));
		expect(step.events).toEqual([{ type: 'error', index: 0, expected: '\n', typed: 'a' }]);
	});

	it('accepts a line feed character as the line break', () => {
		const step = applyKeystroke(start('\n'), char('\n', 1));
		expect(step.events[0]).toEqual({ type: 'correct', index: 0, char: '\n' });
	});

	it('normalizes the typed character to NFC before comparing', () => {
		const step = applyKeystroke(start('é'), char('é', 1));
		expect(step.events[0]).toEqual({ type: 'correct', index: 0, char: 'é' });
	});

	it('matches a decomposed target typed in its composed form', () => {
		const step = applyKeystroke(start('é'), char('é', 1));
		expect(step.events[0]?.type).toBe('correct');
	});

	it('compares accented characters strictly', () => {
		const step = applyKeystroke(start('é'), char('e', 1));
		expect(step.events[0]?.type).toBe('error');
	});

	it('does not treat a non-breaking space as a plain space', () => {
		expect(applyKeystroke(start(' '), char('\u00A0', 1)).events[0]?.type).toBe('error');
		expect(applyKeystroke(start('\u00A0'), char(' ', 1)).events[0]?.type).toBe('error');
	});

	it('does not treat a typographic apostrophe as a straight one', () => {
		expect(applyKeystroke(start("'"), char('’', 1)).events[0]?.type).toBe('error');
		expect(applyKeystroke(start('’'), char("'", 1)).events[0]?.type).toBe('error');
	});

	it('expects an emoji with a modifier as a single keystroke', () => {
		const emoji = '\u{1F44D}\u{1F3FD}';
		const step = applyKeystroke(start(`${emoji}a`), char(emoji, 1));
		expect(step.state.position).toBe(1);
		expect(step.events[0]).toEqual({ type: 'correct', index: 0, char: emoji });
	});

	it('expects a combining sequence without precomposed form as a single keystroke', () => {
		const sequence = 'x́';
		const { state, events } = run(start(sequence), [char(sequence, 1)]);
		expect(events.map((event) => event.type)).toEqual(['correct', 'completed']);
		expect(isComplete(state)).toBe(true);
	});

	it('expects an NFD input text as its composed form', () => {
		const { state } = run(start('café'), [char('c', 1), char('a', 2), char('f', 3), char('é', 4)]);
		expect(isComplete(state)).toBe(true);
	});

	it('handles a text made of accents and line breaks end to end', () => {
		const text = 'Été\nà la mer';
		const keystrokes = toGraphemes(text).map((grapheme, i) => keystrokeFor(grapheme, i * 100));
		const { state, events } = run(start(text), keystrokes);
		expect(isComplete(state)).toBe(true);
		expect(events.filter((event) => event.type === 'correct')).toHaveLength(state.target.length);
		expect(events.at(-1)).toEqual({ type: 'completed', endedAt: (state.target.length - 1) * 100 });
	});

	it('ignores a keystroke without a character', () => {
		const initial = start('a');
		const step = applyKeystroke(initial, { ...char('a', 1), char: null });
		expect(step.state).toBe(initial);
		expect(step.events).toEqual([]);
	});

	it('ignores an empty character', () => {
		const initial = start('a');
		const step = applyKeystroke(initial, char('', 1));
		expect(step.state).toBe(initial);
		expect(step.events).toEqual([]);
	});

	it('does not mutate the state it receives', () => {
		const initial = deepFreeze(start('ab'));
		expect(() => applyKeystroke(initial, char('x', 1))).not.toThrow();
		expect(() => applyKeystroke(initial, char('a', 1))).not.toThrow();
		expect(() => applyKeystroke(initial, backspace(1))).not.toThrow();
		expect(initial.position).toBe(0);
		expect(initial.records).toEqual([]);
	});
});

describe('applyKeystroke with the retry policy', () => {
	const start = (text: string) => createSession(text, { errorPolicy: 'retry' });

	it('emits an error and keeps the position on a wrong character', () => {
		const step = applyKeystroke(start('ab'), char('x', 10));
		expect(step.events).toEqual([{ type: 'error', index: 0, expected: 'a', typed: 'x' }]);
		expect(step.state.position).toBe(0);
		expect(step.state.pending).toEqual([]);
		expect(step.state.startedAt).toBe(10);
	});

	it('accepts the right character after an error', () => {
		const { state } = run(start('ab'), [char('x', 1), char('a', 2)]);
		expect(state.position).toBe(1);
	});

	it('ignores Backspace without event, record or start', () => {
		const initial = start('ab');
		const step = applyKeystroke(initial, backspace(10));
		expect(step.state).toBe(initial);
		expect(step.events).toEqual([]);
		expect(step.state.startedAt).toBeNull();
	});

	it('ignores Backspace after an error', () => {
		const afterError = run(start('ab'), [char('x', 1)]).state;
		const step = applyKeystroke(afterError, backspace(2));
		expect(step.state).toBe(afterError);
		expect(step.events).toEqual([]);
	});

	it('marks the record of a wrong character as incorrect with the expected grapheme', () => {
		const { state } = run(start('ab'), [char('a', 1), char('x', 2)]);
		expect(state.records[1]).toMatchObject({
			targetIndex: 1,
			expected: 'b',
			typed: 'x',
			correct: false
		});
	});

	it('does not complete when the last grapheme is wrong', () => {
		const { state, events } = run(start('a'), [char('x', 1)]);
		expect(isComplete(state)).toBe(false);
		expect(events.map((event) => event.type)).toEqual(['error']);
	});
});

describe('applyKeystroke with the backspace policy', () => {
	const start = (text: string) => createSession(text, { errorPolicy: 'backspace' });

	it('inserts a wrong character in pending and keeps the position', () => {
		const step = applyKeystroke(start('ab'), char('x', 10));
		expect(step.events).toEqual([{ type: 'error', index: 0, expected: 'a', typed: 'x' }]);
		expect(step.state.position).toBe(0);
		expect(step.state.pending).toEqual(['x']);
	});

	it('treats the right character as an error while errors are pending', () => {
		const { state, events } = run(start('ab'), [char('x', 1), char('a', 2)]);
		expect(state.position).toBe(0);
		expect(state.pending).toEqual(['x', 'a']);
		expect(events[1]).toEqual({ type: 'error', index: 1, expected: 'a', typed: 'a' });
	});

	it('erases the last pending character with an erased event', () => {
		const typed = run(start('abc'), [char('x', 1), char('y', 2), char('z', 3)]).state;
		const step = applyKeystroke(typed, backspace(4));
		expect(step.state.pending).toEqual(['x', 'y']);
		expect(step.events).toEqual([{ type: 'erased', index: 2 }]);
		const next = applyKeystroke(step.state, backspace(5));
		expect(next.events).toEqual([{ type: 'erased', index: 1 }]);
		const last = applyKeystroke(next.state, backspace(6));
		expect(last.events).toEqual([{ type: 'erased', index: 0 }]);
		expect(last.state.pending).toEqual([]);
	});

	it('offsets error and erased indexes by the position', () => {
		const advanced = run(start('abc'), [char('a', 1), char('x', 2)]).state;
		expect(advanced.pending).toEqual(['x']);
		const step = applyKeystroke(advanced, backspace(3));
		expect(step.events).toEqual([{ type: 'erased', index: 1 }]);
	});

	it('records an erase with a null typed value and the Backspace kind', () => {
		const { state } = run(start('ab'), [char('x', 1), backspace(2)]);
		expect(state.records[1]).toEqual({
			targetIndex: 0,
			expected: 'a',
			typed: null,
			kind: 'backspace',
			correct: false,
			code: 'Backspace',
			timestamp: 2
		});
	});

	it('accepts the right character once every error is erased', () => {
		const { state, events } = run(start('ab'), [char('x', 1), backspace(2), char('a', 3)]);
		expect(state.position).toBe(1);
		expect(events.map((event) => event.type)).toEqual(['error', 'erased', 'correct']);
	});

	it('ignores Backspace when nothing is pending and never erases a correct character', () => {
		const advanced = run(start('ab'), [char('a', 1)]).state;
		const step = applyKeystroke(advanced, backspace(2));
		expect(step.state).toBe(advanced);
		expect(step.events).toEqual([]);
		expect(step.state.position).toBe(1);
		expect(step.state.records).toHaveLength(1);
	});

	it('does not start the session on an ignored Backspace', () => {
		const step = applyKeystroke(start('a'), backspace(5));
		expect(step.state.startedAt).toBeNull();
	});

	it('completes only after errors are erased and the last grapheme is typed', () => {
		const { state, events } = run(start('a'), [char('x', 1), backspace(2), char('a', 3)]);
		expect(isComplete(state)).toBe(true);
		expect(state.endedAt).toBe(3);
		expect(events.at(-1)).toEqual({ type: 'completed', endedAt: 3 });
	});

	it('does not mutate pending in the state it receives', () => {
		const withError = deepFreeze(run(start('ab'), [char('x', 1)]).state);
		expect(() => applyKeystroke(withError, backspace(2))).not.toThrow();
		expect(() => applyKeystroke(withError, char('y', 2))).not.toThrow();
		expect(withError.pending).toEqual(['x']);
	});
});

describe('a session that starts with a mistake already written', () => {
	const begun = (errorPolicy?: ErrorPolicy) =>
		createSession('bonjour', { errorPolicy, start: { typed: 3, pending: ['k', 'p'] } });

	it('starts after the right graphemes, with the wrong ones to erase and nothing recorded', () => {
		expect(begun()).toEqual({
			target: ['b', 'o', 'n', 'j', 'o', 'u', 'r'],
			position: 3,
			pending: ['k', 'p'],
			startedAt: null,
			endedAt: null,
			records: [],
			options: { errorPolicy: 'backspace' }
		});
	});

	it('asks for Backspace whatever the error policy given', () => {
		for (const errorPolicy of [undefined, ...POLICIES]) {
			expect(begun(errorPolicy).options.errorPolicy).toBe('backspace');
		}
	});

	it('takes no right key before the mistakes are erased, and counts it as a mistake of the child', () => {
		const { state, events } = run(begun('retry'), [char('j', 10)]);
		expect(state.position).toBe(3);
		expect(state.pending).toEqual(['k', 'p', 'j']);
		expect(events).toEqual([{ type: 'error', index: 5, expected: 'j', typed: 'j' }]);
	});

	it('ends without any mistake once the wrong characters are erased and the rest is typed', () => {
		const keys = [backspace(10), backspace(20), char('j', 30), char('o', 40)];
		const { state, events } = run(begun(), [...keys, char('u', 50), char('r', 60)]);
		expect(isComplete(state)).toBe(true);
		expect(events.slice(0, 3)).toEqual([
			{ type: 'erased', index: 4 },
			{ type: 'erased', index: 3 },
			{ type: 'correct', index: 3, char: 'j' }
		]);
		const metrics = computeMetrics(state);
		expect(metrics).toMatchObject({ accuracy: 100, errorCount: 0, totalKeystrokes: 4 });
		expect(Object.keys(metrics.perChar)).toEqual(['j', 'o', 'u', 'r']);
	});

	it('counts the planted mistakes in no accuracy and in the results of no key', () => {
		const keys = [backspace(10), char('x', 20), backspace(30), backspace(40)];
		const { state } = run(begun(), [...keys, char('j', 50), char('o', 60)]);
		const metrics = computeMetrics(state, 70);
		expect(metrics.errorCount).toBe(1);
		expect(metrics.perChar).toEqual({
			j: { attempts: 2, errors: 1, meanLatencyMs: 10 },
			o: { attempts: 1, errors: 0, meanLatencyMs: 10 }
		});
	});

	it('starts its clock at the first key and measures the first right key from the last Backspace', () => {
		const { state } = run(begun(), [backspace(1000), backspace(1400), char('j', 2000)]);
		expect(state.startedAt).toBe(1000);
		expect(computeMetrics(state).perChar['j']?.meanLatencyMs).toBe(600);
	});

	it('can start at the very beginning of the group', () => {
		const state = createSession('ab', { start: { typed: 0, pending: ['q'] } });
		expect(state.position).toBe(0);
		expect(run(state, [backspace(1), char('a', 2), char('b', 3)]).state.endedAt).toBe(3);
	});

	it('normalizes the wrong characters to NFC', () => {
		const state = createSession('ab', { start: { typed: 1, pending: ['é'] } });
		expect(state.pending).toEqual(['é']);
	});

	it.each([
		['no grapheme left to type', { typed: 2, pending: ['x'] }],
		['a negative position', { typed: -1, pending: ['x'] }],
		['a position that is not an integer', { typed: 0.5, pending: ['x'] }],
		['no wrong character', { typed: 1, pending: [] }],
		['an empty wrong character', { typed: 1, pending: [''] }],
		['two graphemes in one wrong character', { typed: 1, pending: ['xy'] }],
		['a line break as a wrong character', { typed: 1, pending: ['\n'] }],
		['a control character as a wrong character', { typed: 1, pending: ['\u0007'] }],
		['the expected grapheme as the first wrong character', { typed: 1, pending: ['b'] }]
	])('refuses a start with %s', (_label, start) => {
		expect(() => createSession('ab', { start })).toThrow(RangeError);
	});
});

const textArbitrary = fc.string({ unit: 'grapheme', minLength: 1, maxLength: 30 });
const policyArbitrary = fc.constantFrom<ErrorPolicy>('retry', 'backspace');

interface KeystrokeSpec {
	readonly kind: KeystrokeKind;
	readonly char: string | null;
	readonly delta: number;
}

function buildKeystrokes(specs: readonly KeystrokeSpec[]): NormalizedKeystroke[] {
	let timestamp = 0;
	return specs.map((spec) => {
		timestamp += spec.delta;
		return {
			kind: spec.kind,
			char: spec.char,
			code: null,
			timestamp,
			composed: false
		};
	});
}

function keystrokeSpecs(alphabet: readonly string[]) {
	return fc.array(
		fc.record({
			kind: fc.constantFrom<KeystrokeKind>('char', 'char', 'char', 'backspace', 'enter'),
			char: fc.oneof(
				fc.constantFrom(...alphabet),
				fc.string({ unit: 'grapheme', maxLength: 3 }),
				fc.constant(null)
			),
			delta: fc.integer({ min: 0, max: 2000 })
		}),
		{ maxLength: 80 }
	);
}

/** A text and a valid start: a place before its end and one or two wrong characters. */
const beginArbitrary = textArbitrary
	.chain((text) => {
		const length = toGraphemes(text).length;
		return fc.record({
			text: fc.constant(text),
			typed: fc.integer({ min: 0, max: length - 1 }),
			pending: fc.array(fc.constantFrom('x', 'k', 'é', '7', '@'), { minLength: 1, maxLength: 2 })
		});
	})
	.map(({ text, typed, pending }) => {
		const expected = toGraphemes(text)[typed];
		const first = pending[0] === expected ? (expected === 'x' ? 'k' : 'x') : pending[0];
		return { text, start: { typed, pending: [first as string, ...pending.slice(1)] } };
	});

function throws(action: () => unknown): boolean {
	try {
		action();
		return false;
	} catch (error) {
		return error instanceof RangeError;
	}
}

describe('session properties', () => {
	it('ends with full accuracy and one correct event per grapheme when the target is typed exactly', () => {
		fc.assert(
			fc.property(textArbitrary, policyArbitrary, (text, errorPolicy) => {
				const initial = createSession(text, { errorPolicy });
				const keystrokes = initial.target.map((grapheme, i) => keystrokeFor(grapheme, i * 120));
				const { state, events } = run(initial, keystrokes);
				const metrics = computeMetrics(state);
				return (
					isComplete(state) &&
					state.position === initial.target.length &&
					metrics.accuracy === 100 &&
					metrics.errorCount === 0 &&
					events.filter((event) => event.type === 'correct').length === initial.target.length &&
					events.at(-1)?.type === 'completed'
				);
			})
		);
	});

	it('is deterministic for the same text and keystrokes', () => {
		fc.assert(
			fc.property(
				textArbitrary,
				policyArbitrary,
				keystrokeSpecs(['a', 'b', 'e']),
				(text, p, specs) => {
					const keystrokes = buildKeystrokes(specs);
					const first = run(createSession(text, { errorPolicy: p }), keystrokes);
					const second = run(createSession(text, { errorPolicy: p }), keystrokes);
					expect(second).toEqual(first);
				}
			)
		);
	});

	it('never moves the position backward or beyond the target length', () => {
		fc.assert(
			fc.property(
				textArbitrary,
				policyArbitrary,
				keystrokeSpecs(['a', 'b', 'e']),
				(text, p, specs) => {
					let state = createSession(text, { errorPolicy: p });
					for (const keystroke of buildKeystrokes(specs)) {
						const next = applyKeystroke(state, keystroke).state;
						if (next.position < state.position || next.position > next.target.length) {
							return false;
						}
						state = next;
					}
					return true;
				}
			)
		);
	});

	it('never throws, whatever the keystrokes', () => {
		const anyKeystroke = fc.record({
			kind: fc.constantFrom<KeystrokeKind>('char', 'backspace', 'enter'),
			char: fc.option(fc.string({ unit: 'binary', maxLength: 6 }), { nil: null }),
			code: fc.option(fc.string({ maxLength: 8 }), { nil: null }),
			timestamp: fc.oneof(fc.integer(), fc.double({ noNaN: false })),
			composed: fc.boolean()
		});
		fc.assert(
			fc.property(
				fc.string({ unit: 'binary', minLength: 1, maxLength: 20 }),
				policyArbitrary,
				fc.array(anyKeystroke, { maxLength: 60 }),
				(text, errorPolicy, keystrokes) => {
					let state = createSession(text, { errorPolicy });
					for (const keystroke of keystrokes) {
						state = applyKeystroke(state, keystroke).state;
					}
					computeMetrics(state);
				}
			)
		);
	});

	it('never mutates the state it receives', () => {
		fc.assert(
			fc.property(
				textArbitrary,
				policyArbitrary,
				keystrokeSpecs(['a', 'b', 'e']),
				(text, p, specs) => {
					let state = deepFreeze(createSession(text, { errorPolicy: p }));
					for (const keystroke of buildKeystrokes(specs)) {
						const step = applyKeystroke(state, keystroke);
						state = deepFreeze(step.state);
						deepFreeze(step.events);
					}
				}
			)
		);
	});

	it('keeps pending equal to errors minus erasures in the backspace policy', () => {
		fc.assert(
			fc.property(textArbitrary, keystrokeSpecs(['a', 'b', 'e']), (text, specs) => {
				let state = createSession(text, { errorPolicy: 'backspace' });
				let errors = 0;
				let erasures = 0;
				for (const keystroke of buildKeystrokes(specs)) {
					const step = applyKeystroke(state, keystroke);
					for (const event of step.events) {
						if (event.type === 'error') errors += 1;
						if (event.type === 'erased') erasures += 1;
					}
					state = step.state;
					if (state.pending.length !== errors - erasures) {
						return false;
					}
				}
				return true;
			})
		);
	});

	it('ends a begun group without any mistake once its wrong characters are erased and the rest typed', () => {
		fc.assert(
			fc.property(beginArbitrary, policyArbitrary, ({ text, start }, errorPolicy) => {
				const initial = createSession(text, { errorPolicy, start });
				const erase = start.pending.map((_, i) => backspace(i * 50));
				const rest = initial.target
					.slice(start.typed)
					.map((grapheme, i) => keystrokeFor(grapheme, 1000 + i * 120));
				const { state, events } = run(initial, [...erase, ...rest]);
				const metrics = computeMetrics(state);
				return (
					isComplete(state) &&
					metrics.accuracy === 100 &&
					metrics.errorCount === 0 &&
					metrics.totalKeystrokes === initial.target.length - start.typed &&
					events.filter((event) => event.type === 'erased').length === start.pending.length
				);
			})
		);
	});

	it('takes no key of a begun group before its wrong characters are erased', () => {
		fc.assert(
			fc.property(beginArbitrary, keystrokeSpecs(['a', 'b', 'e']), ({ text, start }, specs) => {
				const keys = buildKeystrokes(specs.filter((spec) => spec.kind !== 'backspace'));
				const { state } = run(createSession(text, { start }), keys);
				return state.position === start.typed && state.pending.length >= start.pending.length;
			})
		);
	});

	it('counts as mistakes only the wrong keys of the child in a begun group', () => {
		fc.assert(
			fc.property(beginArbitrary, keystrokeSpecs(['a', 'b', 'e']), ({ text, start }, specs) => {
				let state = createSession(text, { start });
				let errors = 0;
				for (const keystroke of buildKeystrokes(specs)) {
					const step = applyKeystroke(state, keystroke);
					errors += step.events.filter((event) => event.type === 'error').length;
					state = step.state;
				}
				return computeMetrics(state).errorCount === errors;
			})
		);
	});

	it('refuses a start that leaves nothing to type', () => {
		fc.assert(
			fc.property(textArbitrary, fc.nat({ max: 10 }), (text, extra) => {
				const length = toGraphemes(text).length;
				const start = { typed: length + extra, pending: ['§'] };
				return throws(() => createSession(text, { start }));
			})
		);
	});

	it('keeps pending empty in the retry policy', () => {
		fc.assert(
			fc.property(textArbitrary, keystrokeSpecs(['a', 'b', 'e']), (text, specs) => {
				const { state } = run(createSession(text), buildKeystrokes(specs));
				return state.pending.length === 0;
			})
		);
	});

	it('keeps accuracy within 0 and 100 and counts consistent', () => {
		fc.assert(
			fc.property(
				textArbitrary,
				policyArbitrary,
				keystrokeSpecs(['a', 'b', 'e']),
				(text, p, specs) => {
					const { state } = run(createSession(text, { errorPolicy: p }), buildKeystrokes(specs));
					const metrics = computeMetrics(state);
					const attempts = Object.values(metrics.perChar).reduce((sum, c) => sum + c.attempts, 0);
					const charErrors = Object.values(metrics.perChar).reduce((sum, c) => sum + c.errors, 0);
					return (
						metrics.accuracy >= 0 &&
						metrics.accuracy <= 100 &&
						metrics.correctKeystrokes + metrics.errorCount === metrics.totalKeystrokes &&
						attempts === metrics.totalKeystrokes &&
						charErrors === metrics.errorCount &&
						metrics.elapsedMs >= 0
					);
				}
			)
		);
	});

	it('records one entry per accepted keystroke and leaves a completed session untouched', () => {
		fc.assert(
			fc.property(
				textArbitrary,
				policyArbitrary,
				keystrokeSpecs(['a', 'b', 'e']),
				(text, p, specs) => {
					let state = createSession(text, { errorPolicy: p });
					for (const keystroke of buildKeystrokes(specs)) {
						const step = applyKeystroke(state, keystroke);
						if (state.endedAt !== null) {
							if (step.state !== state || step.events.length !== 0) return false;
						} else if (
							step.events.length > 0 &&
							step.state.records.length !== state.records.length + 1
						) {
							return false;
						}
						state = step.state;
					}
					return true;
				}
			)
		);
	});
});
