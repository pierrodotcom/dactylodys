import { toGraphemes } from '../graphemes';
import { usablePhraseCuts, usableWordCuts } from './banks';
import { findLesson, isDetour, learnedChars, LINE_BREAK } from './definition';
import { charMastery } from './mastery';
import { pacedTargetLength } from './pace';
import { detourChars, emptyProgress, isLessonPassed } from './progress';
import type {
	Exercise,
	ExerciseContext,
	LessonDefinition,
	ProgressionDefinition,
	ProgressionRules,
	ProgressState,
	Rng,
	TourRules
} from './types';
import { completedGraphemes, isCapital, isLetterOrDigit, weakCharsOf } from './word-practice';

/*
 * The exercise of a grand tour (ADR-075, choice 3): words and phrases only, never a suite. It goes
 * over the keys of its world in rounds: in each round, a key is asked as many times as it weighs
 * for this child (`TourRules.keyWeights`, by how well it is mastered lately), so that a key the
 * child types badly comes back more often, and a child who masters them all gets the same share of
 * each. Like every play, it first reviews the weakest keys of the child (`rules.weakChars`), holds
 * a whole phrase once one can be written, and grows with the pace of the child (`pacedTargetLength`).
 */

const SPACE = ' ';
/** A key is reviewed by words only when two of them hold it, as in every play. */
const MIN_REVIEW_WORDS = 2;
/** Times a word may come in one exercise, as in every play that grows. */
const MAX_SAME_WORD = 2;
/** Graphemes from which a word counts for that: shorter ones (`le`, `de`, `un`) come back anyway. */
const MIN_COUNTED_WORD_LENGTH = 4;
/** What is not a letter nor a digit at the start or the end of a word of a group. */
const EDGE_MARKS_PATTERN = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

interface Entry {
	readonly text: string;
	readonly graphemes: readonly string[];
	/** How many times each grapheme is in it. */
	readonly counts: ReadonlyMap<string, number>;
	/** Its words as the banks write them, those long enough to tire when they come back. */
	readonly counted: readonly string[];
	/** How much more it is preferred for holding the theme of the world (`rules.themeBoost`). */
	readonly theme: number;
}

/** Counts and words of a text, kept as long as the module lives: the banks are read every play. */
const shapes = new Map<string, Pick<Entry, 'counts' | 'counted'>>();

function shapeOf(text: string, graphemes: readonly string[]): Pick<Entry, 'counts' | 'counted'> {
	let shape = shapes.get(text);
	if (shape === undefined) {
		const counts = new Map<string, number>();
		for (const grapheme of graphemes) counts.set(grapheme, (counts.get(grapheme) ?? 0) + 1);
		const counted = text
			.split(/\s+/u)
			.map((token) => token.toLowerCase().replace(EDGE_MARKS_PATTERN, ''))
			.filter((word) => toGraphemes(word).length >= MIN_COUNTED_WORD_LENGTH);
		shape = { counts, counted };
		shapes.set(text, shape);
	}
	return shape;
}

function entryOf(text: string, graphemes: readonly string[], theme: number): Entry {
	return { text, graphemes, theme, ...shapeOf(text, graphemes) };
}

/** A whole phrase: several words, a capital first, a mark last. */
function isWhole(graphemes: readonly string[]): boolean {
	const first = graphemes[0];
	const last = graphemes[graphemes.length - 1];
	return (
		first !== undefined &&
		last !== undefined &&
		isCapital(first) &&
		graphemes.includes(SPACE) &&
		last !== LINE_BREAK &&
		!isLetterOrDigit(last)
	);
}

function pickWeighted<T>(items: readonly T[], weights: readonly number[], rng: Rng): T | undefined {
	if (items.length === 0) return undefined;
	const total = weights.reduce((sum, weight) => sum + weight, 0);
	if (total <= 0) return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
	let remaining = rng() * total;
	for (let i = 0; i < items.length; i++) {
		remaining -= weights[i] as number;
		if (remaining < 0) return items[i];
	}
	return items[items.length - 1];
}

