export interface TargetCell {
	readonly index: number;
	readonly text: string;
}

/** `enter`: a line break, shown at the end of its line by a small symbol; the text goes on below. */
export interface TargetGroup {
	readonly kind: 'word' | 'space' | 'enter';
	readonly cells: readonly TargetCell[];
}

/** Groups that must stay on the same line. */
export type TargetUnit = readonly TargetGroup[];

const SPACE = ' ';
const LINE_BREAK = '\n';
/** Signs that close or follow a word: never an opening quote or bracket. */
const TRAILING_PUNCTUATION = /^[\p{Po}\p{Pf}\p{Pe}\p{Pd}]+$/u;

function kindOf(text: string): TargetGroup['kind'] {
	if (text === LINE_BREAK) return 'enter';
	return text === SPACE ? 'space' : 'word';
}

function toGroups(graphemes: readonly string[]): TargetGroup[] {
	const groups: { kind: TargetGroup['kind']; cells: TargetCell[] }[] = [];
	graphemes.forEach((text, index) => {
		const kind = kindOf(text);
		const last = groups.at(-1);
		if (kind !== 'enter' && last?.kind === kind) last.cells.push({ index, text });
		else groups.push({ kind, cells: [{ index, text }] });
	});
	return groups;
}

function isLoneSpace(group: TargetGroup): boolean {
	return group.kind === 'space' && group.cells.length === 1 && group.cells[0]?.text === SPACE;
}

function isTrailingPunctuation(group: TargetGroup | undefined): group is TargetGroup {
	return (
		group?.kind === 'word' &&
		TRAILING_PUNCTUATION.test(group.cells.map((cell) => cell.text).join(''))
	);
}

/** The unit closes its line: the next one starts below it. */
export function endsLine(unit: TargetUnit): boolean {
	return unit.at(-1)?.kind === 'enter';
}

/**
 * Splits the text into words and spaces, and keeps a sign written after a space (« vélo ? ») with
 * the word before it, so that the sign never starts a line alone. A line break stays at the end of
 * the line it closes, with what comes before it (`endsLine`).
 */
export function toTargetUnits(graphemes: readonly string[]): TargetUnit[] {
	const groups = toGroups(graphemes);
	const units: TargetGroup[][] = [];
	for (let i = 0; i < groups.length; i++) {
		const group = groups[i] as TargetGroup;
		const next = groups[i + 1];
		const current = units.at(-1);
		if (isLoneSpace(group) && isTrailingPunctuation(next) && current?.at(-1)?.kind === 'word') {
			current.push(group, next);
			i += 1;
		} else if (group.kind === 'enter' && current !== undefined && !endsLine(current)) {
			current.push(group);
		} else {
			units.push([group]);
		}
	}
	return units;
}
