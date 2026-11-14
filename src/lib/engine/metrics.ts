import { computeAccuracy } from './accuracy';
import type {
	CharStats,
	KeystrokeRecord,
	MeasureRules,
	SessionMetrics,
	SessionPause,
	SessionState
} from './types';

const MS_PER_MINUTE = 60_000;
/** Characters that make one word in a speed in words per minute, as typing tests count it. */
export const CHARS_PER_WORD = 5;
/** Marks a time counted from the moment each group could be typed (`SessionMetrics.speedRule`). */
export const SPEED_RULE_FROM_SHOWN = 2;

export const MEASURE_RULES: MeasureRules = { firstKeyWaitCapMs: 5000 };

interface CharTally {
	attempts: number;
	errors: number;
	latencySum: number;
	latencyCount: number;
}

interface CharMerge {
	attempts: number;
	errors: number;
	latencySum: number;
	latencyWeight: number;
	latencyMean: number;
	latencyEntries: number;
}

export function combineMetrics(list: readonly SessionMetrics[]): SessionMetrics {
	const fromShown =
		list.length > 0 && list.every((metrics) => metrics.speedRule === SPEED_RULE_FROM_SHOWN);
	let elapsedMs = 0;
	let totalKeystrokes = 0;
	let correctKeystrokes = 0;
	const merges = new Map<string, CharMerge>();

	for (const metrics of list) {
		elapsedMs += metrics.elapsedMs;
		totalKeystrokes += metrics.totalKeystrokes;
		correctKeystrokes += metrics.correctKeystrokes;
		for (const [char, stats] of Object.entries(metrics.perChar)) {
			let merge = merges.get(char);
			if (merge === undefined) {
				merge = {
					attempts: 0,
					errors: 0,
					latencySum: 0,
					latencyWeight: 0,
					latencyMean: 0,
					latencyEntries: 0
				};
				merges.set(char, merge);
			}
			merge.attempts += stats.attempts;
			merge.errors += stats.errors;
			if (stats.meanLatencyMs !== null) {
				const weight = stats.attempts - stats.errors;
				merge.latencySum += stats.meanLatencyMs * weight;
				merge.latencyWeight += weight;
				merge.latencyMean += stats.meanLatencyMs;
				merge.latencyEntries += 1;
			}
		}
	}

	const perChar: Record<string, CharStats> = {};
	for (const [char, merge] of merges) {
		let meanLatencyMs: number | null = null;
		if (merge.latencyEntries > 0) {
			meanLatencyMs =
				merge.latencyWeight > 0
					? merge.latencySum / merge.latencyWeight
					: merge.latencyMean / merge.latencyEntries;
		}
		perChar[char] = { attempts: merge.attempts, errors: merge.errors, meanLatencyMs };
	}

	const correctCharsPerMinute =
		elapsedMs === 0 ? 0 : correctKeystrokes / (elapsedMs / MS_PER_MINUTE);

	return {
		elapsedMs,
		...(fromShown ? { speedRule: SPEED_RULE_FROM_SHOWN } : {}),
		totalKeystrokes,
		correctKeystrokes,
		errorCount: totalKeystrokes - correctKeystrokes,
		accuracy: computeAccuracy(correctKeystrokes, totalKeystrokes),
		correctCharsPerMinute,
		wordsPerMinute: correctCharsPerMinute / CHARS_PER_WORD,
		perChar
	};
}

function span(from: number, to: number): number {
	const length = to - from;
	return Number.isFinite(length) ? Math.max(0, length) : 0;
}

/** Time of the pauses that falls between two moments. */
function pausedBetween(pauses: readonly SessionPause[], from: number, to: number): number {
	return pauses.reduce(
		(sum, pause) => sum + span(Math.max(pause.from, from), Math.min(pause.to, to)),
		0
	);
}

/** No hesitation is read into a keystroke that follows a pause: the child was not looking for it. */
function isAfterPause(
	pauses: readonly SessionPause[],
	previous: KeystrokeRecord,
	record: KeystrokeRecord
): boolean {
	return pauses.some((pause) => pause.to >= previous.timestamp && pause.from <= record.timestamp);
}

