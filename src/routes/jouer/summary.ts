import type { SessionMetrics } from '$lib/engine/types';

export interface ResultSummary {
	readonly correct: number;
	readonly total: number;
	/** Character with the best success ratio, `null` when nothing was typed. */
	readonly bestChar: string | null;
	/** Character that went wrong most often, `null` when there is none besides the best one. */
	readonly tameChar: string | null;
}

interface CharEntry {
	readonly char: string;
	readonly attempts: number;
	readonly errors: number;
}

function byCodePoint(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

function pickBest(entries: readonly CharEntry[]): CharEntry | undefined {
	return [...entries].sort((a, b) => {
		const ratioA = (a.attempts - a.errors) / a.attempts;
		const ratioB = (b.attempts - b.errors) / b.attempts;
		return ratioB - ratioA || b.attempts - a.attempts || byCodePoint(a.char, b.char);
	})[0];
}

function pickTame(
	entries: readonly CharEntry[],
	best: CharEntry | undefined
): CharEntry | undefined {
	return entries
		.filter((entry) => entry.errors > 0 && entry.char !== best?.char)
		.sort((a, b) => {
			const ratioA = a.errors / a.attempts;
			const ratioB = b.errors / b.attempts;
			return ratioB - ratioA || b.errors - a.errors || byCodePoint(a.char, b.char);
		})[0];
}

/** What the result screen says, in counts: no percentage, no speed. */
export function summarizeMetrics(metrics: SessionMetrics): ResultSummary {
	const entries = Object.entries(metrics.perChar)
		.filter(([, stats]) => stats.attempts > 0)
		.map(([char, stats]) => ({ char, attempts: stats.attempts, errors: stats.errors }));
	const best = pickBest(entries);
	return {
		correct: metrics.correctKeystrokes,
		total: metrics.totalKeystrokes,
		bestChar: best?.char ?? null,
		tameChar: pickTame(entries, best)?.char ?? null
	};
}