/**
 * The keys a grand tour goes over for this child, in their order: the new characters of the
 * lessons of its world, those of the detours of that world only once the child passed them. None
 * for a lesson that is not a tour.
 */
export function tourKeys(
	progression: ProgressionDefinition,
	progress: ProgressState,
	lessonId: string
): string[] {
	const worldId = findLesson(progression, lessonId)?.tour?.worldId;
	const world = progression.worlds.find((candidate) => candidate.id === worldId);
	if (world === undefined) return [];
	const keys: string[] = [];
	for (const lesson of world.lessons) {
		if (isDetour(lesson) && !isLessonPassed(progression.rules, progress, lesson.id)) continue;
		for (const char of lesson.newChars) if (!keys.includes(char)) keys.push(char);
	}
	return keys;
}

/**
 * How many times a key is asked in one round of a tour for this child: the weight of how well it
 * is mastered lately (`charMastery`, a key never typed counting as one being learned). 1 without
 * rules for tours or for mastery.
 */
export function tourKeyWeight(
	rules: ProgressionRules,
	progress: ProgressState,
	char: string
): number {
	const { tour, keyboardFade } = rules;
	if (tour === undefined || keyboardFade === undefined) return 1;
	const mastery = charMastery(progress, char, keyboardFade);
	return tour.keyWeights[mastery === 'new' ? 'learning' : mastery];
}

/**
 * The warm-ups written by hand for the lessons of the world of a tour, their reserves included
 * (`LessonDefinition.warmUp`): a mark in its place (« Qui ? Moi ! », « Tic-tac : midi »), which
 * phrases of the bank seldom hold. Those this child can type only.
 */
export function writtenGroupsOf(
	progression: ProgressionDefinition,
	lesson: LessonDefinition,
	learned: Iterable<string>
): string[] {
	const known = new Set(learned);
	const world = progression.worlds.find((candidate) => candidate.id === lesson.tour?.worldId);
	const written = (world?.lessons ?? []).flatMap((other) => [
		...(other.warmUp ?? []),
		...(other.warmUpReserve?.alternatives ?? []).flat()
	]);
	return [...new Set(written)].filter((group) =>
		toGraphemes(group).every((char) => known.has(char))
	);
}

/**
 * What a tour may type: its words picked by hand and the bank's, the bank's phrases and the
 * warm-ups written for its world (`writtenGroupsOf`), typed as phrases; `wholes`: the phrases of
 * the bank only, a whole phrase being a sentence.
 */
function entriesOf(
	progression: ProgressionDefinition,
	lesson: LessonDefinition,
	learned: readonly string[],
	context: ExerciseContext
): {
	readonly words: readonly Entry[];
	readonly phrases: readonly Entry[];
	readonly wholes: readonly Entry[];
} {
	const { rules } = progression;
	const known = new Set(learned);
	const themeOf = (themes: readonly string[]): number =>
		1 + (context.themeId !== undefined && themes.includes(context.themeId) ? rules.themeBoost : 0);

	const words = new Map<string, Entry>();
	for (const text of lesson.words) words.set(text, entryOf(text, toGraphemes(text), 1));
	const options = { maxLevel: context.maxLevel, ageBand: context.ageBand };
	if (context.words !== undefined) {
		const wordOptions = { ...options, maxWordLength: context.maxWordLength };
		for (const { entry, graphemes } of usableWordCuts(context.words, learned, wordOptions)) {
			words.set(entry.text, entryOf(entry.text, graphemes, themeOf(entry.themes)));
		}
	}

	// Once capitals and the mark that ends a sentence are learned, a phrase gets them.
	const { phraseEnd } = rules;
	const completes = phraseEnd !== undefined && known.has(phraseEnd) && learned.some(isCapital);
	const phrases = new Map<string, Entry>();
	if (context.phrases !== undefined) {
		for (const { entry, graphemes } of usablePhraseCuts(context.phrases, learned, options)) {
			const typed = completes ? completedGraphemes(graphemes, known, phraseEnd) : graphemes;
			const text = completes ? typed.join('') : entry.text;
			if (!phrases.has(text)) phrases.set(text, entryOf(text, typed, themeOf(entry.themes)));
		}
	}
	const wholes = [...phrases.values()].filter((entry) => isWhole(entry.graphemes));
	for (const text of writtenGroupsOf(progression, lesson, learned)) {
		if (!phrases.has(text)) phrases.set(text, entryOf(text, toGraphemes(text), 1));
	}
	return { words: [...words.values()], phrases: [...phrases.values()], wholes };
}

