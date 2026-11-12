import { toGraphemes } from '../graphemes';
import { lessonTexts, storyPhrases, textGroups, textOf, usablePhrases, usableWords } from './banks';
import { LINE_BREAK, findLesson, freshChars, learnedChars } from './definition';
import { recentErrorRate } from './progress';
import type {
	Exercise,
	ExerciseContext,
	ExerciseMix,
	LessonDefinition,
	ProgressionDefinition,
	Rng
} from './types';

const SPACE = ' ';
const MAX_ATTEMPTS = 64;
const RELAXED_AFTER_ATTEMPT = 16;
const MAX_IDENTICAL_IN_A_ROW = 2;

type Genre = 'drill' | 'word' | 'phrase';

interface Item {
	readonly text: string;
	readonly graphemes: readonly string[];
	readonly weight: number;
}

interface Reserve {
	readonly items: readonly Item[];
	readonly used: Set<string>;
}

interface Candidate {
	readonly text: string;
	readonly reserve?: Reserve;
}

interface Settings {
	readonly lesson: LessonDefinition;
	readonly fresh: readonly string[];
	readonly known: readonly string[];
	readonly newCharWeight: number;
	readonly weakCharBoost: number;
	readonly errorRate: (char: string) => number;
	readonly rng: Rng;
}

export function between(min: number, max: number, rng: Rng): number {
	return min + Math.min(max - min, Math.floor(rng() * (max - min + 1)));
}

function pickWeighted<T>(items: readonly T[], weights: readonly number[], rng: Rng): T {
	const total = weights.reduce((sum, weight) => sum + weight, 0);
	let remaining = rng() * total;
	for (let i = 0; i < items.length; i++) {
		remaining -= weights[i] as number;
		if (remaining < 0) return items[i] as T;
	}
	return items[items.length - 1] as T;
}

function isAllowed(sequence: readonly string[], char: string, length: number): boolean {
	const index = sequence.length;
	// Enter ends a line: only at the end of a group, never right after a space.
	if (char === LINE_BREAK) return index === length - 1 && sequence[index - 1] !== SPACE;
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
	settings: Settings,
	relaxed: boolean
): string {
	const { fresh, known, newCharWeight, weakCharBoost, errorRate, rng } = settings;
	const allowed = (pool: readonly string[]) =>
		pool.filter((char) => isAllowed(sequence, char, length));
	const pools = relaxed
		? [allowed([...fresh, ...known])]
		: rng() < newCharWeight
			? [allowed(fresh), allowed(known)]
			: [allowed(known), allowed(fresh)];
	const pool = pools.find((candidate) => candidate.length > 0);
	if (pool === undefined) {
		throw new Error(`Lesson ${settings.lesson.id}: no character can be placed in a group`);
	}
	return pickWeighted(
		pool,
		pool.map((char) => 1 + weakCharBoost * errorRate(char)),
		rng
	);
}

function isValidSequence(sequence: readonly string[]): boolean {
	return sequence.every((char, index) => {
		if (char === LINE_BREAK) {
			return index === sequence.length - 1 && sequence[index - 1] !== SPACE;
		}
		if (char === SPACE) {
			return index > 0 && index < sequence.length - 1 && sequence[index - 1] !== SPACE;
		}
		return !(
			index >= MAX_IDENTICAL_IN_A_ROW &&
			sequence[index - 1] === char &&
			sequence[index - 2] === char
		);
	});
}

export function placeForced(
	natural: readonly string[],
	forced: readonly string[],
	rng: Rng
): string[] | undefined {
	const sequence = [...natural];
	const reserved = new Set<number>();
	for (const char of forced) {
		const index = sequence.indexOf(char);
		if (index >= 0) reserved.add(index);
	}
	const absent = forced.filter((char) => !sequence.includes(char));
	const rank = (char: string) => (char === LINE_BREAK ? 2 : char === SPACE ? 1 : 0);
	absent.sort((a, b) => rank(b) - rank(a));
	const last = sequence.length - 1;
	for (const char of absent) {
		const slots = sequence
			.map((_, index) => index)
			.filter(
				(index) =>
					!reserved.has(index) &&
					(char === LINE_BREAK ? index === last : char !== SPACE || (index > 0 && index < last))
			);
		if (slots.length === 0) return undefined;
		const slot = slots[between(0, slots.length - 1, rng)] as number;
		sequence[slot] = char;
		reserved.add(slot);
	}
	return isValidSequence(sequence) ? sequence : undefined;
}

