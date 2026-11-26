import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stringsOf, TEXT_FIELDS } from '../../tools/content/lib/typography.js';

/*
 * The typography of the interface (ADR-094, `typography.test.ts`) for the texts that `content/fr/`
 * shows or says: instructions and their short sentences, story, rewards, the instructions of the
 * trial page of traces. What the child types keeps its ordinary spaces (ADR-023): a no-break space
 * would ask for a key the keyboard does not have. `tools/content/apply-typography.js` applies it.
 */
const CONTENT = 'content/fr';
const NO_BREAK_SPACES = /[\u00a0\u202f]/u;

interface Located {
	readonly file: string;
	readonly path: string;
	readonly text: string;
}

const located: Located[] = readdirSync(CONTENT).flatMap((kind) =>
	readdirSync(join(CONTENT, kind))
		.filter((name) => name.endsWith('.json'))
		.flatMap((name) => {
			const file = `${kind}/${name}`;
			const data: unknown = JSON.parse(readFileSync(join(CONTENT, file), 'utf8'));
			return stringsOf(data).map(({ path, text }) => ({ file, path, text }));
		})
);

function kindOf(item: Located): string {
	return item.file.slice(0, item.file.indexOf('/'));
}

function isAt(item: Located, field: 'shown' | 'typed' | 'notes'): boolean {
	return TEXT_FIELDS[kindOf(item)]?.[field]?.includes(item.path) ?? false;
}

const shown = located.filter((item) => isAt(item, 'shown'));
const typed = located.filter((item) => isAt(item, 'typed'));

function offending(pattern: RegExp): string[] {
	return shown.filter((item) => pattern.test(item.text)).map((item) => item.text);
}

describe('the typography of the texts the content shows or says', () => {
	it('puts no ordinary space before a colon, a semicolon, a question or exclamation mark', () => {
		expect(offending(/ [:;!?]/u)).toEqual([]);
	});

	it('puts no ordinary space inside French quotation marks', () => {
		expect(offending(/« | »/u)).toEqual([]);
	});

	it('keeps a percentage with its number', () => {
		expect(offending(/\d %/u)).toEqual([]);
	});

	it('writes the apostrophe straight, as on the key of the keyboard', () => {
		expect(offending(/[\u2018\u2019]/u)).toEqual([]);
	});

	it('uses the no-break space it asks for, in the instructions, the story and the rewards', () => {
		const spaced = shown.filter((item) => /\u00a0[:;!?»]/u.test(item.text));
		expect(new Set(spaced.map(kindOf))).toEqual(
			new Set(['progression', 'story', 'rewards', 'dev'])
		);
	});
});

describe('the texts the child types', () => {
	it('never ask for a no-break space', () => {
		expect(typed.length).toBeGreaterThan(1000);
		expect(typed.filter((item) => NO_BREAK_SPACES.test(item.text))).toEqual([]);
	});

	it('keep the ordinary space of the keyboard before a sign', () => {
		expect(typed.some((item) => / [:;!?]/u.test(item.text))).toBe(true);
	});
});

describe('where the texts of the content live', () => {
	it('knows of every sentence of the content whether it is shown or typed', () => {
		const sentences = located.filter((item) => /\p{L}[\s\u00a0]+\p{L}/u.test(item.text));
		const unknown = sentences.filter(
			(item) => !isAt(item, 'shown') && !isAt(item, 'typed') && !isAt(item, 'notes')
		);
		expect(unknown.map((item) => `${item.file} ${item.path}`)).toEqual([]);
	});

	it('finds texts at every place it names', () => {
		for (const [kind, fields] of Object.entries(TEXT_FIELDS)) {
			for (const path of [...fields.shown, ...fields.typed, ...(fields.notes ?? [])]) {
				const found = located.some((item) => kindOf(item) === kind && item.path === path);
				expect(found, `${kind} ${path}`).toBe(true);
			}
		}
	});
});
