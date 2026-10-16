import { toGraphemes } from '../graphemes';
import { usableWords } from '../progression/banks';
import { learnedChars, lessonIds } from '../progression/definition';
import { between, placeForced } from '../progression/exercise';
import { isLessonPassed } from '../progression/progress';
import type {
	Exercise,
	ExerciseContext,
	LessonDefinition,
	ProgressionDefinition,
	Rng
} from '../progression/types';
import type { HelpQuest, HelpQuestRules } from './types';

const SPACE = ' ';
const MAX_ATTEMPTS = 64;
const LETTER_PATTERN = /\p{L}/u;
// A space needs a letter on each side: "a b" is the shortest group that holds one.
const SHORTEST_SPACED_GROUP = 3;

interface Plan {
	readonly char: string;
	readonly isSpace: boolean;
	readonly fill: readonly string[];
	readonly rng: Rng;
}

function isLowerLetter(char: string): boolean {
	return LETTER_PATTERN.test(char) && char === char.toLowerCase();
}

function countOf(graphemes: readonly string[], char: string): number {
	return graphemes.filter((grapheme) => grapheme === char).length;
}

/** The most copies of the key a group of this length can hold without breaking the group rules. */
function capacity(plan: Plan, length: number): number {
	return plan.isSpace ? Math.floor((length - 1) / 2) : Math.ceil(length / 2);
}

function fillChar(plan: Plan): string {
	return plan.fill[between(0, plan.fill.length - 1, plan.rng)] as string;
}

function isValidGroup(sequence: readonly string[]): boolean {
	return sequence.every(
		(grapheme, i) => !(i >= 2 && sequence[i - 1] === grapheme && sequence[i - 2] === grapheme)
	);
}

/** A group of `length` characters that holds the key `count` times, the rest being other letters. */
function buildDrill(plan: Plan, length: number, count: number): string {
	const { char, isSpace, rng } = plan;
	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
		let sequence: string[] | undefined;
		if (isSpace) {
			// `count` spaces cut `length - count` letters into `count + 1` non-empty pieces.
			const sizes = Array.from({ length: count + 1 }, () => 1);
			for (let spare = length - count - sizes.length; spare > 0; spare--) {
				const slot = between(0, count, rng);
				sizes[slot] = (sizes[slot] as number) + 1;
			}
			const pieces = sizes.map((size) =>
				Array.from({ length: size }, () => fillChar(plan)).join('')
			);
			sequence = toGraphemes(pieces.join(SPACE));
		} else {
			const natural = Array.from({ length }, () => fillChar(plan));
			sequence = placeForced(
				natural,
				Array.from({ length: count }, () => char),
				rng
			);
		}
		if (
			sequence !== undefined &&
			sequence.length === length &&
			isValidGroup(sequence) &&
			countOf(sequence, char) === count
		) {
			return sequence.join('');
		}
	}
	throw new Error(`Cannot build a group of ${length} characters with ${count} "${plan.char}"`);
}

function pickWord(
	pool: readonly string[],
	room: number,
	avoid: ReadonlySet<string>,
	rng: Rng
): string | undefined {
	const fitting = pool.filter((word) => toGraphemes(word).length <= room);
	const fresh = (list: readonly string[]) => list.filter((word) => !avoid.has(word));
	const options = [fresh(fitting), fitting, fresh(pool), pool].find((list) => list.length > 0);
	return options === undefined ? undefined : options[between(0, options.length - 1, rng)];
}

/** Last lesson the child has passed, or the lesson of the quest when that comes later. */
function lastLessonId(
	progression: ProgressionDefinition,
	quest: HelpQuest,
	context: ExerciseContext
): string {
	const ids = lessonIds(progression);
	let last = ids.indexOf(quest.lessonId);
	if (last < 0) throw new RangeError(`Unknown lesson: ${quest.lessonId}`);
	const { progress } = context;
	if (progress !== undefined) {
		ids.forEach((id, i) => {
			if (i > last && isLessonPassed(progression.rules, progress, id)) last = i;
		});
	}
	return ids[last] as string;
}

