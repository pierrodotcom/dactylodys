import { describe, expect, it } from 'vitest';
import type { CharStats, SessionMetrics } from '$lib/engine/types';
import { summarizeMetrics } from './summary';

function metricsOf(
	perChar: Record<string, Pick<CharStats, 'attempts' | 'errors'>>
): SessionMetrics {
	const entries = Object.values(perChar);
	const total = entries.reduce((sum, stats) => sum + stats.attempts, 0);
	const errors = entries.reduce((sum, stats) => sum + stats.errors, 0);
	return {
		elapsedMs: 1000,
		totalKeystrokes: total,
		correctKeystrokes: total - errors,
		errorCount: errors,
		accuracy: total === 0 ? 100 : ((total - errors) / total) * 100,
		correctCharsPerMinute: 0,
		wordsPerMinute: 0,
		perChar: Object.fromEntries(
			Object.entries(perChar).map(([char, stats]) => [char, { ...stats, meanLatencyMs: null }])
		)
	};
}

describe('summarizeMetrics', () => {
	it('counts the right keys over the keys pressed', () => {
		const summary = summarizeMetrics(
			metricsOf({ f: { attempts: 6, errors: 1 }, j: { attempts: 4, errors: 0 } })
		);

		expect(summary.correct).toBe(9);
		expect(summary.total).toBe(10);
	});

	it('names the key with the best success ratio', () => {
		const summary = summarizeMetrics(
			metricsOf({ f: { attempts: 10, errors: 3 }, j: { attempts: 5, errors: 0 } })
		);

		expect(summary.bestChar).toBe('j');
	});

	it('names the key that went wrong most often as the one to tame', () => {
		const summary = summarizeMetrics(
			metricsOf({
				f: { attempts: 10, errors: 1 },
				j: { attempts: 10, errors: 0 },
				d: { attempts: 4, errors: 3 }
			})
		);

		expect(summary.bestChar).toBe('j');
		expect(summary.tameChar).toBe('d');
	});

	it('has no key to tame when nothing went wrong', () => {
		const summary = summarizeMetrics(
			metricsOf({ f: { attempts: 5, errors: 0 }, j: { attempts: 5, errors: 0 } })
		);

		expect(summary.tameChar).toBeNull();
	});

	it('never offers the best key as the one to tame', () => {
		const summary = summarizeMetrics(metricsOf({ f: { attempts: 5, errors: 2 } }));

		expect(summary.bestChar).toBe('f');
		expect(summary.tameChar).toBeNull();
	});

	it('breaks a tie by the number of attempts, then by character', () => {
		const summary = summarizeMetrics(
			metricsOf({
				k: { attempts: 4, errors: 0 },
				d: { attempts: 8, errors: 0 },
				f: { attempts: 8, errors: 0 }
			})
		);

		expect(summary.bestChar).toBe('d');
	});

	it('handles a lesson where nothing was typed', () => {
		const summary = summarizeMetrics(metricsOf({}));

		expect(summary).toEqual({ correct: 0, total: 0, bestChar: null, tameChar: null });
	});

	it('does not report a speed', () => {
		const summary = summarizeMetrics(metricsOf({ f: { attempts: 3, errors: 0 } }));

		expect(Object.keys(summary).sort()).toEqual(['bestChar', 'correct', 'tameChar', 'total']);
	});
});
