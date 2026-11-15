import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * A `var(--dd-…)` whose name exists nowhere is silently empty in the browser: the style it feeds is
 * dropped and no tool says so (L-118, Q-16). Every name read by a style must be a design token, a
 * property a component declares for its own drawing, or one of the few positions set by script.
 */
const SOURCE_DIR = 'src';
const GENERATED_CSS = 'src/lib/generated/tokens.css';
const SKIPPED_DIRS = new Set(['generated', 'paraglide']);
const STYLE_SOURCE = /\.(svelte|css|ts)$/;
const TEST_FILE = /\.test\.ts$/;

/**
 * Geometry measured at run time and handed to the style sheet by an attachment (rule 7 of
 * `.claude/rules/ui-tokens.md`): never a colour, a design size nor a duration.
 */
const SET_BY_SCRIPT = [
	'--dd-greeting-x',
	'--dd-greeting-y',
	'--dd-keyboard-zoom',
	'--dd-map-companion-x',
	'--dd-map-companion-y'
];

const READ = /var\(\s*(--dd-[a-z0-9-]+)/g;
const DECLARED = /(?<![\w(-])(--dd-[a-z0-9-]+)\s*:/g;
const QUOTED = /['"`](--dd-[a-z0-9-]+)['"`]/g;

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return SKIPPED_DIRS.has(entry.name) ? [] : sourceFiles(path);
		return STYLE_SOURCE.test(entry.name) && !TEST_FILE.test(entry.name) ? [path] : [];
	});
}

function namesIn(text: string, pattern: RegExp): string[] {
	return [...text.matchAll(pattern)].map((match) => match[1] ?? '');
}

const tokens = new Set(namesIn(readFileSync(GENERATED_CSS, 'utf8'), DECLARED));
const sources = sourceFiles(SOURCE_DIR).map((file) => ({
	file: file.replaceAll('\\', '/'),
	text: readFileSync(file, 'utf8')
}));
const declaredByComponents = new Set(sources.flatMap(({ text }) => namesIn(text, DECLARED)));
const writtenByScripts = new Set(sources.flatMap(({ text }) => namesIn(text, QUOTED)));

describe('the custom properties read by the styles', () => {
	it('finds the design tokens and the styles that read them', () => {
		expect(tokens.size).toBeGreaterThan(500);
		expect(sources.length).toBeGreaterThan(100);
		expect(tokens.has('--dd-color-surface-base')).toBe(true);
	});

	it('are all defined: a token, a property of a component, or a position set by script', () => {
		const known = new Set([...tokens, ...declaredByComponents, ...SET_BY_SCRIPT]);
		const unknown = sources.flatMap(({ file, text }) =>
			[...new Set(namesIn(text, READ))]
				.filter((name) => !known.has(name))
				.map((name) => `${file}: ${name}`)
		);
		expect(unknown).toEqual([]);
	});

	it('lists as set by script only properties that a script really sets', () => {
		for (const name of SET_BY_SCRIPT) {
			expect(writtenByScripts.has(name), name).toBe(true);
			expect(tokens.has(name), name).toBe(false);
		}
	});
});