function buildDrill(forced: readonly string[], settings: Settings, relaxed: boolean): Candidate {
	const { lesson, rng } = settings;
	const [min, max] = lesson.groupLength;
	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
		const length = Math.max(between(min, max, rng), forced.length);
		const natural: string[] = [];
		while (natural.length < length) {
			natural.push(pickChar(natural, length, settings, relaxed));
		}
		const sequence = forced.length === 0 ? natural : placeForced(natural, forced, rng);
		if (sequence !== undefined) return { text: sequence.join('') };
	}
	throw new Error(`Lesson ${lesson.id}: cannot place the new characters in a group`);
}

function remaining(reserve: Reserve): readonly Item[] {
	const unused = reserve.items.filter((item) => !reserve.used.has(item.text));
	if (unused.length > 0) return unused;
	reserve.used.clear();
	return reserve.items;
}

function buildEntry(
	reserve: Reserve,
	preferred: readonly string[],
	settings: Settings,
	room = Number.POSITIVE_INFINITY
): Candidate | undefined {
	const { newCharWeight, rng } = settings;
	const fits = (item: Item) => item.graphemes.length <= room;
	let pool = remaining(reserve).filter(fits);
	if (pool.length === 0) pool = reserve.items.filter(fits);
	if (pool.length === 0) return undefined;
	if (preferred.length > 0) {
		const matching = pool.filter((item) => item.graphemes.some((char) => preferred.includes(char)));
		if (matching.length > 0 && rng() < newCharWeight) pool = matching;
	}
	const item = pickWeighted(
		pool,
		pool.map((candidate) => candidate.weight),
		rng
	);
	return { text: item.text, reserve };
}

function chooseGenre(mix: ExerciseMix, hasWords: boolean, hasPhrases: boolean, rng: Rng): Genre {
	const weights: [Genre, number][] = [
		['drill', mix.drills],
		['word', hasWords ? mix.words : 0],
		['phrase', hasPhrases ? mix.phrases : 0]
	];
	const available = weights.filter(([, weight]) => weight > 0);
	if (available.length === 0) return 'drill';
	return pickWeighted(
		available.map(([genre]) => genre),
		available.map(([, weight]) => weight),
		rng
	);
}

/**
 * The story phrase this exercise ends with, if the lesson has some and its plays so far are a
 * multiple of `storyPhraseEvery`; the lesson's phrases take turns.
 */
function dueStoryPhrase(
	progression: ProgressionDefinition,
	lessonId: string,
	learned: readonly string[],
	context: ExerciseContext
): string | undefined {
	const every = progression.rules.storyPhraseEvery;
	if (every === undefined || context.phrases === undefined) return undefined;
	const known = new Set(learned);
	const phrases = storyPhrases(context.phrases, lessonId).filter((phrase) =>
		toGraphemes(phrase.text).every((char) => known.has(char))
	);
	const plays = context.progress?.lessons[lessonId]?.attempts ?? 0;
	if (phrases.length === 0 || plays % every !== 0) return undefined;
	return phrases[Math.floor(plays / every) % phrases.length]?.text;
}

/**
 * The text this exercise ends with, cut into its groups, if the lesson has texts of the level
 * allowed written with the characters learned there; they take turns, one per play of the lesson.
 */
function dueText(
	progression: ProgressionDefinition,
	lessonId: string,
	learned: readonly string[],
	context: ExerciseContext
): string[] | undefined {
	if (context.texts === undefined) return undefined;
	const known = new Set(learned);
	const maxLevel = context.maxLevel ?? 3;
	const texts = lessonTexts(context.texts, lessonId).filter(
		(entry) =>
			entry.level <= maxLevel && toGraphemes(textOf(entry)).every((char) => known.has(char))
	);
	if (texts.length === 0) return undefined;
	const plays = context.progress?.lessons[lessonId]?.attempts ?? 0;
	const text = texts[plays % texts.length];
	return text === undefined ? undefined : textGroups(text, progression.rules.textGroupLength);
}

