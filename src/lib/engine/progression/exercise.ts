import { toGraphemes } from '../graphemes';
import {
	lessonTexts,
	storyPhrases,
	textGroups,
	textOf,
	usablePhraseCuts,
	usableWordCuts
} from './banks';
import { LINE_BREAK, findLesson, freshChars, learnedChars } from './definition';
import { recentErrorRate } from './progress';
import { repairStarts } from './repair';
import { buildPatternSuite } from './suites';
import type {
	DrillPatternRules,
	Exercise,
	ExerciseContext,
	ExerciseMix,
	LessonDefinition,
	ProgressionDefinition,
	Rng
} from './types';
import {
	capitalOf,
	capitalized,
	completedGraphemes,
	coverage,
	isCapital,
	isLetterOrDigit,
	pickPracticeWord,
	weakCharsOf
} from './word-practice';

const SPACE = ' ';
const MAX_ATTEMPTS = 64;
const RELAXED_AFTER_ATTEMPT = 16;
const MAX_IDENTICAL_IN_A_ROW = 2;
/** A character is reviewed by words only when two of them hold it: none comes twice in a row. */
const MIN_REVIEW_WORDS = 2;

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
	/** Words of the lesson or of the bank the group is made of, when it is not one of them alone. */
	readonly madeOf?: readonly string[];
}

