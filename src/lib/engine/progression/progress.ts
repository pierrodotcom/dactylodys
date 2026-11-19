import type { SessionMetrics } from '../types';
import { isDetour, isTour, learnedChars } from './definition';
import type {
	CharProgress,
	CharSample,
	LessonDefinition,
	LessonEvaluation,
	LessonProgress,
	LessonResult,
	ProgressionDefinition,
	ProgressionRules,
	ProgressState,
	StarCount
} from './types';

/** Absorbs the rounding error of `(correct / total) * 100` at an exact threshold. */
const ACCURACY_EPSILON = 1e-9;

function reaches(accuracy: number, threshold: number): boolean {
	return accuracy + ACCURACY_EPSILON >= threshold;
}

export function emptyProgress(): ProgressState {
	return { lessons: {}, chars: {} };
}

export function evaluateLesson(rules: ProgressionRules, metrics: SessionMetrics): LessonEvaluation {
	const reached = rules.starThresholds.filter((threshold) =>
		reaches(metrics.accuracy, threshold)
	).length;
	return {
		stars: Math.min(reached, 3) as StarCount,
		unlocksNext: reaches(metrics.accuracy, rules.unlockAccuracy)
	};
}

function ownEntry<T>(record: Readonly<Record<string, T>>, key: string): T | undefined {
	return Object.hasOwn(record, key) ? record[key] : undefined;
}

/** The fewest most recent samples that cover the window, or all of them when they do not. */
function coveringWindow(samples: readonly CharSample[], window: number): readonly CharSample[] {
	let covered = 0;
	let start = samples.length;
	while (start > 0 && covered < window) {
		start -= 1;
		covered += (samples[start] as CharSample).attempts;
	}
	return samples.slice(start);
}

/**
 * Adds the per-character results of a play to the progress and keeps only the recent ones that
 * cover `rules.recentCharWindow`. It touches `chars` alone: a help quest uses it without playing a lesson.
 */
export function applyCharResults(
	progress: ProgressState,
	metrics: SessionMetrics,
	rules: ProgressionRules
): ProgressState {
	const chars: Record<string, CharProgress> = { ...progress.chars };
	for (const [char, stats] of Object.entries(metrics.perChar)) {
		const before = ownEntry(progress.chars, char);
		const recent = before?.recent ?? [];
		const sample: CharSample = {
			attempts: stats.attempts,
			errors: stats.errors,
			latencyMs: stats.meanLatencyMs
		};
		chars[char] = {
			attempts: (before?.attempts ?? 0) + stats.attempts,
			errors: (before?.errors ?? 0) + stats.errors,
			recent:
				stats.attempts > 0 ? coveringWindow([...recent, sample], rules.recentCharWindow) : recent
		};
	}
	return { lessons: progress.lessons, chars };
}

export function applyLessonResult(
	progress: ProgressState,
	result: LessonResult,
	rules: ProgressionRules
): ProgressState {
	const previous = ownEntry(progress.lessons, result.lessonId);
	const lesson: LessonProgress = {
		bestAccuracy: Math.max(previous?.bestAccuracy ?? 0, result.metrics.accuracy),
		stars: Math.max(previous?.stars ?? 0, result.evaluation.stars) as StarCount,
		attempts: (previous?.attempts ?? 0) + 1,
		lastPlayedAt: result.completedAt
	};
	const { chars } = applyCharResults(progress, result.metrics, rules);
	return { lessons: { ...progress.lessons, [result.lessonId]: lesson }, chars };
}

/** What the character did in its most recent plays only; zeros when it was never typed. */
export function recentCharStats(
	progress: ProgressState,
	char: string
): { readonly attempts: number; readonly errors: number } {
	let attempts = 0;
	let errors = 0;
	for (const sample of ownEntry(progress.chars, char)?.recent ?? []) {
		attempts += sample.attempts;
		errors += sample.errors;
	}
	return { attempts, errors };
}

/**
 * Mean milliseconds before the right keystrokes of the character in its most recent plays,
 * weighted by the right keystrokes of each play; samples without a time are left out, and
 * `correct` counts the right keystrokes of those that have one. `null` when none has.
 */
export function recentCharLatency(
	progress: ProgressState,
	char: string
): { readonly latencyMs: number | null; readonly correct: number } {
	let correct = 0;
	let weighted = 0;
	for (const sample of ownEntry(progress.chars, char)?.recent ?? []) {
		if (sample.latencyMs === null) continue;
		const right = sample.attempts - sample.errors;
		if (right <= 0) continue;
		correct += right;
		weighted += sample.latencyMs * right;
	}
	return { latencyMs: correct > 0 ? weighted / correct : null, correct };
}

