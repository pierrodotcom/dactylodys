import { computeAccuracy } from './accuracy';
import type { CharStats, SessionMetrics, SessionState } from './types';

const MS_PER_MINUTE = 60_000;
const CHARS_PER_WORD = 5;

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
		totalKeystrokes,
		correctKeystrokes,
		errorCount: totalKeystrokes - correctKeystrokes,
		accuracy: computeAccuracy(correctKeystrokes, totalKeystrokes),
		correctCharsPerMinute,
		wordsPerMinute: correctCharsPerMinute / CHARS_PER_WORD,
		perChar
	};
}

export function computeMetrics(state: SessionState, now?: number): SessionMetrics {
	const { records } = state;
	const lastRecord = records[records.length - 1];

	let elapsedMs = 0;
	if (state.startedAt !== null) {
		const end = state.endedAt ?? now ?? lastRecord?.timestamp ?? state.startedAt;
		const elapsed = end - state.startedAt;
		elapsedMs = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
	}

	let totalKeystrokes = 0;
	let correctKeystrokes = 0;
	const tallies = new Map<string, CharTally>();

	records.forEach((record, index) => {
		if (record.kind === 'backspace') {
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
		if (previous !== undefined) {
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
		totalKeystrokes,
		correctKeystrokes,
		errorCount: totalKeystrokes - correctKeystrokes,
		accuracy: computeAccuracy(correctKeystrokes, totalKeystrokes),
		correctCharsPerMinute,
		wordsPerMinute: correctCharsPerMinute / CHARS_PER_WORD,
		perChar
	};
}
