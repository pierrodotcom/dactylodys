import type { SessionMetrics } from '../types';
import { lessonIds } from './definition';
import type {
	CharProgress,
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

export function applyLessonResult(progress: ProgressState, result: LessonResult): ProgressState {
	const previous = ownEntry(progress.lessons, result.lessonId);
	const lesson: LessonProgress = {
		bestAccuracy: Math.max(previous?.bestAccuracy ?? 0, result.metrics.accuracy),
		stars: Math.max(previous?.stars ?? 0, result.evaluation.stars) as StarCount,
		attempts: (previous?.attempts ?? 0) + 1,
		lastPlayedAt: result.completedAt
	};

	const chars: Record<string, CharProgress> = { ...progress.chars };
	for (const [char, stats] of Object.entries(result.metrics.perChar)) {
		const before = ownEntry(progress.chars, char);
		chars[char] = {
			attempts: (before?.attempts ?? 0) + stats.attempts,
			errors: (before?.errors ?? 0) + stats.errors
		};
	}

	return { lessons: { ...progress.lessons, [result.lessonId]: lesson }, chars };
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
	const previousId = ids[index - 1] as string;
	const previous = ownEntry(progress.lessons, previousId);
	return previous !== undefined && reaches(previous.bestAccuracy, progression.rules.unlockAccuracy);
}
