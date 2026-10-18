import type { SessionMetrics } from '../types';
import { lessonIds } from './definition';
import type {
	CharProgress,
	CharSample,
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
		const sample: CharSample = { attempts: stats.attempts, errors: stats.errors };
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

export function isLessonUnlocked(
	progression: ProgressionDefinition,
	progress: ProgressState,
	lessonId: string
): boolean {
	const ids = lessonIds(progression);
	const index = ids.indexOf(lessonId);
	if (index < 0) return false;
	if (index === 0) return true;
	// A lesson passed once stays open, even when new lessons are later inserted before it.
	return (
		isLessonPassed(progression.rules, progress, ids[index - 1] as string) ||
		isLessonPassed(progression.rules, progress, lessonId)
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
