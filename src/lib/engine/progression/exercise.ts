import { toGraphemes } from '../graphemes';
import { findLesson, learnedChars } from './definition';
import type { Exercise, LessonDefinition, ProgressionDefinition, Rng } from './types';

const SPACE = ' ';
const WORD_SHARE = 0.5;
const MAX_ATTEMPTS = 64;
const RELAXED_AFTER_ATTEMPT = 16;
const MAX_IDENTICAL_IN_A_ROW = 2;

interface GroupContext {
	readonly lesson: LessonDefinition;
	readonly fresh: readonly string[];
	readonly known: readonly string[];
	readonly weight: number;
	readonly rng: Rng;
}

function pick<T>(items: readonly T[], rng: Rng): T {
	const index = Math.min(items.length - 1, Math.floor(rng() * items.length));
	return items[index] as T;
}

function between(min: number, max: number, rng: Rng): number {
	return min + Math.min(max - min, Math.floor(rng() * (max - min + 1)));
}

function isAllowed(sequence: readonly string[], char: string, length: number): boolean {
	const index = sequence.length;
	if (char === SPACE) {
		return index > 0 && index < length - 1 && sequence[index - 1] !== SPACE;
	}
	return !(
		index >= MAX_IDENTICAL_IN_A_ROW &&
		sequence[index - 1] === char &&
		sequence[index - 2] === char
	);
}

function pickChar(
	sequence: readonly string[],
	length: number,
	context: GroupContext,
	relaxed: boolean
) {
	const { fresh, known, weight, rng } = context;
	const allowed = (pool: readonly string[]) =>
		pool.filter((char) => isAllowed(sequence, char, length));
	const pools = relaxed
		? [allowed([...fresh, ...known])]
		: rng() < weight
			? [allowed(fresh), allowed(known)]
			: [allowed(known), allowed(fresh)];
	const pool = pools.find((candidate) => candidate.length > 0);
	if (pool === undefined) {
		throw new Error(`Lesson ${context.lesson.id}: no character can be placed in a group`);
	}
	return pick(pool, rng);
}

function buildSequence(
	length: number,
	forced: string | undefined,
	context: GroupContext,
	relaxed: boolean
): string {
	const sequence: string[] = [];
	while (sequence.length < length) {
		sequence.push(pickChar(sequence, length, context, relaxed));
	}
	if (forced !== undefined && !sequence.includes(forced)) {
		const first = forced === SPACE ? 1 : 0;
		const last = forced === SPACE ? length - 2 : length - 1;
		sequence[between(first, last, context.rng)] = forced;
	}
	return sequence.join('');
}

function buildGroup(forced: string | undefined, context: GroupContext, relaxed: boolean): string {
	const { lesson, rng } = context;
	const wantsWord = lesson.words.length > 0 && rng() < WORD_SHARE;
	if (wantsWord && forced === undefined) return pick(lesson.words, rng);
	const [min, max] = lesson.groupLength;
	return buildSequence(between(min, max, rng), forced, context, relaxed);
}

export function generateExercise(
	progression: ProgressionDefinition,
	lessonId: string,
	rng: Rng
): Exercise {
	const lesson = findLesson(progression, lessonId);
	if (lesson === undefined) throw new RangeError(`Unknown lesson: ${lessonId}`);

	const fresh = lesson.newChars;
	const known = learnedChars(progression, lessonId).filter((char) => !fresh.includes(char));
	const context: GroupContext = {
		lesson,
		fresh,
		known,
		weight: progression.rules.newCharWeight,
		rng
	};

	const groups: string[] = [];
	const covered = new Set<string>();
	for (let index = 0; index < lesson.groupCount; index++) {
		const missing = fresh.filter((char) => !covered.has(char));
		const groupsAfter = lesson.groupCount - 1 - index;
		const forced = missing.length > groupsAfter ? missing[0] : undefined;
		const previous = groups[index - 1];

		let group = buildGroup(forced, context, false);
		for (let attempt = 1; group === previous && attempt < MAX_ATTEMPTS; attempt++) {
			group = buildGroup(forced, context, attempt >= RELAXED_AFTER_ATTEMPT);
		}
		if (group === previous) {
			throw new Error(`Lesson ${lessonId}: cannot build two different consecutive groups`);
		}

		groups.push(group);
		for (const grapheme of toGraphemes(group)) covered.add(grapheme);
	}
	return { lessonId, groups };
}
