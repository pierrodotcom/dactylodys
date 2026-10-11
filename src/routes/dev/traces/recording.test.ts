import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseTraceFile, replayTrace } from '$lib/keyboard/trace';
import type { RawInputEvent } from '$lib/keyboard/types';
import {
	buildTraces,
	detectEnvironment,
	isIdentical,
	isRecorded,
	parsePrompts,
	serializeTraces,
	slugify,
	traceFileName,
	type TracePrompt
} from './recording';

const CHROME_WINDOWS =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const EDGE_WINDOWS = `${CHROME_WINDOWS} Edg/141.0.3537.57`;
const FIREFOX_MAC =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:143.0) Gecko/20100101 Firefox/143.0';
const SAFARI_MAC =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15';
const CHROME_LINUX =
	'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

describe('detectEnvironment', () => {
	it.each([
		[CHROME_WINDOWS, 'Chrome', '141.0.0.0', 'Windows', '10.0'],
		[EDGE_WINDOWS, 'Edge', '141.0.3537.57', 'Windows', '10.0'],
		[FIREFOX_MAC, 'Firefox', '143.0', 'macOS', '10.15'],
		[SAFARI_MAC, 'Safari', '18.6', 'macOS', '10.15.7'],
		[CHROME_LINUX, 'Chrome', '141.0.0.0', 'Linux', '']
	])('reads %s', (userAgent, browser, browserVersion, os, osVersion) => {
		expect(detectEnvironment(userAgent)).toEqual({ browser, browserVersion, os, osVersion });
	});

	it('reports unknown values instead of guessing', () => {
		expect(detectEnvironment('')).toEqual({
			browser: 'unknown',
			browserVersion: '',
			os: 'unknown',
			osVersion: ''
		});
	});
});

describe('traceFileName', () => {
	it('slugifies accents and symbols', () => {
		expect(slugify('Édge Béta!')).toBe('edge-beta');
		expect(slugify('')).toBe('unknown');
	});

	it('follows <layoutId>__<os>-<browser>__<date>.json', () => {
		const environment = detectEnvironment(CHROME_WINDOWS);

		expect(traceFileName('fr-fr-azerty-pc', environment, '2026-10-11')).toBe(
			'fr-fr-azerty-pc__windows-chrome__2026-10-11.json'
		);
	});
});

const PROMPTS: TracePrompt[] = [
	{ id: 'p.one', title: 'One', text: 'a', instruction: 'Type a.' },
	{ id: 'p.two', title: 'Two', text: 'b', instruction: 'Type b.' }
];

function typedEvents(char: string, start: number): RawInputEvent[] {
	return [
		{ type: 'keydown', timestamp: start, key: char, code: 'KeyA' },
		{ type: 'beforeinput', timestamp: start + 1.0004, inputType: 'insertText', data: char },
		{ type: 'input', timestamp: start + 2, inputType: 'insertText', data: char },
		{ type: 'keyup', timestamp: start + 3, key: char, code: 'KeyA' }
	];
}

const CONTEXT = {
	layoutId: 'fr-fr-azerty-pc',
	keyboard: 'test keyboard',
	userAgent: CHROME_WINDOWS,
	environment: detectEnvironment(CHROME_WINDOWS),
	recordedAt: '2026-10-11T10:00:00.000Z'
};

describe('buildTraces', () => {
	it('keeps only the recorded prompts and marks them as real recordings', () => {
		const traces = buildTraces(PROMPTS, [[], typedEvents('b', 5000)], CONTEXT);

		expect(traces).toHaveLength(1);
		expect(traces[0]).toMatchObject({
			layoutId: 'fr-fr-azerty-pc',
			expectedText: 'b',
			synthetic: false,
			environment: { browser: 'Chrome', os: 'Windows', keyboard: 'test keyboard' }
		});
	});

	it('starts every trace at timestamp 0 and rounds to the microsecond', () => {
		const [trace] = buildTraces(PROMPTS, [typedEvents('a', 5000.5), []], CONTEXT);

		expect(trace?.events.map((event) => event.timestamp)).toEqual([0, 1, 2, 3]);
	});

	it('ignores a run that only holds key releases', () => {
		const lone: RawInputEvent[] = [{ type: 'keyup', timestamp: 1, key: 'Tab', code: 'Tab' }];

		expect(isRecorded(lone)).toBe(false);
		expect(buildTraces(PROMPTS, [lone, []], CONTEXT)).toEqual([]);
	});

	it('produces traces that replay to what was typed', () => {
		const traces = buildTraces(PROMPTS, [typedEvents('a', 10), typedEvents('x', 20)], CONTEXT);

		expect(traces.map((trace) => replayTrace(trace))).toEqual(['a', 'x']);
		expect(
			PROMPTS.map((prompt, index) =>
				isIdentical(prompt, index === 0 ? typedEvents('a', 1) : typedEvents('x', 1))
			)
		).toEqual([true, false]);
	});
});

describe('serializeTraces', () => {
	it('writes valid JSON that parses back to the same traces, one event per line', () => {
		const traces = buildTraces(PROMPTS, [typedEvents('a', 10), typedEvents('b', 20)], CONTEXT);
		const text = serializeTraces(traces);

		expect(parseTraceFile(JSON.parse(text))).toEqual(traces);
		expect(text.split('\n').filter((line) => line.includes('"type"'))).toHaveLength(8);
	});
});

describe('parsePrompts', () => {
	const valid = { schemaVersion: 1, prompts: PROMPTS };

	it('accepts valid prompts', () => {
		expect(parsePrompts(valid)).toEqual(PROMPTS);
	});

	it.each([
		['a wrong schema version', { ...valid, schemaVersion: 2 }, /schemaVersion/],
		['no prompt', { schemaVersion: 1, prompts: [] }, /non-empty/],
		['an empty text', { ...valid, prompts: [{ ...PROMPTS[0], text: '' }] }, /prompts\[0\]\.text/],
		['a duplicate id', { ...valid, prompts: [PROMPTS[0], PROMPTS[0]] }, /duplicate id p\.one/],
		[
			'a text that is not NFC',
			{ ...valid, prompts: [{ ...PROMPTS[0], text: 'ê' }] },
			/must be NFC/
		],
		['null', null, /schemaVersion/]
	])('rejects %s', (_name, data, message) => {
		expect(() => parsePrompts(data)).toThrow(message);
	});

	it('accepts the shipped French prompts', () => {
		const data: unknown = JSON.parse(readFileSync('content/fr/dev/trace-prompts.json', 'utf8'));

		expect(parsePrompts(data).length).toBeGreaterThanOrEqual(12);
	});
});
