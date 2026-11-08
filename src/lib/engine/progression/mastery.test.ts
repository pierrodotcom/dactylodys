import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { charMastery, masteryGroups, type MasteryRules } from './mastery';
import type { CharSample, ProgressState } from './types';

const RULES: MasteryRules = {
	acquiredMinAttempts: 20,
	acquiredMaxErrorRate: 0.1,
	fragileMinAttempts: 5,
	fragileMinErrorRate: 0.2
};

function progressOf(chars: Record<string, readonly CharSample[]>): ProgressState {
	return {
		lessons: {},
		chars: Object.fromEntries(
			Object.entries(chars).map(([char, recent]) => [
				char,
				{
					attempts: recent.reduce((sum, sample) => sum + sample.attempts, 0),
					errors: recent.reduce((sum, sample) => sum + sample.errors, 0),
					recent
				}
			])
		)
	};
}

describe('charMastery', () => {
	it('says new for a character never typed', () => {
		expect(charMastery(progressOf({}), 'q', RULES)).toBe('new');
	});

	it('says acquired once enough recent keystrokes are rarely wrong', () => {
		const progress = progressOf({ q: [{ attempts: 20, errors: 2, latencyMs: null }] });
		expect(charMastery(progress, 'q', RULES)).toBe('acquired');
	});

	it('says learning while too few keystrokes were made, even without a mistake', () => {
		const progress = progressOf({ q: [{ attempts: 19, errors: 0, latencyMs: null }] });
		expect(charMastery(progress, 'q', RULES)).toBe('learning');
	});

	it('says fragile when the recent keystrokes are often wrong', () => {
		const progress = progressOf({ q: [{ attempts: 10, errors: 3, latencyMs: null }] });
		expect(charMastery(progress, 'q', RULES)).toBe('fragile');
	});

	it('reads only the recent results, not the lifetime totals', () => {
		const progress: ProgressState = {
			lessons: {},
			chars: {
				q: { attempts: 500, errors: 400, recent: [{ attempts: 25, errors: 0, latencyMs: null }] }
			}
		};
		expect(charMastery(progress, 'q', RULES)).toBe('acquired');
	});

	it('never calls a character both acquired and often wrong', () => {
		fc.assert(
			fc.property(fc.nat({ max: 200 }), fc.nat({ max: 200 }), (attempts, wrong) => {
				const errors = Math.min(attempts, wrong);
				const progress = progressOf(
					attempts === 0 ? {} : { q: [{ attempts, errors, latencyMs: null }] }
				);
				const mastery = charMastery(progress, 'q', RULES);
				if (mastery === 'acquired') {
					expect(errors / attempts).toBeLessThanOrEqual(RULES.acquiredMaxErrorRate);
				}
				if (mastery === 'new') expect(attempts).toBe(0);
			})
		);
	});
});

describe('masteryGroups', () => {
	it('puts each typed character in exactly one group, sorted', () => {
		const progress = progressOf({
			s: [{ attempts: 30, errors: 0, latencyMs: null }],
			q: [{ attempts: 30, errors: 1, latencyMs: null }],
			d: [{ attempts: 10, errors: 5, latencyMs: null }],
			f: [{ attempts: 3, errors: 0, latencyMs: null }]
		});
		const groups = masteryGroups(progress, RULES, (a, b) => a.localeCompare(b));
		expect(groups).toEqual({ acquired: ['q', 's'], fragile: ['d'], learning: ['f'] });
	});
});
