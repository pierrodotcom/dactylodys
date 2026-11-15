import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { computeMetrics } from '$lib/engine/metrics';
import { applyKeystroke, createSession, pauseSession, resumeSession } from '$lib/engine/session';
import type { SessionEvent, SessionState } from '$lib/engine/types';
import { createInputNormalizer } from '$lib/keyboard/input-adapter';
import { LAYOUT_IDS, type LayoutId } from '$lib/keyboard/layout-ids';
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

/**
 * Layouts offered to the children with no trace recorded on real hardware yet (rule 5 of
 * `.claude/rules/clavier.md`): a hand-written trace only says what we believe a browser does.
 * Each exception is dated and says what it waits for; it goes away with the first real trace.
 */
const NOT_RECORDED_ON_HARDWARE: Readonly<
	Partial<Record<LayoutId, { readonly since: string; readonly waitingFor: string }>>
> = {
	'fr-fr-azerty-mac': {
		since: '2026-11-15',
		waitingFor: 'testers with a Mac: question Q7 of docs/SUIVI.md'
	}
};
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function hasRecordedTrace(layoutId: string): boolean {
	return files
		.filter((file) => dirname(file) === `${TRACES_DIR}/${layoutId}`)
		.flatMap((file) => parseTraceFile(JSON.parse(readFileSync(file, 'utf8'))))
		.some((trace) => !trace.synthetic);
}

describe('trace files', () => {
	it('exist for every known layout', () => {
		for (const layoutId of LAYOUT_IDS) {
			expect(files.some((file) => dirname(file) === `${TRACES_DIR}/${layoutId}`)).toBe(true);
		}
	});

	it.each(LAYOUT_IDS.filter((layoutId) => !(layoutId in NOT_RECORDED_ON_HARDWARE)))(
		'include a trace recorded on real hardware for %s',
		(layoutId) => {
			expect(hasRecordedTrace(layoutId)).toBe(true);
		}
	);

	it('lists only known layouts as exceptions, each dated, with what it waits for', () => {
		for (const [layoutId, exception] of Object.entries(NOT_RECORDED_ON_HARDWARE)) {
			expect(LAYOUT_IDS as readonly string[]).toContain(layoutId);
			expect(exception.since).toMatch(ISO_DATE);
			expect(Number.isNaN(Date.parse(exception.since))).toBe(false);
			expect(exception.waitingFor.trim()).not.toBe('');
		}
	});

	it('drops an exception as soon as its layout has a trace recorded on real hardware', () => {
		for (const layoutId of Object.keys(NOT_RECORDED_ON_HARDWARE)) {
			expect(hasRecordedTrace(layoutId)).toBe(false);
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