/** Share (0 to 1) of the recent keystrokes of the character that were wrong; 0 without any. */
export function recentErrorRate(progress: ProgressState, char: string): number {
	const { attempts, errors } = recentCharStats(progress, char);
	if (attempts <= 0) return 0;
	return Math.min(1, Math.max(0, errors / attempts));
}

/** A lesson is passed once its best accuracy has reached the one that opens the next lesson. */
export function isLessonPassed(
	rules: ProgressionRules,
	progress: ProgressState,
	lessonId: string
): boolean {
	const lesson = ownEntry(progress.lessons, lessonId);
	return lesson !== undefined && reaches(lesson.bestAccuracy, rules.unlockAccuracy);
}

/**
 * The first lesson is always open. A lesson on the way opens once the lesson on the way before it
 * is passed: a detour (`LessonDefinition.optional`) never holds the way. A detour opens once the
 * lesson just before it is passed (a grand tour before it aside). A lesson passed further on opens
 * the whole way up to it: nothing is to play again to go on, whatever order the lessons were in
 * when the child passed them. A grand tour (`LessonDefinition.tour`) opens once the last lesson on
 * the way of its world is passed, whatever its detours and whatever is passed further on: it goes
 * over a world the child went through; once passed, it stays open.
 *
 * A world that the adult opened ahead (`openedWorldIds`) has its first lesson open, and only that
 * one; `keptOpenLessonIds` are the lessons that were open when the order of the lessons changed
 * (`Profile.keptOpenLessonIds`): they stay open. Identifiers the progression does not have are
 * ignored.
 */
export function isLessonUnlocked(
	progression: ProgressionDefinition,
	progress: ProgressState,
	lessonId: string,
	openedWorldIds: readonly string[] = [],
	keptOpenLessonIds: readonly string[] = []
): boolean {
	const lessons = progression.worlds.flatMap((world) => world.lessons);
	const index = lessons.findIndex((lesson) => lesson.id === lessonId);
	if (index < 0) return false;
	if (index === 0) return true;
	if (opensWorld(progression, lessonId, openedWorldIds)) return true;
	if (keptOpenLessonIds.includes(lessonId)) return true;
	const passed = (lesson: LessonDefinition | undefined) =>
		lesson !== undefined && isLessonPassed(progression.rules, progress, lesson.id);
	const lesson = lessons[index] as LessonDefinition;
	const lastOnTheWay = lessons.slice(0, index).findLast((candidate) => !isDetour(candidate));
	// A grand tour goes over a world the child went through: its way passed, or the tour itself.
	if (isTour(lesson)) return passed(lesson) || passed(lastOnTheWay);
	// The lesson before, a grand tour aside: a tour added at the end of a world changes nothing after it.
	if (passed(lessons.slice(0, index).findLast((candidate) => !isTour(candidate)))) return true;
	// The lesson itself, or one further on: a lesson passed once stays open, and so does the way to it.
	if (lessons.slice(index).some(passed)) return true;
	if (isDetour(lesson)) return false;
	return passed(lastOnTheWay);
}

/**
 * What the detours before this lesson brought to this child: the characters of those the child
 * passed, in the order of the progression, that `learnedChars` does not already hold. An exercise
 * of the lesson may ask them of this child, and of no other.
 */
export function detourChars(
	progression: ProgressionDefinition,
	progress: ProgressState,
	lessonId: string
): string[] {
	const known = new Set(learnedChars(progression, lessonId));
	const chars: string[] = [];
	for (const world of progression.worlds) {
		for (const lesson of world.lessons) {
			if (lesson.id === lessonId) return chars;
			if (!isDetour(lesson) || !isLessonPassed(progression.rules, progress, lesson.id)) continue;
			chars.push(...lesson.newChars.filter((char) => !known.has(char)));
		}
	}
	return chars;
}

/** Whether the lesson is the first one of a world the adult opened. */
function opensWorld(
	progression: ProgressionDefinition,
	lessonId: string,
	openedWorldIds: readonly string[]
): boolean {
	return progression.worlds.some(
		(world) => openedWorldIds.includes(world.id) && world.lessons[0]?.id === lessonId
	);
}

/**
 * Whether a result stopped just short of the next star: fewer than three stars, and within
 * `starAlmostMargin` points of the threshold of the next one.
 */
export function almostNextStar(
	rules: ProgressionRules,
	accuracy: number,
	stars: StarCount
): boolean {
	const margin = rules.starAlmostMargin;
	if (margin === undefined || stars === 3) return false;
	const next = rules.starThresholds[stars];
	return next !== undefined && accuracy < next && accuracy >= next - margin;
}
