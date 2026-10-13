import { VOICE_LICENSE, VOICE_SOURCE } from './import-plan';

/*
 * Adds or updates the row of the voice in the table of `static/ATTRIBUTIONS.md`. The whole table is
 * written again with its columns aligned, the way Prettier formats it: `npm run lint` checks that
 * file, and the tool must not leave it for someone to reformat.
 */

const ROW_PATTERN = /^\s*\|.*\|\s*$/;
const UNESCAPED_PIPE = /(?<!\\)\|/;
const MIN_COLUMN_WIDTH = 3;

function parseRow(line: string): string[] {
	return line
		.trim()
		.replace(/^\|/, '')
		.replace(/\|$/, '')
		.split(UNESCAPED_PIPE)
		.map((cell) => cell.trim());
}

function escapeCell(text: string): string {
	return text.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
}

function widthOf(text: string): number {
	return [...text].length;
}

function renderTable(header: readonly string[], rows: readonly (readonly string[])[]): string[] {
	const widths = header.map((_, column) =>
		Math.max(MIN_COLUMN_WIDTH, ...[header, ...rows].map((row) => widthOf(row[column] ?? '')))
	);
	const render = (row: readonly string[]) =>
		`| ${widths
			.map((width, column) => {
				const cell = row[column] ?? '';
				return cell + ' '.repeat(width - widthOf(cell));
			})
			.join(' | ')} |`;
	return [
		render(header),
		`| ${widths.map((width) => '-'.repeat(width)).join(' | ')} |`,
		...rows.map(render)
	];
}

/** The folder of a published voice, as it is written in the table: what tells its row apart. */
export function voiceFolderMark(locale: string): string {
	return `\`static/voice/${locale}/\``;
}

export function voiceAttributionRow(locale: string, author: string): string[] {
	return [
		`Voix des consignes et du récit (${voiceFolderMark(locale)})`,
		escapeCell(author),
		VOICE_SOURCE,
		VOICE_LICENSE
	];
}

/** The same document, with the row of this voice added at the end of the table or replaced. */
export function updateAttributions(markdown: string, locale: string, author: string): string {
	const lines = markdown.split('\n');
	const first = lines.findIndex((line) => ROW_PATTERN.test(line));
	if (first < 0) throw new Error('No table found in the attributions file');
	let end = first;
	while (end < lines.length && ROW_PATTERN.test(lines[end] ?? '')) end += 1;
	const [header = [], , ...rows] = lines.slice(first, end).map(parseRow);

	const row = voiceAttributionRow(locale, author);
	const mark = voiceFolderMark(locale);
	const existing = rows.findIndex((cells) => cells[0]?.includes(mark));
	if (existing >= 0) rows[existing] = row;
	else rows.push(row);

	return [...lines.slice(0, first), ...renderTable(header, rows), ...lines.slice(end)].join('\n');
}
