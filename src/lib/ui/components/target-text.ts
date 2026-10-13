export interface TargetCell {
	readonly index: number;
	readonly text: string;
}

export interface TargetGroup {
	readonly kind: 'word' | 'space';
	readonly cells: readonly TargetCell[];
}

/** Groups that must stay on the same line. */
export type TargetUnit = readonly TargetGroup[];

const SPACE = ' ';
const LINE_BREAK = '\n';
/** Signs that close or follow a word: never an opening quote or bracket. */
const TRAILING_PUNCTUATION = /^[\p{Po}\p{Pf}\p{Pe}\p{Pd}]+$/u;

function toGroups(graphemes: readonly string[]): TargetGroup[] {
	const groups: { kind: 'word' | 'space'; cells: TargetCell[] }[] = [];
	graphemes.forEach((text, index) => {
		const isSpace = text === SPACE || text === LINE_BREAK;
		const last = groups.at(-1);
		if (!isSpace && last?.kind === 'word') last.cells.push({ index, text });
		else groups.push({ kind: isSpace ? 'space' : 'word', cells: [{ index, text }] });
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

/**
 * Splits the text into words and spaces, and keeps a sign written after a space (« vélo ? ») with
 * the word before it, so that the sign never starts a line alone.
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
		} else {
			units.push([group]);
		}
	}
	return units;
}
