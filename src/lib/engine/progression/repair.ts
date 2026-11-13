import { keyBoxes } from '../../keyboard/hands';
import type {
	KeyboardGeometryDefinition,
	LayoutDefinition,
	ModifierLevel
} from '../../keyboard/types';
import { toGraphemes } from '../graphemes';
import type { SessionStart } from '../types';
import { LINE_BREAK } from './definition';
import { between } from './exercise';
import type { KeyNeighbors, RepairRules, Rng } from './types';

const SPACE = ' ';
/** Two keys of the same row touch; keys of two rows next to each other overlap. */
const TOUCH_TOLERANCE = 0.01;

/**
 * The characters of the keys around the key of each character, at the same level (else without
 * modifier), as the layout and the shape of the keyboard place them. Nothing is assumed about the
 * layout: everything comes from its data.
 */
export function keyNeighbors(
	layout: LayoutDefinition,
	geometry: KeyboardGeometryDefinition
): KeyNeighbors {
	const boxes = [...keyBoxes(geometry)];
	const neighbors = new Map<string, Set<string>>();
	for (const [code, box] of boxes) {
		const levels = layout.keys[code];
		if (levels === undefined) continue;
		const around = boxes.filter(([other, otherBox]) => {
			if (other === code) return false;
			const rows = Math.abs(otherBox.center.y - box.center.y);
			if (rows > 1 + TOUCH_TOLERANCE) return false;
			return rows < TOUCH_TOLERANCE
				? Math.abs(otherBox.left - box.right) < TOUCH_TOLERANCE ||
						Math.abs(box.left - otherBox.right) < TOUCH_TOLERANCE
				: otherBox.left < box.right - TOUCH_TOLERANCE &&
						box.left < otherBox.right - TOUCH_TOLERANCE;
		});
		for (const [level, output] of Object.entries(levels) as [ModifierLevel, unknown][]) {
			if (!isTypable(output)) continue;
			const set = neighbors.get(output) ?? new Set<string>();
			for (const [other] of around) {
				const otherLevels = layout.keys[other];
				const near = otherLevels?.[level] ?? otherLevels?.base;
				if (isTypable(near) && near !== output) set.add(near);
			}
			neighbors.set(output, set);
		}
	}
	return new Map([...neighbors].map(([char, set]) => [char, [...set]]));
}

function isTypable(output: unknown): output is string {
	return (
		typeof output === 'string' &&
		toGraphemes(output).length === 1 &&
		output !== SPACE &&
		output !== LINE_BREAK
	);
}

/**
 * A wrong character for `expected`: a learned character other than it, on a key next to its key
 * when there is one, else any learned character. `undefined` when none is learned.
 */
export function mistakeFor(
	expected: string,
	learned: readonly string[],
	neighbors: KeyNeighbors | undefined,
	rng: Rng
): string | undefined {
	const allowed = (char: string) => char !== expected && isTypable(char) && learned.includes(char);
	const near = (neighbors?.get(expected) ?? []).filter(allowed);
	const pool = near.length > 0 ? near : learned.filter(allowed);
	return pool.length === 0 ? undefined : pool[between(0, pool.length - 1, rng)];
}

/**
 * Where a group arrives begun: after a right beginning (at least one grapheme, from about a third of
 * the group on when it can), on a grapheme that is neither a space nor a line break, with one to
 * `maxPending` wrong characters. `null` when the group is too short or nothing wrong can be written.
 */
export function plantMistakes(
	group: string,
	rules: RepairRules,
	learned: readonly string[],
	neighbors: KeyNeighbors | undefined,
	rng: Rng
): SessionStart | null {
	const graphemes = toGraphemes(group);
	const places = (from: number) =>
		graphemes
			.map((_, index) => index)
			.filter((index) => index >= from && index > 0 && isTypable(graphemes[index]));
	const late = places(Math.ceil(graphemes.length / 3));
	const candidates = late.length > 0 ? late : places(1);
	if (candidates.length === 0) return null;
	const typed = candidates[between(0, candidates.length - 1, rng)] as number;
	const count = Math.min(between(1, rules.maxPending, rng), graphemes.length - typed);
	const pending: string[] = [];
	for (let i = 0; i < count; i++) {
		// Each wrong character stands for the grapheme the finger was going for at its place.
		const aimed = graphemes[typed + i] as string;
		const mistake = mistakeFor(
			isTypable(aimed) ? aimed : (graphemes[typed] as string),
			learned,
			neighbors,
			rng
		);
		if (mistake === undefined) break;
		pending.push(mistake);
	}
	return pending.length === 0 ? null : { typed, pending };
}

/**
 * How each group of an exercise of repairs starts: every group before the ending text arrives with
 * mistakes, and `rules.share` of the groups of the text (at least one when the share is positive),
 * picked without bias by `rng`, the first group among them when the text opens the exercise: the
 * child always meets a mistake to erase first. `endingFrom` is the index of the first group of the
 * text, the number of groups when there is none.
 */
export function repairStarts(
	groups: readonly string[],
	endingFrom: number,
	rules: RepairRules,
	learned: readonly string[],
	neighbors: KeyNeighbors | undefined,
	rng: Rng
): (SessionStart | null)[] {
	const ending = groups.length - endingFrom;
	const wanted = rules.share === 0 ? 0 : Math.max(1, Math.round(rules.share * ending));
	const remaining = Array.from({ length: ending }, (_, i) => endingFrom + i);
	const chosen = new Set<number>();
	// The exercise always opens on a group to repair, even when the text comes first.
	if (endingFrom === 0 && wanted > 0) chosen.add(remaining.shift() as number);
	while (chosen.size < Math.min(wanted, ending)) {
		const index = between(0, remaining.length - 1, rng);
		chosen.add(remaining.splice(index, 1)[0] as number);
	}
	return groups.map((group, index) =>
		index < endingFrom || chosen.has(index)
			? plantMistakes(group, rules, learned, neighbors, rng)
			: null
	);
}
