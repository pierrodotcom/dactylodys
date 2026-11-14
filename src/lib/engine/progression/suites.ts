import type { DrillPatternRules, Rng } from './types';

const SPACE = ' ';
const LETTER_PATTERN = /^\p{L}$/u;
/** The places of a shape that take a vowel; the other ones (`C`, `D`) take a consonant. */
const VOWEL_SLOTS = ['V', 'W'];
/** A group never mixes more than two new characters with more than two known ones. */
const MAX_NEW = 2;
const MAX_KNOWN = 2;
const MAX_IDENTICAL_IN_A_ROW = 2;

type Kind = 'consonant' | 'vowel';

export interface SuiteChars {
	/** Characters the suite must hold, each at least once. */
	readonly forced: readonly string[];
	/** The other new characters of the lesson. */
	readonly fresh: readonly string[];
	/** The characters learned before. */
	readonly known: readonly string[];
}

export interface SuiteOptions {
	/** Minimum and maximum number of characters of the suite. */
	readonly length: readonly [number, number];
	/** Chance (0 to 1) that a free place takes a new character rather than a known one. */
	readonly newCharWeight: number;
	/** How much a character is preferred among those of its kind: a weak one comes back more. */
	readonly weightOf: (char: string) => number;
	readonly rng: Rng;
}

interface Pools {
	readonly forced: string[];
	readonly fresh: string[];
	readonly known: string[];
}

function kindOf(char: string, vowels: readonly string[]): Kind | undefined {
	if (!LETTER_PATTERN.test(char)) return undefined;
	return vowels.includes(char) ? 'vowel' : 'consonant';
}

function kindOfSlot(slot: string): Kind {
	return VOWEL_SLOTS.includes(slot) ? 'vowel' : 'consonant';
}

function slotsOf(shape: string): string[] {
	return [...new Set([...shape].filter((symbol) => symbol !== SPACE))];
}

function pick<T>(items: readonly T[], weights: readonly number[], rng: Rng): T {
	const total = weights.reduce((sum, weight) => sum + weight, 0);
	let remaining = rng() * total;
	for (let i = 0; i < items.length; i++) {
		remaining -= weights[i] as number;
		if (remaining < 0) return items[i] as T;
	}
	return items[items.length - 1] as T;
}

function takeFrom(pool: string[], options: SuiteOptions): string {
	const char = pick(pool, pool.map(options.weightOf), options.rng);
	pool.splice(pool.indexOf(char), 1);
	return char;
}

/** The characters of the places of a shape, or nothing when they cannot all be filled. */
function fill(
	shape: string,
	pools: Record<Kind, Pools>,
	options: SuiteOptions
): Map<string, string> | undefined {
	const chosen = new Map<string, string>();
	const slots = slotsOf(shape);
	let fresh = pools.consonant.forced.length + pools.vowel.forced.length;
	let known = 0;
	for (const slot of slots) {
		const pool = pools[kindOfSlot(slot)];
		if (pool.forced.length > 0) {
			chosen.set(slot, takeFrom(pool.forced, options));
			continue;
		}
		const canBeFresh = fresh < MAX_NEW && pool.fresh.length > 0;
		const canBeKnown = known < MAX_KNOWN && pool.known.length > 0;
		if (!canBeFresh && !canBeKnown) return undefined;
		const takesFresh = canBeFresh && (!canBeKnown || options.rng() < options.newCharWeight);
		chosen.set(slot, takeFrom(takesFresh ? pool.fresh : pool.known, options));
		if (takesFresh) fresh += 1;
		else known += 1;
	}
	const leftOver = pools.consonant.forced.length + pools.vowel.forced.length;
	return leftOver > 0 ? undefined : chosen;
}

function hasTriple(text: string): boolean {
	const chars = [...text];
	return chars.some(
		(char, i) =>
			i >= MAX_IDENTICAL_IN_A_ROW &&
			chars.slice(i - MAX_IDENTICAL_IN_A_ROW, i).every((before) => before === char)
	);
}

/**
 * A suite with a regular shape (`rules.drillPatterns`), e.g. `fjf`, `va vi`: the characters it
 * must hold take the places of their kind, the other places go to new or known letters. Nothing
 * when no shape fits: a character that is not a letter to place, more of them than a shape holds,
 * no shape of the right length.
 */
export function buildPatternSuite(
	patterns: DrillPatternRules,
	chars: SuiteChars,
	options: SuiteOptions
): string | undefined {
	const { vowels, shapes } = patterns;
	const [min, max] = options.length;
	const everyChar = [...chars.forced, ...chars.fresh, ...chars.known];
	const wantsSpace = chars.forced.includes(SPACE);
	const forcedLetters = chars.forced.filter((char) => char !== SPACE);
	if (forcedLetters.some((char) => kindOf(char, vowels) === undefined)) return undefined;
	if (forcedLetters.length > MAX_NEW) return undefined;

	const ofKind = (list: readonly string[], kind: Kind): string[] => [
		...new Set(list.filter((char) => kindOf(char, vowels) === kind))
	];
	const poolsOf = (kind: Kind): Pools => {
		const forced = ofKind(forcedLetters, kind);
		const fresh = ofKind(chars.fresh, kind).filter((char) => !forced.includes(char));
		const known = ofKind(chars.known, kind).filter(
			(char) => !forced.includes(char) && !fresh.includes(char)
		);
		return { forced, fresh, known };
	};
	const available: Record<Kind, Pools> = {
		consonant: poolsOf('consonant'),
		vowel: poolsOf('vowel')
	};
	const sizeOf = (kind: Kind): number =>
		available[kind].forced.length + available[kind].fresh.length + available[kind].known.length;

	const fitting = shapes.filter((shape) => {
		const hasSpace = shape.includes(SPACE);
		if (shape.length < min || shape.length > max) return false;
		if (hasSpace ? !everyChar.includes(SPACE) : wantsSpace) return false;
		const slots = slotsOf(shape);
		return (['consonant', 'vowel'] as const).every((kind) => {
			const places = slots.filter((slot) => kindOfSlot(slot) === kind).length;
			return places >= available[kind].forced.length && places <= sizeOf(kind);
		});
	});
	const spoken = fitting.filter((shape) => {
		const kinds = new Set(slotsOf(shape).map(kindOfSlot));
		return kinds.size > 1;
	});
	const copyOf = (pools: Pools): Pools => ({
		forced: [...pools.forced],
		fresh: [...pools.fresh],
		known: [...pools.known]
	});

	// The shapes that can be said aloud come first; the others only when none of them can be filled.
	for (const list of [spoken, fitting.filter((shape) => !spoken.includes(shape))]) {
		const candidates = [...list];
		while (candidates.length > 0) {
			const index = Math.min(candidates.length - 1, Math.floor(options.rng() * candidates.length));
			const [shape] = candidates.splice(index, 1) as [string];
			const chosen = fill(
				shape,
				{ consonant: copyOf(available.consonant), vowel: copyOf(available.vowel) },
				options
			);
			if (chosen === undefined) continue;
			const text = [...shape].map((symbol) => chosen.get(symbol) ?? symbol).join('');
			if (!hasTriple(text)) return text;
		}
	}
	return undefined;
}
