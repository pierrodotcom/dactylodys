import { describe, expect, it } from 'vitest';
import { applyLessonResult, emptyProgress } from '$lib/engine/progression/progress';
import { lessonIds } from '$lib/engine/progression/definition';
import { loadShippedProgressions } from '$lib/engine/progression/test-support';
import type { ProgressState, StarCount } from '$lib/engine/progression/types';
import type { SessionMetrics } from '$lib/engine/types';
import { lessonStars, lessonStatus, nextLessonId } from './map';

const [{ progression }] = loadShippedProgressions() as [
	ReturnType<typeof loadShippedProgressions>[number]
];
const IDS = lessonIds(progression);

function metrics(accuracy: number): SessionMetrics {
	return {
		elapsedMs: 1000,
		totalKeystrokes: 100,
		correctKeystrokes: accuracy,
		errorCount: 100 - accuracy,
		accuracy,
		correctCharsPerMinute: 0,
		wordsPerMinute: 0,
		perChar: {}
	};
}

function played(progress: ProgressState, lessonId: string, accuracy: number, stars: StarCount) {
	return applyLessonResult(progress, {
		lessonId,
		metrics: metrics(accuracy),
		evaluation: { stars, unlocksNext: accuracy >= progression.rules.unlockAccuracy },
		completedAt: 1
	});
}

describe('lessonStatus', () => {
	it('opens the first lesson and closes the others for a new player', () => {
		const statuses = IDS.map((id) => lessonStatus(progression, emptyProgress(), id));

		expect(statuses[0]).toBe('current');
		expect(statuses.slice(1).every((status) => status === 'locked')).toBe(true);
	});

	it('marks a passed lesson as done and opens the next one', () => {
		const progress = played(emptyProgress(), IDS[0] as string, 100, 3);

		expect(lessonStatus(progression, progress, IDS[0] as string)).toBe('done');
		expect(lessonStatus(progression, progress, IDS[1] as string)).toBe('current');
		expect(lessonStatus(progression, progress, IDS[2] as string)).toBe('locked');
	});

	it('keeps a lesson open, not done, when it was played below the unlock accuracy', () => {
		const progress = played(emptyProgress(), IDS[0] as string, 40, 0);

		expect(lessonStatus(progression, progress, IDS[0] as string)).toBe('current');
		expect(lessonStatus(progression, progress, IDS[1] as string)).toBe('locked');
	});

	it('treats the exact unlock accuracy as passed', () => {
		const progress = played(emptyProgress(), IDS[0] as string, progression.rules.unlockAccuracy, 1);

		expect(lessonStatus(progression, progress, IDS[0] as string)).toBe('done');
	});
});

describe('lessonStars', () => {
	it('returns the best stars of a lesson, zero when never played', () => {
		const progress = played(emptyProgress(), IDS[0] as string, 100, 3);

		expect(lessonStars(progress, IDS[0] as string)).toBe(3);
		expect(lessonStars(progress, IDS[1] as string)).toBe(0);
	});
});

describe('nextLessonId', () => {
	it('returns the lesson that follows, null after the last one or for an unknown lesson', () => {
		expect(nextLessonId(progression, IDS[0] as string)).toBe(IDS[1]);
		expect(nextLessonId(progression, IDS[IDS.length - 1] as string)).toBeNull();
		expect(nextLessonId(progression, 'fr.lesson.unknown')).toBeNull();
	});
});