function lessonsUpTo(progression: ProgressionDefinition, lessonId: string): LessonDefinition[] {
	const lessons: LessonDefinition[] = [];
	for (const world of progression.worlds) {
		for (const lesson of world.lessons) {
			lessons.push(lesson);
			if (lesson.id === lessonId) return lessons;
		}
	}
	return lessons;
}

/**
 * The short exercise of a help quest: groups of words and warm-up suites that bring the key back
 * often, written with the characters the child knows. It stops as soon as `targetLength` is
 * reached, and goes on only while the key was not asked `minCharCount` times yet.
 */
export function generateHelpExercise(
	progression: ProgressionDefinition,
	quest: HelpQuest,
	rules: HelpQuestRules,
	rng: Rng,
	context: ExerciseContext = {}
): Exercise {
	const lastId = lastLessonId(progression, quest, context);
	const allowed = learnedChars(progression, lastId);
	const { char } = quest;
	if (!allowed.includes(char)) throw new RangeError(`Character "${char}" is not taught yet`);

	const lessons = lessonsUpTo(progression, lastId);
	const home = lessons.find((lesson) => lesson.id === quest.lessonId) as LessonDefinition;
	const known = new Set(allowed);
	const wordSet = new Set<string>();
	for (const lesson of lessons) {
		for (const word of lesson.words) {
			if (toGraphemes(word).every((grapheme) => known.has(grapheme))) wordSet.add(word);
		}
	}
	if (context.words !== undefined) {
		for (const entry of usableWords(context.words, allowed, { maxLevel: context.maxLevel })) {
			wordSet.add(entry.text);
		}
	}

	const isSpace = char === SPACE;
	const others = allowed.filter((grapheme) => grapheme !== char && grapheme !== SPACE);
	const fill = others.some(isLowerLetter) ? others.filter(isLowerLetter) : others;
	if (fill.length === 0) throw new RangeError('No other character to build a group with');
	const plan: Plan = { char, isSpace, fill, rng };
	// A word holds the key on its own; for a space, two words are put side by side.
	const wordPool = isSpace
		? [...wordSet]
		: [...wordSet].filter((word) => toGraphemes(word).includes(char));
	const [minLength, maxLength] = home.groupLength;
	const shortest = isSpace ? SHORTEST_SPACED_GROUP : 1;

	const groups: string[] = [];
	const usedWords = new Set<string>();
	let total = 0;
	let count = 0;
	// Each group adds at least one character, so this only guards against a loop that cannot end.
	const maxGroups = rules.targetLength + rules.minCharCount;

	while ((total < rules.targetLength || count < rules.minCharCount) && groups.length < maxGroups) {
		const room = rules.targetLength - total;
		const lacking = Math.max(0, rules.minCharCount - count);
		// Dense: the room left only just holds the copies still owed, so groups hold nothing else.
		const needed = isSpace ? 2 * lacking + 1 : 2 * lacking - 1;
		const dense = lacking > 0 && needed >= room;
		const previous = groups[groups.length - 1];
		let group = '';

		for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
			group = '';
			if (dense) {
				const length = Math.max(shortest, Math.min(Math.max(needed, minLength), maxLength));
				group = buildDrill(plan, length, Math.min(lacking, capacity(plan, length)));
			} else if (wordPool.length > 0 && rng() < 0.5) {
				const first = pickWord(wordPool, room, usedWords, rng);
				if (!isSpace) {
					group = first ?? '';
				} else if (first !== undefined) {
					const second = pickWord(
						wordPool.filter((word) => word !== first),
						room,
						usedWords,
						rng
					);
					group = second === undefined ? '' : `${first}${SPACE}${second}`;
				}
			}
			if (group === '') {
				const longest = Math.max(shortest, Math.min(maxLength, Math.max(room, minLength)));
				const length = between(Math.max(shortest, minLength), longest, rng);
				group = buildDrill(plan, length, between(1, capacity(plan, length), rng));
			}
			if (group !== previous) break;
		}

		for (const word of group.split(SPACE)) usedWords.add(word);
		const graphemes = toGraphemes(group);
		groups.push(group);
		total += graphemes.length;
		count += countOf(graphemes, char);
	}
	return { lessonId: quest.lessonId, groups };
}