interface Settings {
	readonly lesson: LessonDefinition;
	/** New characters a suite may hold: never a capital. */
	readonly fresh: readonly string[];
	/** Known characters a suite may hold: never a capital. */
	readonly known: readonly string[];
	readonly newCharWeight: number;
	readonly weakCharBoost: number;
	readonly errorRate: (char: string) => number;
	readonly rng: Rng;
	readonly patterns: DrillPatternRules | undefined;
	/** A suite holds a letter or a digit as soon as one is known: never marks alone. */
	readonly wantsLetter: boolean;
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

/**
 * A suite: one of the regular shapes of the rules when they have some that fit, else characters
 * drawn one by one. It never holds a capital, and holds a letter or a digit whenever it can.
 */
function buildDrill(forced: readonly string[], settings: Settings, relaxed: boolean): Candidate {
	const { lesson, rng, patterns } = settings;
	if (patterns !== undefined && !relaxed) {
		const text = buildPatternSuite(
			patterns,
			{
				forced,
				fresh: settings.fresh.filter((char) => !forced.includes(char)),
				known: settings.known.filter((char) => !forced.includes(char))
			},
			{
				length: lesson.groupLength,
				newCharWeight: settings.newCharWeight,
				weightOf: (char) => 1 + settings.weakCharBoost * settings.errorRate(char),
				rng
			}
		);
		if (text !== undefined) return { text };
	}
	const [min, max] = lesson.groupLength;
	let marksOnly: string | undefined;
	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
		const length = Math.max(between(min, max, rng), forced.length);
		const natural: string[] = [];
		while (natural.length < length) {
			natural.push(pickChar(natural, length, settings, relaxed));
		}
		const sequence = forced.length === 0 ? natural : placeForced(natural, forced, rng);
		if (sequence === undefined) continue;
		if (!settings.wantsLetter || sequence.some(isLetterOrDigit)) return { text: sequence.join('') };
		marksOnly ??= sequence.join('');
	}
	if (marksOnly !== undefined) return { text: marksOnly };
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
	const phrases = storyPhrases(context.phrases, lessonId, context.ageBand).filter((phrase) =>
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
	const texts = lessonTexts(context.texts, lessonId, context.ageBand).filter(
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
	const known = new Set(learned);
	const { rules } = progression;
	const { newCharWeight, weakCharBoost, themeBoost, newCharMinCount, lengthSlack } = rules;
	const { progress } = context;
	const errorRate = (char: string): number =>
		progress === undefined ? 0 : recentErrorRate(progress, char);

	const fresh = freshChars(progression, lessonId);
	const suiteFresh = fresh.filter((char) => !isCapital(char));
	const suiteKnown = learned.filter((char) => !fresh.includes(char) && !isCapital(char));
	const settings: Settings = {
		lesson,
		fresh: suiteFresh,
		known: suiteKnown,
		newCharWeight,
		weakCharBoost,
		errorRate,
		rng,
		patterns: rules.drillPatterns,
		wantsLetter: [...suiteFresh, ...suiteKnown].some(isLetterOrDigit)
	};

	const toItem = (
		text: string,
		themes: readonly string[],
		graphemes: readonly string[] = toGraphemes(text)
	): Item => {
		const themeFactor =
			1 + (context.themeId !== undefined && themes.includes(context.themeId) ? themeBoost : 0);
		const weakFactor = 1 + weakCharBoost * Math.max(0, ...graphemes.map(errorRate));
		return { text, graphemes, weight: themeFactor * weakFactor };
	};

	const options = { maxLevel: context.maxLevel, ageBand: context.ageBand };
	const wordItems = new Map<string, Item>();
	for (const word of lesson.words) wordItems.set(word, toItem(word, []));
	if (context.words !== undefined) {
		const wordOptions = { ...options, maxWordLength: context.maxWordLength };
		for (const { entry, graphemes } of usableWordCuts(context.words, learned, wordOptions)) {
			wordItems.set(entry.text, toItem(entry.text, entry.themes, graphemes));
		}
	}
	// Once capitals and the mark that ends a sentence are learned, an early phrase gets them.
	const { phraseEnd } = rules;
	const completes = phraseEnd !== undefined && known.has(phraseEnd) && learned.some(isCapital);
	const phraseItems = new Map<string, Item>();
	if (context.phrases !== undefined) {
		for (const { entry, graphemes } of usablePhraseCuts(context.phrases, learned, options)) {
			const typed = completes ? completedGraphemes(graphemes, known, phraseEnd) : graphemes;
			const text = completes ? typed.join('') : entry.text;
			if (!phraseItems.has(text)) phraseItems.set(text, toItem(text, entry.themes, typed));
		}
	}
	const words: Reserve = { items: [...wordItems.values()], used: new Set() };
	const phrases: Reserve = { items: [...phraseItems.values()], used: new Set() };

	// With enough words, a mixed group is never a suite: a suite only stays where no word can do.
	const suiteFree =
		rules.suiteFreeMinWords !== undefined && words.items.length >= rules.suiteFreeMinWords;
	const mix: ExerciseMix = !suiteFree
		? lesson.mix
		: lesson.mix.words + lesson.mix.phrases > 0
			? { ...lesson.mix, drills: 0 }
			: { drills: 0, words: 1, phrases: 0 };

	// A lesson that asks for words gives at least one, even when long phrases would fill it.
	let owesWord = lesson.mix.words > 0 && words.items.length > 0;

	/** A word or a phrase of at most `room` graphemes; a phrase too long gives way to a word. */
	const buildFitting = (genre: Genre, room: number): Candidate | undefined => {
		if (genre === 'drill') return undefined;
		if (genre === 'word') return buildEntry(words, lesson.newChars, settings, room);
		return (
			buildEntry(phrases, fresh, settings, room) ??
			buildEntry(words, lesson.newChars, settings, room)
		);
	};

	const buildMixed = (
		missing: readonly string[],
		groupIndex: number,
		length: number,
		relaxed: boolean
	): Candidate => {
		const genre = relaxed
			? 'drill'
			: chooseGenre(mix, words.items.length > 0, phrases.items.length > 0, rng);
		const room =
			lengthSlack === undefined
				? Number.POSITIVE_INFINITY
				: Math.max(0, lesson.targetLength + lengthSlack - length);
		const candidate =
			buildFitting(genre, room) ??
			// With enough words, even one too long for the room left is better than a suite.
			(suiteFree && genre !== 'drill' ? buildEntry(words, lesson.newChars, settings) : undefined) ??
			buildDrill([], settings, relaxed);
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
				: chooseGenre(mix, words.items.length > 0, phrases.items.length > 0, rng);
			// A suite is never shorter than the lesson's minimum group length.
			const candidate =
				buildFitting(genre, room) ??
				(!suiteFree && room >= lesson.groupLength[0]
					? buildDrill([], settings, relaxed)
					: undefined);
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
	const endingGraphemes = (ending ?? []).flatMap((group) => toGraphemes(group));
	// Without a slack, the ending and what comes before it keep to the target length.
	const endingLength = endingGraphemes.length;
	const endingRoom =
		ending === undefined ? 0 : lesson.targetLength + (lengthSlack ?? 0) - endingLength;
	const groups: string[] = [];
	const asked = new Map<string, number>();
	let total = 0;
	/** Index of the first group of the ending, once it is placed. */
	let endingFrom: number | undefined;
	/** Last word of the last group, when that group is made of words. */
	let lastWord: string | undefined;
	const record = (group: string) => {
		groups.push(group);
		const graphemes = toGraphemes(group);
		total += graphemes.length;
		for (const grapheme of graphemes) asked.set(grapheme, (asked.get(grapheme) ?? 0) + 1);
	};

	// Short words serve the warm-up of a new character and the review of a weak one.
	const { wordWarmUp, weakChars: weakRules } = rules;
	const practicePool =
		wordWarmUp === undefined
			? words.items
			: words.items.filter((item) => item.graphemes.length <= wordWarmUp.maxWordLength);
	const holders = new Map<string, number>();
	for (const item of practicePool) {
		for (const char of new Set(item.graphemes)) holders.set(char, (holders.get(char) ?? 0) + 1);
	}
	const reviewed =
		weakRules === undefined || progress === undefined
			? []
			: weakCharsOf(
					progress,
					learned.filter((char) => (holders.get(char) ?? 0) >= MIN_REVIEW_WORDS),
					weakRules
				);
	const capitalsWanted = lesson.unlocks.includes('uppercase') ? (rules.uppercaseMinCount ?? 0) : 0;
	const endingCapitals = endingGraphemes.filter(isCapital).length;
	const countIn = (list: readonly string[], char: string): number =>
		list.filter((grapheme) => grapheme === char).length;
	/** How much of what still lacks a word brings for its length: short and rich words first. */
	const density = (word: Item, lacking: ReadonlyMap<string, number>): number =>
		coverage(word, lacking) / Math.max(1, word.graphemes.length);
	// A warm-up written by hand asks each new character as much as it must (checked by the parser):
	// nothing is generated after it.
	const minCount = lesson.warmUp === undefined ? newCharMinCount : 0;
	// A warm-up made of words is longer than suites: what the story phrase holds counts for it.
	const countsEnding = wordWarmUp !== undefined && !lesson.newChars.includes(LINE_BREAK);
	const askedOf = (char: string): number =>
		(asked.get(char) ?? 0) + (countsEnding ? countIn(endingGraphemes, char) : 0);

	/**
	 * Warm-up of the new characters still lacking: one word that holds it for each of them (the
	 * richest for its length first), side by side; a suite for those no word holds.
	 */
	const buildWarmUp = (
		lacking: readonly string[],
		previous: string | undefined,
		relaxed: boolean
	): Candidate => {
		if (wordWarmUp === undefined || relaxed) return buildDrill(lacking, settings, relaxed);
		const still = new Map(lacking.map((char) => [char, minCount - askedOf(char)] as const));
		const picked: Item[] = [];
		let last = lastWord;
		for (const char of lacking) {
			if (picked.some((item) => item.graphemes.includes(char))) continue;
			if ((holders.get(char) ?? 0) < wordWarmUp.minWords) continue;
			const item = pickPracticeWord(
				practicePool,
				(word) => (word.graphemes.includes(char) ? density(word, still) : 0),
				{
					used: new Set([...words.used, ...picked.map((word) => word.text)]),
					avoid: [last, previous],
					rng
				}
			);
			if (item === undefined) continue;
			picked.push(item);
			last = item.text;
			for (const grapheme of item.graphemes) {
				const count = still.get(grapheme);
				if (count !== undefined) still.set(grapheme, count - 1);
			}
		}
		const rest = lacking.filter((char) => !picked.some((item) => item.graphemes.includes(char)));
		const pieces = picked.map((item) => item.text);
		if (rest.length > 0) pieces.push(buildDrill(rest, settings, relaxed).text);
		if (picked.length === 0 || (pieces.length > 1 && !known.has(SPACE))) {
			return buildDrill(lacking, settings, relaxed);
		}
		return { text: pieces.join(SPACE), madeOf: picked.map((item) => item.text) };
	};

	/**
	 * Words for what the exercise still owes once the new characters are warmed up: the weak
	 * characters of the child, and the capitals of a lesson that unlocks them. They are put side by
	 * side as much as the groups left require; the ending counts for what it holds.
	 */
	const buildReview = (previous: string | undefined): Candidate | undefined => {
		const slots = lesson.groupCount - groups.length - (ending?.length ?? 0);
		if (slots < 1 || practicePool.length === 0) return undefined;
		const needs = new Map<string, number>();
		if (weakRules !== undefined) {
			for (const char of reviewed) {
				const lack = weakRules.minCount - (asked.get(char) ?? 0) - countIn(endingGraphemes, char);
				if (lack > 0) needs.set(char, lack);
			}
		}
		let capitalsAsked = 0;
		for (const [char, count] of asked) if (isCapital(char)) capitalsAsked += count;
		let capitals = Math.max(0, capitalsWanted - capitalsAsked - endingCapitals);
		const owed = [...needs.values()].reduce((sum, count) => sum + count, 0) + capitals;
		if (owed === 0) return undefined;
		const perGroup = known.has(SPACE) ? Math.ceil(owed / slots) : 1;
		const pieces: string[] = [];
		const picked: string[] = [];
		let last = lastWord;
		while (pieces.length < perGroup && (needs.size > 0 || capitals > 0)) {
			const item = pickPracticeWord(
				practicePool,
				needs.size > 0
					? (word) => density(word, needs)
					: (word) => (capitalOf(word.graphemes[0], known) === undefined ? 0 : 1),
				{ used: new Set([...words.used, ...picked]), avoid: [last, previous], rng }
			);
			if (item === undefined) break;
			const first = item.graphemes[0];
			const upper =
				capitals > 0 && (first === undefined || !needs.has(first))
					? capitalized(item.text, known)
					: undefined;
			if (upper !== undefined) capitals -= 1;
			pieces.push(upper ?? item.text);
			picked.push(item.text);
			last = item.text;
			for (const grapheme of toGraphemes(upper ?? item.text)) {
				const count = needs.get(grapheme);
				if (count === undefined) continue;
				if (count <= 1) needs.delete(grapheme);
				else needs.set(grapheme, count - 1);
			}
		}
		if (pieces.length === 0) return undefined;
		// Two words that take turns would give the same group twice: the second one starts it then.
		const turned =
			pieces.join(SPACE) === previous ? [...pieces.slice(1), ...pieces.slice(0, 1)] : pieces;
		const group = turned.join(SPACE);
		return group === previous ? undefined : { text: group, madeOf: picked };
	};

	// A warm-up written by hand opens the exercise as it is: it already asks every new character
	// enough (checked by the parser), so no warm-up is generated for them.
	for (const group of lesson.warmUp ?? []) record(group);

	while (groups.length < lesson.groupCount) {
		// Warm-up: groups that hold the new characters open the exercise until each was asked enough.
		const lacking = lesson.newChars.filter((char) => askedOf(char) < minCount);
		const previous = groups[groups.length - 1];
		let accepted: Candidate | undefined = lacking.length === 0 ? buildReview(previous) : undefined;

		if (accepted !== undefined) {
			// The review comes right after the warm-up, before anything else.
		} else if (lacking.length === 0 && ending !== undefined) {
			// After the warm-up, mixed groups fill the room left before the text or the story phrase,
			// which ends the exercise whatever its length.
			if (groups.length + ending.length < lesson.groupCount) {
				accepted = buildFiller(endingRoom - total, previous);
			}
			if (accepted === undefined) {
				endingFrom = groups.length;
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
							: buildWarmUp(lacking, previous, relaxed);
				if (candidate.text !== previous) accepted = candidate;
			}
			if (accepted === undefined) {
				throw new Error(`Lesson ${lessonId}: cannot build two different consecutive groups`);
			}
		}

		accepted.reserve?.used.add(accepted.text);
		for (const word of accepted.madeOf ?? []) words.used.add(word);
		if (accepted.reserve === words || (accepted.madeOf ?? []).length > 0) owesWord = false;
		lastWord = accepted.madeOf?.[accepted.madeOf.length - 1];
		record(accepted.text);
	}
	if (lesson.repair === undefined) return { lessonId, groups };
	// The mistakes are planted last, so that the groups are those the lesson would give without them.
	const starts = repairStarts(
		groups,
		endingFrom ?? groups.length,
		lesson.repair,
		learned,
		context.neighbors,
		rng
	);
	return { lessonId, groups, starts };
}