/** Where the time of the group stops: its end, else `now`, else its last keystroke; a pause in progress stops it. */
function endOf(state: SessionState, now: number | undefined): number | undefined {
	const lastRecord = state.records[state.records.length - 1];
	const end = state.endedAt ?? now ?? lastRecord?.timestamp ?? state.startedAt ?? state.shownAt;
	if (end === undefined || state.endedAt !== null || state.pausedAt === undefined) return end;
	return Math.min(end, state.pausedAt);
}

/**
 * Time the group has been typed so far, from its first keystroke to its end, to `now` or to its
 * last keystroke, pauses left out. The race against the ghost runs on this time alone: nothing
 * moves while the child reads.
 */
export function sessionTypingMs(state: SessionState, now?: number): number {
	const end = endOf(state, now);
	if (state.startedAt === null || end === undefined) return 0;
	const paused = pausedBetween(state.pauses ?? [], state.startedAt, end);
	return Math.max(0, span(state.startedAt, end) - paused);
}

/**
 * Time spent on the group so far: the wait before its first keystroke, from the moment it could
 * be typed and no longer than `rules.firstKeyWaitCapMs` (nothing when that moment is not known),
 * then the time it has been typed (`sessionTypingMs`). The pauses are left out, and the time
 * stands still during the one in progress.
 */
export function sessionElapsedMs(
	state: SessionState,
	now?: number,
	rules: MeasureRules = MEASURE_RULES
): number {
	const { shownAt } = state;
	const end = endOf(state, now);
	if (shownAt === undefined || end === undefined) return sessionTypingMs(state, now);
	const until = state.startedAt ?? end;
	const waitMs = Math.min(
		Math.max(0, span(shownAt, until) - pausedBetween(state.pauses ?? [], shownAt, until)),
		Math.max(0, rules.firstKeyWaitCapMs)
	);
	return waitMs + sessionTypingMs(state, now);
}

export function computeMetrics(
	state: SessionState,
	now?: number,
	rules: MeasureRules = MEASURE_RULES
): SessionMetrics {
	const { records } = state;
	const pauses = state.pauses ?? [];
	const elapsedMs = sessionElapsedMs(state, now, rules);

	let totalKeystrokes = 0;
	let correctKeystrokes = 0;
	const tallies = new Map<string, CharTally>();

	records.forEach((record, index) => {
		if (record.kind === 'backspace' || record.overMistake) {
			return;
		}
		totalKeystrokes += 1;
		let tally = tallies.get(record.expected);
		if (tally === undefined) {
			tally = { attempts: 0, errors: 0, latencySum: 0, latencyCount: 0 };
			tallies.set(record.expected, tally);
		}
		tally.attempts += 1;
		if (!record.correct) {
			tally.errors += 1;
			return;
		}
		correctKeystrokes += 1;
		const previous = records[index - 1];
		if (previous !== undefined && !isAfterPause(pauses, previous, record)) {
			tally.latencySum += record.timestamp - previous.timestamp;
			tally.latencyCount += 1;
		}
	});

	const perChar: Record<string, CharStats> = {};
	for (const [char, tally] of tallies) {
		perChar[char] = {
			attempts: tally.attempts,
			errors: tally.errors,
			meanLatencyMs: tally.latencyCount === 0 ? null : tally.latencySum / tally.latencyCount
		};
	}

	const correctCharsPerMinute =
		elapsedMs === 0 ? 0 : correctKeystrokes / (elapsedMs / MS_PER_MINUTE);

	return {
		elapsedMs,
		...(state.shownAt === undefined ? {} : { speedRule: SPEED_RULE_FROM_SHOWN }),
		totalKeystrokes,
		correctKeystrokes,
		errorCount: totalKeystrokes - correctKeystrokes,
		accuracy: computeAccuracy(correctKeystrokes, totalKeystrokes),
		correctCharsPerMinute,
		wordsPerMinute: correctCharsPerMinute / CHARS_PER_WORD,
		perChar
	};
}
