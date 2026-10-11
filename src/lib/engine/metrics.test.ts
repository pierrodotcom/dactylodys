import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { NormalizedKeystroke } from '../keyboard/types';
import { computeMetrics } from './metrics';
import { applyKeystroke, createSession } from './session';
import type { ErrorPolicy, SessionState } from './types';

function char(value: string, timestamp: number): NormalizedKeystroke {
	return { kind: 'char', char: value, code: null, timestamp, composed: false };
}

function backspace(timestamp: number): NormalizedKeystroke {
	return { kind: 'backspace', char: null, code: null, timestamp, composed: false };
}

function enter(timestamp: number): NormalizedKeystroke {
	return { kind: 'enter', char: null, code: null, timestamp, composed: false };
}

function play(
	text: string,
	errorPolicy: ErrorPolicy,
	keystrokes: readonly NormalizedKeystroke[]
): SessionState {
	let state = createSession(text, { errorPolicy });
	for (const keystroke of keystrokes) {
		state = applyKeystroke(state, keystroke).state;
	}
	return state;
}

describe('computeMetrics', () => {
	it('returns neutral values for a session that has not started', () => {
		expect(computeMetrics(createSession('abc'), 5000)).toEqual({
			elapsedMs: 0,
			totalKeystrokes: 0,
			correctKeystrokes: 0,
			errorCount: 0,
			accuracy: 100,
			correctCharsPerMinute: 0,
			wordsPerMinute: 0,
			perChar: {}
		});
	});

	it('measures elapsed time up to endedAt when the session is complete, ignoring now', () => {
		const state = play('ab', 'retry', [char('a', 1000), char('b', 4000)]);
		expect(computeMetrics(state, 99_999).elapsedMs).toBe(3000);
	});

	it('measures elapsed time up to now when the session is running', () => {
		const state = play('abc', 'retry', [char('a', 1000), char('b', 2000)]);
		expect(computeMetrics(state, 10_000).elapsedMs).toBe(9000);
	});

	it('falls back to the last record timestamp without now', () => {
		const state = play('abc', 'retry', [char('a', 1000), char('x', 2500)]);
		expect(computeMetrics(state).elapsedMs).toBe(1500);
	});

	it('never reports a negative elapsed time', () => {
		const state = play('abc', 'retry', [char('a', 1000)]);
		expect(computeMetrics(state, 500).elapsedMs).toBe(0);
	});

	it('counts errors and correct keystrokes and computes accuracy', () => {
		const state = play('ab', 'retry', [
			char('x', 0),
			char('a', 100),
			char('y', 200),
			char('b', 300)
		]);
		const metrics = computeMetrics(state);
		expect(metrics.totalKeystrokes).toBe(4);
		expect(metrics.correctKeystrokes).toBe(2);
		expect(metrics.errorCount).toBe(2);
		expect(metrics.accuracy).toBe(50);
	});

	it('does not count Backspace as a keystroke', () => {
		const state = play('ab', 'backspace', [
			char('x', 0),
			backspace(100),
			char('a', 200),
			char('b', 300)
		]);
		const metrics = computeMetrics(state);
		expect(state.records).toHaveLength(4);
		expect(metrics.totalKeystrokes).toBe(3);
		expect(metrics.correctKeystrokes).toBe(2);
		expect(metrics.errorCount).toBe(1);
	});

	it('computes correct characters per minute and words per minute', () => {
		const text = 'abcdefghij';
		const keystrokes = [...text].map((c, i) => char(c, i * 6000));
		const metrics = computeMetrics(play(text, 'retry', keystrokes));
		expect(metrics.elapsedMs).toBe(54_000);
		expect(metrics.correctCharsPerMinute).toBeCloseTo(10 / 0.9, 10);
		expect(metrics.wordsPerMinute).toBeCloseTo(10 / 0.9 / 5, 10);
	});

	it('reports a speed of zero when no time has elapsed', () => {
		const metrics = computeMetrics(play('a', 'retry', [char('a', 700)]));
		expect(metrics.elapsedMs).toBe(0);
		expect(metrics.correctCharsPerMinute).toBe(0);
		expect(metrics.wordsPerMinute).toBe(0);
	});

	it('counts only correct keystrokes in the speed', () => {
		const state = play('ab', 'retry', [char('a', 0), char('x', 30_000), char('b', 60_000)]);
		expect(computeMetrics(state).correctCharsPerMinute).toBe(2);
	});

	it('indexes per-character statistics by expected grapheme', () => {
		const state = play('aab', 'retry', [
			char('x', 0),
			char('a', 100),
			char('a', 300),
			char('b', 600)
		]);
		const { perChar } = computeMetrics(state);
		expect(Object.keys(perChar).sort()).toEqual(['a', 'b']);
		expect(perChar['a']).toEqual({ attempts: 3, errors: 1, meanLatencyMs: 150 });
		expect(perChar['b']).toEqual({ attempts: 1, errors: 0, meanLatencyMs: 300 });
	});

	it('has no latency for a character only typed first or only wrongly', () => {
		const first = computeMetrics(play('ab', 'retry', [char('a', 500)])).perChar['a'];
		expect(first).toEqual({ attempts: 1, errors: 0, meanLatencyMs: null });
		const wrong = computeMetrics(play('ab', 'retry', [char('a', 0), char('x', 100)])).perChar['b'];
		expect(wrong).toEqual({ attempts: 1, errors: 1, meanLatencyMs: null });
	});

	it('measures latency from the previous record whatever its nature', () => {
		const state = play('ab', 'backspace', [
			char('x', 0),
			backspace(400),
			char('a', 1000),
			char('b', 1100)
		]);
		const { perChar } = computeMetrics(state);
		expect(perChar['a']).toEqual({ attempts: 2, errors: 1, meanLatencyMs: 600 });
		expect(perChar['b']).toEqual({ attempts: 1, errors: 0, meanLatencyMs: 100 });
	});

	it('averages latencies over correct keystrokes only', () => {
		const state = play('aa', 'retry', [char('a', 0), char('x', 50), char('a', 1050)]);
		expect(computeMetrics(state).perChar['a']).toEqual({
			attempts: 3,
			errors: 1,
			meanLatencyMs: 1000
		});
	});

	it('keys the line break as \\n and handles multi-code-point graphemes', () => {
		const emoji = '\u{1F44D}\u{1F3FD}';
		const state = play(`${emoji}\n`, 'retry', [char(emoji, 0), enter(200)]);
		const { perChar } = computeMetrics(state);
		expect(perChar[emoji]).toEqual({ attempts: 1, errors: 0, meanLatencyMs: null });
		expect(perChar['\n']).toEqual({ attempts: 1, errors: 0, meanLatencyMs: 200 });
	});

	it('does not mutate the session state', () => {
		const state = Object.freeze(play('ab', 'retry', [char('a', 0)]));
		expect(() => computeMetrics(state, 100)).not.toThrow();
	});
});

