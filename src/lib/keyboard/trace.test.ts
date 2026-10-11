import { describe, expect, it } from 'vitest';
import { applyKeystrokeToText, parseTrace, parseTraceFile, replayTrace } from './trace';
import type { KeyboardTrace } from './types';

function validTrace(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		schemaVersion: 1,
		layoutId: 'fr-fr-azerty-pc',
		expectedText: 'a',
		environment: {
			browser: 'Chrome',
			browserVersion: '1',
			os: 'Windows',
			osVersion: '11',
			userAgent: 'ua',
			keyboard: 'test',
			recordedAt: '2026-10-11'
		},
		synthetic: true,
		events: [
			{ type: 'keydown', timestamp: 1, key: 'a', code: 'KeyQ' },
			{ type: 'beforeinput', timestamp: 2, inputType: 'insertText', data: 'a' },
			{ type: 'input', timestamp: 3, inputType: 'insertText', data: 'a' },
			{ type: 'keyup', timestamp: 4, key: 'a', code: 'KeyQ' }
		],
		...overrides
	};
}

function withEvents(events: unknown[]): Record<string, unknown> {
	return validTrace({ events });
}

describe('parseTrace', () => {
	it('returns a valid trace unchanged', () => {
		const data = validTrace();

		expect(parseTrace(data)).toEqual(data);
	});

	it('accepts every optional event field', () => {
		const event = {
			type: 'keydown',
			timestamp: 0,
			key: 'a',
			code: 'KeyQ',
			repeat: false,
			isComposing: false,
			shiftKey: false,
			ctrlKey: false,
			altKey: false,
			metaKey: false,
			altGraph: false,
			inputType: 'insertText',
			data: null
		};

		expect(parseTrace(withEvents([event])).events).toEqual([event]);
	});

	it.each([
		['null', null, /trace: expected an object/],
		['an array', [], /trace: expected an object/],
		['an unknown schema version', validTrace({ schemaVersion: 2 }), /schemaVersion: expected 1/],
		['an empty layout id', validTrace({ layoutId: '' }), /layoutId: expected a non-empty string/],
		['a missing expected text', validTrace({ expectedText: undefined }), /expectedText/],
		[
			'a non-boolean synthetic flag',
			validTrace({ synthetic: 'yes' }),
			/synthetic: expected a boolean/
		],
		['an unknown top-level property', validTrace({ extra: 1 }), /unknown property extra/],
		[
			'a missing environment',
			validTrace({ environment: undefined }),
			/environment: expected an object/
		],
		[
			'an invalid recording date',
			validTrace({
				environment: { ...(validTrace().environment as object), recordedAt: 'yesterday' }
			}),
			/recordedAt: expected an ISO 8601 date/
		],
		[
			'a missing environment field',
			validTrace({ environment: { ...(validTrace().environment as object), os: undefined } }),
			/environment\.os: expected a string/
		],
		['events that are not an array', validTrace({ events: {} }), /events: expected an array/],
		['an unknown event type', withEvents([{ type: 'click', timestamp: 1 }]), /events\[0\]\.type/],
		[
			'a negative timestamp',
			withEvents([{ type: 'keyup', timestamp: -1 }]),
			/events\[0\]\.timestamp/
		],
		[
			'a non-finite timestamp',
			withEvents([{ type: 'keyup', timestamp: null }]),
			/events\[0\]\.timestamp/
		],
		[
			'a decreasing timestamp',
			withEvents([
				{ type: 'keyup', timestamp: 5 },
				{ type: 'keyup', timestamp: 4 }
			]),
			/events\[1\]\.timestamp: timestamps must not decrease/
		],
		[
			'a non-string key',
			withEvents([{ type: 'keyup', timestamp: 1, key: 1 }]),
			/events\[0\]\.key: expected a string/
		],
		[
			'a non-boolean flag',
			withEvents([{ type: 'keyup', timestamp: 1, repeat: 1 }]),
			/events\[0\]\.repeat: expected a boolean/
		],
		[
			'an invalid data field',
			withEvents([{ type: 'input', timestamp: 1, data: 3 }]),
			/events\[0\]\.data/
		],
		[
			'an unknown event property',
			withEvents([{ type: 'keyup', timestamp: 1, keyCode: 65 }]),
			/unknown property keyCode/
		]
	])('rejects %s with an explicit error', (_name, data, message) => {
		expect(() => parseTrace(data)).toThrow(message);
	});
});

describe('parseTraceFile', () => {
	it('accepts a single trace', () => {
		expect(parseTraceFile(validTrace())).toHaveLength(1);
	});

	it('accepts an array of traces', () => {
		expect(parseTraceFile([validTrace(), validTrace({ expectedText: 'b' })])).toHaveLength(2);
	});

	it('rejects an empty array', () => {
		expect(() => parseTraceFile([])).toThrow(/empty/);
	});

	it('names the index of the invalid trace', () => {
		expect(() => parseTraceFile([validTrace(), validTrace({ schemaVersion: 3 })])).toThrow(
			/trace 1: .*schemaVersion/
		);
	});
});

describe('replayTrace', () => {
	function traceWith(events: unknown[]): KeyboardTrace {
		return parseTrace(withEvents(events));
	}

	const typed = (char: string, start: number) => [
		{ type: 'keydown', timestamp: start, key: char, code: 'KeyA' },
		{ type: 'beforeinput', timestamp: start + 1, inputType: 'insertText', data: char },
		{ type: 'input', timestamp: start + 2, inputType: 'insertText', data: char },
		{ type: 'keyup', timestamp: start + 3, key: char, code: 'KeyA' }
	];
	const backspace = (start: number) => [
		{ type: 'keydown', timestamp: start, key: 'Backspace', code: 'Backspace' },
		{ type: 'beforeinput', timestamp: start + 1, inputType: 'deleteContentBackward', data: null },
		{ type: 'input', timestamp: start + 2, inputType: 'deleteContentBackward', data: null },
		{ type: 'keyup', timestamp: start + 3, key: 'Backspace', code: 'Backspace' }
	];

	it('returns the typed text', () => {
		expect(replayTrace(traceWith([...typed('a', 0), ...typed('é', 10)]))).toBe('aé');
	});

	it('applies Backspace', () => {
		expect(replayTrace(traceWith([...typed('a', 0), ...typed('b', 10), ...backspace(20)]))).toBe(
			'a'
		);
	});

	it('removes a whole grapheme with Backspace', () => {
		expect(replayTrace(traceWith([...typed('ê', 0), ...backspace(10)]))).toBe('');
	});

	it('ignores Backspace on empty text', () => {
		expect(replayTrace(traceWith(backspace(0)))).toBe('');
	});

	it('returns an empty string for a trace without events', () => {
		expect(replayTrace(traceWith([]))).toBe('');
	});
});

describe('applyKeystrokeToText', () => {
	it('appends a character, a line break, and removes the last grapheme', () => {
		const at = { code: null, timestamp: 0, composed: false };
		let text = applyKeystrokeToText('', { ...at, kind: 'char', char: 'a' });
		text = applyKeystrokeToText(text, { ...at, kind: 'enter', char: null });
		text = applyKeystrokeToText(text, { ...at, kind: 'char', char: 'b' });
		expect(text).toBe('a\nb');

		expect(applyKeystrokeToText(text, { ...at, kind: 'backspace', char: null })).toBe('a\n');
	});
});
