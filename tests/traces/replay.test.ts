import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { computeMetrics } from '$lib/engine/metrics';
import { applyKeystroke, createSession, pauseSession, resumeSession } from '$lib/engine/session';
import type { SessionEvent, SessionState } from '$lib/engine/types';
import { createInputNormalizer } from '$lib/keyboard/input-adapter';
import { LAYOUT_IDS } from '$lib/keyboard/layout-ids';
import { parseTraceFile, replayTrace } from '$lib/keyboard/trace';
import type { KeyboardTrace, NormalizedKeystroke } from '$lib/keyboard/types';

const TRACES_DIR = 'tests/traces';

function traceFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) return traceFiles(path);
		return entry.name.endsWith('.json') ? [path] : [];
	});
}

const files = traceFiles(TRACES_DIR).map((path) => path.replaceAll('\\', '/'));

describe('trace files', () => {
	it('exist for every known layout', () => {
		for (const layoutId of LAYOUT_IDS) {
			expect(files.some((file) => dirname(file) === `${TRACES_DIR}/${layoutId}`)).toBe(true);
		}
	});

	it('only live in a folder named after a known layout', () => {
		for (const file of files) {
			expect(LAYOUT_IDS as readonly string[]).toContain(basename(dirname(file)));
		}
	});
});

describe.each(files)('%s', (file) => {
	const traces = parseTraceFile(JSON.parse(readFileSync(file, 'utf8')));

	it('belongs to the layout of its folder', () => {
		for (const trace of traces) {
			expect(trace.layoutId).toBe(basename(dirname(file)));
		}
	});

	it.each(traces.map((trace, index) => ({ index, trace })))(
		'replays trace $index to its expected text',
		({ trace }) => {
			expect(replayTrace(trace)).toBe(trace.expectedText);
		}
	);

	it.each(traces.map((trace, index) => ({ index, trace })))(
		'gives trace $index the same characters whatever the way its time is measured',
		({ trace }) => {
			const keystrokes = normalizedKeystrokes(trace);
			const target = trace.expectedText === '' ? ' ' : trace.expectedText;
			const firstAt = keystrokes[0]?.timestamp ?? 0;
			for (const errorPolicy of ['retry', 'backspace'] as const) {
				const former = typed(createSession(target, { errorPolicy }), keystrokes, false);
				const shown = createSession(target, { errorPolicy, shownAt: firstAt - 1000 });
				const current = typed(shown, keystrokes, true);
				expect(current.events).toEqual(former.events);
				expect(current.state.position).toBe(former.state.position);
				expect(current.state.pending).toEqual(former.state.pending);
				expect(current.state.records).toEqual(former.state.records);
				const [was, is] = [computeMetrics(former.state), computeMetrics(current.state)];
				expect(is.perChar).toEqual(
					Object.fromEntries(
						Object.entries(was.perChar).map(([char, stats]) => [
							char,
							{ ...stats, meanLatencyMs: is.perChar[char]?.meanLatencyMs }
						])
					)
				);
				expect(is.accuracy).toBe(was.accuracy);
			}
		}
	);
});

function normalizedKeystrokes(trace: KeyboardTrace): NormalizedKeystroke[] {
	const normalizer = createInputNormalizer();
	return trace.events.flatMap((event) => normalizer.push(event));
}

/** Types the keystrokes; `withPauses` takes a pause after each one, over before the next. */
function typed(
	initial: SessionState,
	keystrokes: readonly NormalizedKeystroke[],
	withPauses: boolean
): { state: SessionState; events: SessionEvent[] } {
	let state = initial;
	const events: SessionEvent[] = [];
	for (const keystroke of keystrokes) {
		const step = applyKeystroke(state, keystroke);
		events.push(...step.events);
		state = step.state;
		if (withPauses) {
			state = resumeSession(pauseSession(state, keystroke.timestamp), keystroke.timestamp);
		}
	}
	return { state, events };
}