/** What each key still lacks, and how much each of them weighs when an entry is scored. */
interface Needs {
	readonly lacking: Map<string, number>;
	readonly weights: ReadonlyMap<string, number>;
}

/**
 * What an entry brings to what is lacking, once `pending` (the words already drawn for the group)
 * is counted, for its length: the heavier keys first.
 */
function scoreOf(entry: Entry, { lacking, weights }: Needs, pending: ReadonlyMap<string, number>) {
	let value = 0;
	for (const [char, need] of lacking) {
		const left = need - (pending.get(char) ?? 0);
		if (left <= 0) continue;
		const held = entry.counts.get(char) ?? 0;
		if (held > 0) value += Math.min(held, left) * (weights.get(char) ?? 1);
	}
	return (value * entry.theme) / Math.max(1, entry.graphemes.length);
}

function take(entry: Entry, needs: Needs): void {
	for (const [char, held] of entry.counts) {
		const need = needs.lacking.get(char);
		if (need !== undefined) needs.lacking.set(char, need - held);
	}
}

function lacks(needs: Needs): boolean {
	return [...needs.lacking.values()].some((need) => need > 0);
}

function countsOf(entries: readonly Entry[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const entry of entries) {
		for (const [char, held] of entry.counts) counts.set(char, (counts.get(char) ?? 0) + held);
	}
	return counts;
}

/**
 * The exercise of a grand tour (`LessonDefinition.tour`) for this child: groups of words of the
 * tour and of the bank, or phrases, every one written with what the child knows there (the
 * detours it passed included), of its age group and level. The weak keys of the child come first,
 * as in every play; then rounds over the keys of the world, among the entries that score near the
 * best (`TourRules.scoreShare`), none twice while another one can do and no long word a third
 * time. It holds at least `TourRules.minWorldKeystrokes` keystrokes of these keys when the lesson
 * leaves room for them, a whole phrase once one can be written, and grows with the pace of the
 * child like any play, by groups added after those a beginner gets. The same seed and the same
 * progress give the same exercise.
 */