export function generateExercise(
	progression: ProgressionDefinition,
	lessonId: string,
	rng: Rng,
	context: ExerciseContext = {}
): Exercise {
	const lesson = findLesson(progression, lessonId);
	if (lesson === undefined) throw new RangeError(`Unknown lesson: ${lessonId}`);

	const learned = learnedChars(progression, lessonId);
	const { newCharWeight, weakCharBoost, themeBoost, newCharMinCount } = progression.rules;
	const { progress } = context;
	const errorRate = (char: string): number =>
		progress === undefined ? 0 : recentErrorRate(progress, char);

	const fresh = freshChars(progression, lessonId);
	const { lengthSlack } = progression.rules;
	const settings: Settings = {
		lesson,
		fresh,
		known: learned.filter((char) => !fresh.includes(char)),
		newCharWeight,
		weakCharBoost,
		errorRate,
		rng
	};

	const toItem = (text: string, themes: readonly string[]): Item => {
		const graphemes = toGraphemes(text);
		const themeFactor =
			1 + (context.themeId !== undefined && themes.includes(context.themeId) ? themeBoost : 0);
		const weakFactor = 1 + weakCharBoost * Math.max(0, ...graphemes.map(errorRate));
		return { text, graphemes, weight: themeFactor * weakFactor };
	};

	const options = { maxLevel: context.maxLevel };
	const wordItems = new Map<string, Item>();
	for (const word of lesson.words) wordItems.set(word, toItem(word, []));
	if (context.words !== undefined) {
		for (const entry of usableWords(context.words, learned, options)) {
			wordItems.set(entry.text, toItem(entry.text, entry.themes));
		}
	}
	const phraseItems = (
		context.phrases === undefined ? [] : usablePhrases(context.phrases, learned, options)
	).map((entry) => toItem(entry.text, entry.themes));
	const words: Reserve = { items: [...wordItems.values()], used: new Set() };
	const phrases: Reserve = { items: phraseItems, used: new Set() };

	// A lesson that asks for words gives at least one, even when long phrases would fill it.
	let owesWord = lesson.mix.words > 0 && words.items.length > 0;

	const buildMixed = (
		missing: readonly string[],
		groupIndex: number,
		length: number,
		relaxed: boolean
	): Candidate => {
		const genre = relaxed
			? 'drill'
			: chooseGenre(lesson.mix, words.items.length > 0, phrases.items.length > 0, rng);
		const room =
			lengthSlack === undefined
				? Number.POSITIVE_INFINITY
				: Math.max(0, lesson.targetLength + lengthSlack - length);
		const candidate =
			(genre === 'drill'
				? undefined
				: buildEntry(
						genre === 'word' ? words : phrases,
						genre === 'word' ? lesson.newChars : fresh,
						settings,
						room
					)) ?? buildDrill([], settings, relaxed);
		const present = toGraphemes(candidate.text);
		const stops =
			groupIndex + 1 >= lesson.groupCount || length + present.length >= lesson.targetLength;
		if (stops && missing.some((char) => !present.includes(char))) {
			return buildDrill(missing, settings, relaxed);
		}
		return stops && owesWord && candidate.reserve !== words
			? (buildEntry(words, lesson.newChars, settings) ?? candidate)
			: candidate;
	};

	/** A mixed group of at most `room` graphemes, different from `previous`, if one can be found. */
	const buildFiller = (room: number, previous: string | undefined): Candidate | undefined => {
		if (room < 1) return undefined;
		for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
			const relaxed = attempt >= RELAXED_AFTER_ATTEMPT;
			const genre = relaxed
				? 'drill'
				: chooseGenre(lesson.mix, words.items.length > 0, phrases.items.length > 0, rng);
			const entry =
				genre === 'drill'
					? undefined
					: buildEntry(
							genre === 'word' ? words : phrases,
							genre === 'word' ? lesson.newChars : fresh,
							settings,
							room
						);
			// A suite is never shorter than the lesson's minimum group length.
			const candidate =
				entry ?? (room >= lesson.groupLength[0] ? buildDrill([], settings, relaxed) : undefined);
			if (
				candidate !== undefined &&
				candidate.text !== previous &&
				toGraphemes(candidate.text).length <= room
			) {
				return candidate;
			}
		}
		return undefined;
	};

	/**
	 * A warm-up group for Enter is a line of a list: a word, else a suite, then Enter. It holds the
	 * other new characters still lacking, if it can.
	 */
	const buildLine = (lacking: readonly string[], relaxed: boolean): Candidate => {
		const others = lacking.filter((char) => char !== LINE_BREAK);
		// The word and its Enter keep to the length of a suite of the lesson.
		const [min, max] = lesson.groupLength;
		const pool = words.items.filter(
			(item) =>
				item.graphemes.length >= min - 1 &&
				item.graphemes.length <= max - 1 &&
				others.every((char) => item.graphemes.includes(char))
		);
		if (pool.length > 0 && !relaxed) {
			const unused = pool.filter((item) => !words.used.has(item.text));
			const choice = unused.length > 0 ? unused : pool;
			const item = pickWeighted(
				choice,
				choice.map((candidate) => candidate.weight),
				rng
			);
			words.used.add(item.text);
			return { text: `${item.text}${LINE_BREAK}` };
		}
		return buildDrill(lacking, settings, relaxed);
	};

	// The end of the exercise: the lesson's text, else its story phrase when one is due.
	const text = dueText(progression, lessonId, learned, context);
	const story =
		text === undefined ? dueStoryPhrase(progression, lessonId, learned, context) : undefined;
	const ending = text ?? (story === undefined ? undefined : [story]);
	// Without a slack, the ending and what comes before it keep to the target length.
	const endingLength =
		ending === undefined ? 0 : ending.reduce((sum, group) => sum + toGraphemes(group).length, 0);
	const endingRoom =
		ending === undefined ? 0 : lesson.targetLength + (lengthSlack ?? 0) - endingLength;
	const groups: string[] = [];
	const asked = new Map<string, number>();
	let total = 0;

	while (groups.length < lesson.groupCount) {
		// Warm-up: suites that hold the new characters open the exercise until each was asked enough.
		const lacking = lesson.newChars.filter((char) => (asked.get(char) ?? 0) < newCharMinCount);
		const previous = groups[groups.length - 1];
		let accepted: Candidate | undefined;

		if (lacking.length === 0 && ending !== undefined) {
			// After the warm-up, mixed groups fill the room left before the text or the story phrase,
			// which ends the exercise whatever its length.
			if (groups.length + ending.length < lesson.groupCount) {
				accepted = buildFiller(endingRoom - total, previous);
			}
			if (accepted === undefined) {
				groups.push(...ending);
				break;
			}
		} else {
			if (lacking.length === 0 && total >= lesson.targetLength) break;
			const missing = lesson.newChars.filter((char) => !asked.has(char));
			for (let attempt = 0; attempt < MAX_ATTEMPTS && accepted === undefined; attempt++) {
				const relaxed = attempt >= RELAXED_AFTER_ATTEMPT;
				const candidate =
					lacking.length === 0
						? buildMixed(missing, groups.length, total, relaxed)
						: lacking.includes(LINE_BREAK)
							? buildLine(lacking, relaxed)
							: buildDrill(lacking, settings, relaxed);
				if (candidate.text !== previous) accepted = candidate;
			}
			if (accepted === undefined) {
				throw new Error(`Lesson ${lessonId}: cannot build two different consecutive groups`);
			}
		}

		accepted.reserve?.used.add(accepted.text);
		if (accepted.reserve === words) owesWord = false;
		groups.push(accepted.text);
		const graphemes = toGraphemes(accepted.text);
		total += graphemes.length;
		for (const grapheme of graphemes) asked.set(grapheme, (asked.get(grapheme) ?? 0) + 1);
	}
	return { lessonId, groups };
}
