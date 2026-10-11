import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LAYOUT_IDS } from '$lib/keyboard/layout-ids';
import { parseTraceFile, replayTrace } from '$lib/keyboard/trace';

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
});