describe('computeMetrics properties', () => {
	const specs = fc.array(
		fc.record({
			kind: fc.constantFrom('char', 'char', 'backspace', 'enter'),
			char: fc.constantFrom('a', 'b', 'c', 'x'),
			delta: fc.integer({ min: 0, max: 3000 })
		}),
		{ maxLength: 80 }
	);

	it('keeps accuracy within 0 and 100 and correct plus errors equal to total', () => {
		fc.assert(
			fc.property(
				fc.string({ unit: 'grapheme', minLength: 1, maxLength: 20 }),
				fc.constantFrom<ErrorPolicy>('retry', 'backspace'),
				specs,
				fc.option(fc.integer({ min: 0, max: 500_000 }), { nil: undefined }),
				(text, errorPolicy, items, now) => {
					let timestamp = 0;
					let state = createSession(text, { errorPolicy });
					for (const item of items) {
						timestamp += item.delta;
						state = applyKeystroke(state, {
							kind: item.kind as 'char' | 'backspace' | 'enter',
							char: item.kind === 'char' ? item.char : null,
							code: null,
							timestamp,
							composed: false
						}).state;
					}
					const metrics = computeMetrics(state, now);
					return (
						metrics.accuracy >= 0 &&
						metrics.accuracy <= 100 &&
						metrics.correctKeystrokes + metrics.errorCount === metrics.totalKeystrokes &&
						metrics.elapsedMs >= 0 &&
						metrics.correctCharsPerMinute >= 0 &&
						metrics.wordsPerMinute === metrics.correctCharsPerMinute / 5
					);
				}
			)
		);
	});
});
