import type { Profile, SessionRecord } from '$lib/state/types';
import { wordsPerMinuteOf } from './evolution';

/** Tells a spreadsheet that the file is UTF-8 (Excel reads it in another encoding otherwise). */
export const CSV_BYTE_ORDER_MARK = '\uFEFF';
export const CSV_FILE_EXTENSION = '.csv';
const LINE_END = '\r\n';
const QUOTE = '"';
const MS_PER_MINUTE = 60_000;
const MS_PER_SECOND = 1000;
/* A cell starting with one of these is read as a formula by spreadsheets. */
const FORMULA_START = /^[=+\-@\t\r]/;
const FORMULA_GUARD = "'";

/** What changes with the language of the file: from the messages, never in this code. */
export interface CsvFormat {
	/** One character, never a quote nor a line break. */
	readonly separator: string;
	/** A number with this many digits after the decimal separator of the language at most. */
	readonly formatNumber: (value: number, fractionDigits: number) => string;
	readonly yes: string;
	readonly no: string;
	/** The names of the columns, in the order of `MEASURE_COLUMNS`. */
	readonly headers: Readonly<Record<MeasureColumn, string>>;
	readonly lessonTitle: (lessonId: string) => string;
	readonly gameTitle: (gameId: string) => string;
}

export const MEASURE_COLUMNS = [
	'child',
	'date',
	'time',
	'lesson',
	'game',
	'durationSeconds',
	'keystrokes',
	'errors',
	'accuracy',
	'wordsPerMinute',
	'stars',
	'passed'
] as const;

export type MeasureColumn = (typeof MEASURE_COLUMNS)[number];

function checkSeparator(separator: string): void {
	if ([...separator].length !== 1 || separator === QUOTE || /[\r\n]/.test(separator)) {
		throw new RangeError(`not a usable CSV separator: ${JSON.stringify(separator)}`);
	}
}

/**
 * A cell as RFC 4180 writes it: between quotes, its quotes doubled, when it holds the separator,
 * a quote, a line break or a space at an edge.
 */
export function csvField(text: string, separator: string): string {
	checkSeparator(separator);
	const quoted =
		text.includes(separator) || text.includes(QUOTE) || /[\r\n]/.test(text) || text.trim() !== text;
	return quoted ? `${QUOTE}${text.replaceAll(QUOTE, QUOTE + QUOTE)}${QUOTE}` : text;
}

/** A free text (a nickname, a title) a spreadsheet must show as it is, never compute. */
export function csvText(text: string): string {
	return FORMULA_START.test(text) ? `${FORMULA_GUARD}${text}` : text;
}

/** The whole file: the byte order mark, then one line per row, each ended by CR LF. */
export function csvDocument(rows: readonly (readonly string[])[], separator: string): string {
	checkSeparator(separator);
	const lines = rows.map((row) => row.map((cell) => csvField(cell, separator)).join(separator));
	return CSV_BYTE_ORDER_MARK + lines.map((line) => line + LINE_END).join('');
}

function twoDigits(value: number): string {
	return String(value).padStart(2, '0');
}

/** The local day (`YYYY-MM-DD`) and time (`HH:MM`) of the device when the play was finished. */
export function localDateTime(
	at: number,
	utcOffsetMinutes: number
): { readonly date: string; readonly time: string } {
	const local = new Date(at + utcOffsetMinutes * MS_PER_MINUTE);
	return {
		date: local.toISOString().slice(0, 10),
		time: `${twoDigits(local.getUTCHours())}:${twoDigits(local.getUTCMinutes())}`
	};
}

function measureRow(name: string, session: SessionRecord, format: CsvFormat): string[] {
	const { date, time } = localDateTime(session.finishedAt, session.utcOffsetMinutes);
	const cells: Record<MeasureColumn, string> = {
		child: csvText(name),
		date,
		time,
		lesson: csvText(format.lessonTitle(session.lessonId)),
		game: csvText(format.gameTitle(session.gameId)),
		durationSeconds: format.formatNumber(session.durationMs / MS_PER_SECOND, 1),
		keystrokes: format.formatNumber(session.totalKeystrokes, 0),
		errors: format.formatNumber(session.errorCount, 0),
		accuracy: format.formatNumber(session.accuracy, 1),
		wordsPerMinute: format.formatNumber(wordsPerMinuteOf(session), 1),
		stars: format.formatNumber(session.stars, 0),
		passed: session.passed ? format.yes : format.no
	};
	return MEASURE_COLUMNS.map((column) => cells[column]);
}

/** The file of measures: a header, then one line per play, child after child, oldest first. */
export function measuresCsv(profiles: readonly Profile[], format: CsvFormat): string {
	const header = MEASURE_COLUMNS.map((column) => format.headers[column]);
	const rows = profiles.flatMap((profile) =>
		profile.sessions.map((session) => measureRow(profile.name, session, format))
	);
	return csvDocument([header, ...rows], format.separator);
}
