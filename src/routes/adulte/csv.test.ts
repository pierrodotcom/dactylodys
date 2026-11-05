import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createProfile } from '$lib/state/profile';
import type { Profile, SessionRecord } from '$lib/state/types';
import {
	CSV_BYTE_ORDER_MARK,
	csvDocument,
	csvField,
	csvText,
	localDateTime,
	MEASURE_COLUMNS,
	measuresCsv,
	type CsvFormat
} from './csv';

const SEPARATOR = ';';

/** A reader that follows RFC 4180, to check that what is written reads back the same. */
function parseCsv(text: string, separator: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let quoted = false;
	for (let index = 0; index < text.length; index++) {
		const char = text[index];
		if (quoted) {
			if (char === '"' && text[index + 1] === '"') {
				cell += '"';
				index++;
			} else if (char === '"') {
				quoted = false;
			} else {
				cell += char;
			}
		} else if (char === '"') {
			quoted = true;
		} else if (char === separator) {
			row.push(cell);
			cell = '';
		} else if (char === '\r' && text[index + 1] === '\n') {
			row.push(cell);
			rows.push(row);
			row = [];
			cell = '';
			index++;
		} else {
			cell += char;
		}
	}
	return rows;
}

const FORMAT: CsvFormat = {
	separator: SEPARATOR,
	formatNumber: (value, digits) =>
		new Intl.NumberFormat('fr', { maximumFractionDigits: digits, useGrouping: false }).format(
			value
		),
	yes: 'oui',
	no: 'non',
	headers: Object.fromEntries(MEASURE_COLUMNS.map((column) => [column, `h-${column}`])) as Record<
		(typeof MEASURE_COLUMNS)[number],
		string
	>,
	lessonTitle: (id) => `Leçon ${id}`,
	gameTitle: (id) => `Jeu ${id}`
};

function session(overrides: Partial<SessionRecord> = {}): SessionRecord {
	return {
		lessonId: 'l1',
		gameId: 'hatching',
		// 2026-11-05 13:07 UTC.
		finishedAt: Date.parse('2026-11-05T13:07:00Z'),
		utcOffsetMinutes: 60,
		durationMs: 61_250,
		totalKeystrokes: 120,
		correctKeystrokes: 111,
		errorCount: 9,
		accuracy: 92.5,
		correctCharsPerMinute: 63,
		stars: 2,
		passed: true,
		...overrides
	};
}

function child(name: string, sessions: readonly SessionRecord[]): Profile {
	// The name is set apart: a nickname of a profile has no line break, but the file must not rely on it.
	return { ...createProfile({ id: name, name: 'x', now: 1, platform: 'pc' }), name, sessions };
}

describe('csvField', () => {
	it('leaves a plain cell as it is', () => {
		expect(csvField('Lou', SEPARATOR)).toBe('Lou');
	});

	it('quotes a cell holding the separator, a quote or a line break', () => {
		expect(csvField('a;b', SEPARATOR)).toBe('"a;b"');
		expect(csvField('dit "oui"', SEPARATOR)).toBe('"dit ""oui"""');
		expect(csvField('a\nb', SEPARATOR)).toBe('"a\nb"');
	});

	it('refuses a separator a reader could not tell apart', () => {
		expect(() => csvField('a', '"')).toThrow();
		expect(() => csvField('a', '\n')).toThrow();
		expect(() => csvField('a', ';;')).toThrow();
	});

	it('writes any rows so that they read back the same', () => {
		const text = fc.string({
			unit: fc.constantFrom('a', 'é', ' ', ';', '"', '\n', '\r', ',', 'x')
		});
		fc.assert(
			fc.property(
				fc.array(fc.array(text, { minLength: 1, maxLength: 5 }), { minLength: 1, maxLength: 5 }),
				(rows) => {
					const document = csvDocument(rows, SEPARATOR);
					expect(document.startsWith(CSV_BYTE_ORDER_MARK)).toBe(true);
					expect(parseCsv(document.slice(CSV_BYTE_ORDER_MARK.length), SEPARATOR)).toEqual(rows);
				}
			)
		);
	});
});

describe('csvText', () => {
	it('keeps a spreadsheet from computing a nickname', () => {
		expect(csvText('=1+1')).toBe("'=1+1");
		expect(csvText('@Lou')).toBe("'@Lou");
		expect(csvText('Lou')).toBe('Lou');
	});
});

describe('localDateTime', () => {
	it('gives the day and the time of the device then', () => {
		expect(localDateTime(Date.parse('2026-11-05T23:30:00Z'), 60)).toEqual({
			date: '2026-11-06',
			time: '00:30'
		});
		expect(localDateTime(Date.parse('2026-11-05T01:05:00Z'), -300)).toEqual({
			date: '2026-11-04',
			time: '20:05'
		});
	});
});

describe('measuresCsv', () => {
	it('writes a header, then one line per play with the numbers of the language', () => {
		const text = measuresCsv([child('Lou', [session()])], FORMAT);
		const rows = parseCsv(text.slice(CSV_BYTE_ORDER_MARK.length), SEPARATOR);
		expect(rows[0]).toEqual(MEASURE_COLUMNS.map((column) => `h-${column}`));
		expect(rows[1]).toEqual([
			'Lou',
			'2026-11-05',
			'14:07',
			'Leçon l1',
			'Jeu hatching',
			'61,3',
			'120',
			'9',
			'92,5',
			'12,6',
			'2',
			'oui'
		]);
		expect(rows).toHaveLength(2);
	});

	it('keeps a nickname with a separator, quotes and a line break in one cell', () => {
		const name = 'Lo;u "le"\nmagnifique';
		const rows = parseCsv(
			measuresCsv([child(name, [session({ passed: false })])], FORMAT).slice(1),
			SEPARATOR
		);
		expect(rows[1]?.[0]).toBe(name);
		expect(rows[1]?.at(-1)).toBe('non');
	});

	it('puts every child, in the order given, and only a header without any play', () => {
		const text = measuresCsv(
			[child('Lou', [session()]), child('Ali', [session(), session()])],
			FORMAT
		);
		const rows = parseCsv(text.slice(1), SEPARATOR);
		expect(rows.slice(1).map((row) => row[0])).toEqual(['Lou', 'Ali', 'Ali']);
		expect(parseCsv(measuresCsv([child('Lou', [])], FORMAT).slice(1), SEPARATOR)).toHaveLength(1);
	});
});