export function generateTourExercise(
	progression: ProgressionDefinition,
	lesson: LessonDefinition,
	rng: Rng,
	context: ExerciseContext = {}
): Exercise {
	const { rules } = progression;
	const tourRules: TourRules | undefined = rules.tour;
	if (lesson.tour === undefined || tourRules === undefined) {
		throw new RangeError(`Lesson ${lesson.id}: not a grand tour`);
	}
	const progress = context.progress ?? emptyProgress();
	const learned = [
		...learnedChars(progression, lesson.id),
		...detourChars(progression, progress, lesson.id)
	];
	const known = new Set(learned);
	const keys = tourKeys(progression, progress, lesson.id).filter((char) => known.has(char));
	const weights = new Map(keys.map((char) => [char, tourKeyWeight(rules, progress, char)]));
	const round: Needs = { lacking: new Map(weights), weights };
	const { words, phrases, wholes } = entriesOf(progression, lesson, learned, context);
	if (words.length === 0 && phrases.length === 0) {
		throw new Error(`Lesson ${lesson.id}: no word nor phrase to make a tour of`);
	}
	const slack = rules.lengthSlack ?? 0;
	const wordsPerGroup = known.has(SPACE) ? (rules.extraWordsPerGroup ?? 1) : 1;

	// The weakest keys of the child, wherever they were learned (`rules.weakChars`, audit P-08).
	const shortest = rules.wordWarmUp?.maxWordLength ?? Number.POSITIVE_INFINITY;
	const short = words.filter((entry) => entry.graphemes.length <= shortest);
	const holders = new Map<string, number>();
	for (const entry of short) {
		for (const char of entry.counts.keys()) holders.set(char, (holders.get(char) ?? 0) + 1);
	}
	const weakRules = rules.weakChars;
	const reviewed =
		weakRules === undefined || context.progress === undefined
			? []
			: weakCharsOf(
					progress,
					learned.filter((char) => (holders.get(char) ?? 0) >= MIN_REVIEW_WORDS),
					weakRules
				);
	const owed: Needs = {
		lacking: new Map(reviewed.map((char) => [char, weakRules?.minCount ?? 0])),
		weights: new Map(reviewed.map((char) => [char, 1]))
	};

	const groups: string[] = [];
	const used = new Set<string>();
	const seen = new Map<string, number>();
	let length = 0;
	let strokes = 0;

	/** Whether typing the entry would bring one of its long words a third time. */
	const tires = (entry: Entry) =>
		entry.counted.some(
			(word) =>
				(seen.get(word) ?? 0) + entry.counted.filter((other) => other === word).length >
				MAX_SAME_WORD
		);

	interface Scored {
		readonly entry: Entry;
		readonly score: number;
	}

	/**
	 * The entries of `pool` that fit `room` and bring something to `needs` once `pending` is
	 * counted: those not typed yet when there are some, else those already typed.
	 */
	const usefulIn = (
		pool: readonly Entry[],
		room: number,
		avoid: ReadonlySet<string>,
		needs: Needs,
		pending: readonly Entry[]
	): Scored[] => {
		const counted = countsOf(pending);
		const useful = pool
			.filter((entry) => entry.graphemes.length <= room && !avoid.has(entry.text) && !tires(entry))
			.map((entry) => ({ entry, score: scoreOf(entry, needs, counted) }))
			.filter((item) => item.score > 0);
		const fresh = useful.filter((item) => !used.has(item.entry.text));
		return fresh.length > 0 ? fresh : useful;
	};

	/**
	 * A key of the round still lacking once `pending` is counted, among those `candidates` hold:
	 * the more it lacks, the more often (a weak key lacks more), so that a key few entries hold gets
	 * its share too.
	 */
	const targetOf = (candidates: readonly Scored[], pending: readonly Entry[]) => {
		const counted = countsOf(pending);
		const reachable = [...round.lacking]
			.map(([char, need]) => [char, need - (counted.get(char) ?? 0)] as const)
			.filter(([char, left]) => left > 0 && candidates.some((item) => item.entry.counts.has(char)));
		return pickWeighted(
			reachable.map(([char]) => char),
			reachable.map(([, left]) => left),
			rng
		);
	};

	/** One of `candidates`, near the best (`TourRules.scoreShare`), the better the more often. */
	const pickAmong = (candidates: readonly Scored[]): Entry | undefined => {
		if (candidates.length === 0) return undefined;
		const best = Math.max(...candidates.map((item) => item.score));
		const finalists = candidates.filter((item) => item.score >= best * tourRules.scoreShare);
		return pickWeighted(
			finalists.map((item) => item.entry),
			finalists.map((item) => item.score),
			rng
		);
	};

	/**
	 * The entry to type next among those of `pool` that fit `room`, near the best for `needs` once
	 * `pending` is counted; nothing when no entry brings anything to them. For the round of the
	 * world, among those that hold `target`, else a key drawn by `targetOf`.
	 */
	const draw = (
		pool: readonly Entry[],
		room: number,
		avoid: ReadonlySet<string>,
		needs: Needs,
		pending: readonly Entry[] = [],
		target?: string
	): Entry | undefined => {
		const candidates = usefulIn(pool, room, avoid, needs, pending);
		if (needs !== round) return pickAmong(candidates);
		const key = target ?? targetOf(candidates, pending);
		return pickAmong(
			key === undefined ? candidates : candidates.filter((item) => item.entry.counts.has(key))
		);
	};

	/** Any entry of `pool` that fits, one not typed yet first: when no entry brings anything. */
	const drawAny = (pool: readonly Entry[], room: number, avoid: ReadonlySet<string>) => {
		const fitting = pool.filter(
			(entry) => entry.graphemes.length <= room && !avoid.has(entry.text) && !tires(entry)
		);
		const fresh = fitting.filter((entry) => !used.has(entry.text));
		return pickWeighted(fresh.length > 0 ? fresh : fitting, [], rng);
	};

	/** Entries typed one after the other in a group: each one counts for what is still lacking. */
	const record = (pieces: readonly Entry[]) => {
		for (const piece of pieces) {
			used.add(piece.text);
			for (const word of piece.counted) seen.set(word, (seen.get(word) ?? 0) + 1);
			for (const [char, held] of piece.counts) if (weights.has(char)) strokes += held;
			take(piece, round);
			take(piece, owed);
		}
		const group = pieces.map((piece) => piece.text).join(SPACE);
		groups.push(group);
		length += toGraphemes(group).length;
	};

	/**
	 * Up to `count` words side by side within `room`, each drawn for what the ones before left, the
	 * first one holding `target` when it is given; in the round of the world, the words after the
	 * first one may bring nothing new.
	 */
	const wordsGroup = (count: number, room: number, needs: Needs, target?: string): Entry[] => {
		const pool = needs === owed ? short : words;
		const pieces: Entry[] = [];
		let left = room;
		while (pieces.length < count) {
			const avoid = new Set([...groups.slice(-1), ...pieces.map((piece) => piece.text)]);
			const word =
				draw(pool, left, avoid, needs, pieces, pieces.length === 0 ? target : undefined) ??
				(needs === round && pieces.length > 0 ? drawAny(pool, left, avoid) : undefined);
			if (word === undefined) break;
			pieces.push(word);
			left -= word.graphemes.length + 1;
		}
		// Two words side by side never give the group just typed: the second one starts it then.
		const joined = (list: readonly Entry[]) => list.map((piece) => piece.text).join(SPACE);
		if (joined(pieces) !== groups.at(-1)) return pieces;
		const turned = [...pieces.slice(1), ...pieces.slice(0, 1)];
		return joined(turned) === groups.at(-1) ? [] : turned;
	};

	type Genre = 'word' | 'phrase';
	const isOpen = (genre: Genre, room: number) =>
		(genre === 'word' ? lesson.mix.words : lesson.mix.phrases) > 0 &&
		(genre === 'word' ? words : phrases).some((entry) => entry.graphemes.length <= room);

	/**
	 * The next group of the round of the world: a key still lacking is drawn (`targetOf`), then a
	 * phrase or `count` words that hold it, the genre drawn by the mix of the lesson weighed by what
	 * the best entry of each genre brings. A new round when no entry brings anything to the one under
	 * way; any entry that fits when even that brings nothing.
	 */
	const nextGroup = (count: number, room: number): Entry[] => {
		const genres = (['word', 'phrase'] as const).filter((genre) => isOpen(genre, room));
		const last = new Set(groups.slice(-1));
		const mixOf = (genre: Genre) => (genre === 'word' ? lesson.mix.words : lesson.mix.phrases);
		const attempt = (): Entry[] => {
			const lists = genres.map((genre) =>
				usefulIn(genre === 'word' ? words : phrases, room, last, round, [])
			);
			const target = targetOf(lists.flat(), []);
			if (target === undefined) return [];
			const holding = lists.map((list) => list.filter((item) => item.entry.counts.has(target)));
			const genre = pickWeighted(
				genres,
				holding.map((list, i) =>
					list.length === 0
						? 0
						: mixOf(genres[i] as Genre) * Math.max(...list.map((item) => item.score))
				),
				rng
			);
			if (genre === undefined) return [];
			if (genre === 'word') return wordsGroup(count, room, round, target);
			const phrase = pickAmong(holding[genres.indexOf(genre)] ?? []);
			return phrase === undefined ? [] : [phrase];
		};
		let pieces = attempt();
		if (pieces.length === 0) {
			// Every key had its share of the round, or those left cannot be had: a new round.
			for (const [char, weight] of weights) round.lacking.set(char, weight);
			pieces = attempt();
		}
		if (pieces.length > 0) return pieces;
		const drawn = pickWeighted(genres, genres.map(mixOf), rng);
		const any =
			drawn === undefined ? undefined : drawAny(drawn === 'phrase' ? phrases : words, room, last);
		return any === undefined ? [] : [any];
	};

	// First the weak keys of the child, by short words side by side as the groups left require:
	// every play reviews them, whatever the length it takes.
	while (lacks(owed) && groups.length < lesson.groupCount) {
		const slots = lesson.groupCount - groups.length;
		const owing = [...owed.lacking.values()].reduce((sum, need) => sum + Math.max(0, need), 0);
		const count = known.has(SPACE) ? Math.max(wordsPerGroup, Math.ceil(owing / slots)) : 1;
		const pieces = wordsGroup(count, Number.POSITIVE_INFINITY, owed);
		if (pieces.length === 0) break;
		record(pieces);
	}

	// Once whole phrases can be written, a tour whose mix has phrases holds one, like any play.
	const wholeWanted =
		lesson.mix.phrases > 0 && wholes.length > 0 ? (rules.wholePhraseMinCount ?? 0) : 0;
	const wholeTexts = new Set(wholes.map((entry) => entry.text));
	let whole = groups.filter((group) => wholeTexts.has(group)).length;

	// Then the keys of the world, round after round, one entry a group as in its other lessons. The
	// whole phrase owed comes last: room and a group are kept for one that holds a key of the world.
	const base = lesson.targetLength + slack;
	const holdingKey = wholes.filter((entry) => keys.some((char) => entry.counts.has(char)));
	const finals = holdingKey.length > 0 ? holdingKey : wholes;
	const shortestFinal = Math.min(...finals.map((entry) => entry.graphemes.length));
	const kept = () => (whole < wholeWanted ? { room: shortestFinal + 1, groups: 1 } : null);
	while (
		groups.length < lesson.groupCount - (kept()?.groups ?? 0) &&
		(length < lesson.targetLength || strokes < tourRules.minWorldKeystrokes)
	) {
		const room = base - length - (kept()?.room ?? 0);
		if (room <= 0) break;
		const pieces = nextGroup(1, room);
		if (pieces.length === 0) break;
		if (pieces.some((piece) => wholeTexts.has(piece.text))) whole += 1;
		record(pieces);
	}
	while (whole < wholeWanted && groups.length < (rules.maxGroupCount ?? lesson.groupCount)) {
		// Any of those that fit, for variety: a whole phrase is long, its keys are few anyway.
		const phrase = drawAny(
			finals,
			Math.max(base - length, shortestFinal),
			new Set(groups.slice(-1))
		);
		if (phrase === undefined) break;
		record([phrase]);
		whole += 1;
	}
	// Keys are drawn by what they lack: the groups then come in a drawn order, so that two tours
	// seldom open alike; never the same group twice in a row, else in the order drawn.
	const drawnOrder = [...groups];
	for (let i = groups.length - 1; i > 0; i--) {
		const j = Math.min(i, Math.floor(rng() * (i + 1)));
		[groups[i], groups[j]] = [groups[j] as string, groups[i] as string];
	}
	if (groups.some((group, i) => group === groups[i - 1])) {
		groups.splice(0, groups.length, ...drawnOrder);
	}

	// A child whose pace is known gets more groups after those, words side by side or phrases. They
	// come one after the other whatever the length aimed at, so that a faster pace only adds some.
	const aimed = pacedTargetLength(rules, lesson, context.paces);
	const maxGroups = Math.max(lesson.groupCount, rules.maxGroupCount ?? lesson.groupCount);
	const ceiling = (rules.maxTargetLength ?? aimed) + slack;
	while (aimed > lesson.targetLength && length < aimed && groups.length < maxGroups) {
		const pieces = nextGroup(wordsPerGroup, ceiling - length);
		if (pieces.length === 0) break;
		record(pieces);
	}
	return { lessonId: lesson.id, groups };
}
