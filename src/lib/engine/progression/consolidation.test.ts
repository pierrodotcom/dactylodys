import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { keysToTame, type ConsolidationRules } from './consolidation';
import type { CharSample, LessonDefinition, ProgressionDefinition, ProgressState } from './types';

const RULES: ConsolidationRules = { minRecentAttempts: 15, maxErrorRate: 0.2, maxKeys: 2 };

function lesson(id: string, newChars: readonly string[], optional = false): LessonDefinition {
	return {
		id,
		title: id,
		intro: 'Intro.',
		newChars,
		words: [],
		mix: { drills: 1, words: 0, phrases: 0 },
		unlocks: [],
		groupCount: 8,
		targetLength: 24,
		groupLength: [2, 4],
		...(optional ? { optional: true as const } : {})
	};
}

const PROGRESSION: ProgressionDefinition = {
	schemaVersion: 1,
	id: 'fr.progression.test',
	locale: 'fr',
	layoutIds: ['fr-fr-azerty-pc'],
	rules: {
		unlockAccuracy: 80,
		starThresholds: [80, 90, 95],
		newCharWeight: 0.6,
		weakCharBoost: 2,
		themeBoost: 2,
		newCharMinCount: 5,
		recentCharWindow: 30
	},
	worlds: [
		{
			id: 'fr.world.a',
			title: 'A',
			themeId: 'a',
			gameIds: ['hatching'],
			lessons: [
				lesson('fr.lesson.v-b', ['v', 'b']),
				lesson('fr.lesson.marks', [',', '.', ';']),
				lesson('fr.lesson.space', [' ']),
				lesson('fr.lesson.text', []),
				lesson('fr.lesson.detour', ['î', 'ô'], true)
			]
		}
	]
};

/** Recent results of these keys: one play each, with these keystrokes and mistakes. */
function progressWith(
	keys: Readonly<Record<string, { attempts: number; errors: number }>>
): ProgressState {
	return {
		lessons: {},
		chars: Object.fromEntries(
			Object.entries(keys).map(([char, { attempts, errors }]) => {
				const sample: CharSample = { attempts, errors, latencyMs: null };
				return [char, { attempts, errors, recent: attempts > 0 ? [sample] : [] }];
			})
		)
	};
}

const TAMED = { attempts: 20, errors: 1 } as const;

describe('keysToTame', () => {
	it('names the new keys typed too few times lately, in the order of the lesson', () => {
		const progress = progressWith({ v: { attempts: 9, errors: 0 }, b: { attempts: 8, errors: 0 } });

		expect(keysToTame(PROGRESSION, progress, 'fr.lesson.v-b', RULES)).toEqual(['v', 'b']);
	});

	it('names a new key too often wrong lately, however often it was typed', () => {
		const progress = progressWith({ v: TAMED, b: { attempts: 30, errors: 7 } });

		expect(keysToTame(PROGRESSION, progress, 'fr.lesson.v-b', RULES)).toEqual(['b']);
	});

	it('names nothing once every new key was typed enough and rarely wrong', () => {
		const progress = progressWith({ v: TAMED, b: { attempts: 15, errors: 3 } });

		expect(keysToTame(PROGRESSION, progress, 'fr.lesson.v-b', RULES)).toEqual([]);
	});

	it('reads the recent results only, never the totals of a whole life', () => {
		const progress: ProgressState = {
			lessons: {},
			chars: {
				v: { attempts: 400, errors: 0, recent: [{ attempts: 6, errors: 0, latencyMs: null }] },
				b: { attempts: 400, errors: 300, recent: [{ ...TAMED, latencyMs: null }] }
			}
		};

		expect(keysToTame(PROGRESSION, progress, 'fr.lesson.v-b', RULES)).toEqual(['v']);
	});

	it('keeps the keys most in need, wrong ones first, then the least typed, at most as many as the rules say', () => {
		const progress = progressWith({
			',': { attempts: 6, errors: 0 },
			'.': { attempts: 12, errors: 0 },
			';': { attempts: 10, errors: 4 }
		});

		expect(keysToTame(PROGRESSION, progress, 'fr.lesson.marks', RULES)).toEqual([',', ';']);
		expect(keysToTame(PROGRESSION, progress, 'fr.lesson.marks', { ...RULES, maxKeys: 1 })).toEqual([
			';'
		]);
	});

	it('names a key never typed lately', () => {
		expect(keysToTame(PROGRESSION, progressWith({}), 'fr.lesson.space', RULES)).toEqual([' ']);
	});

	it('names nothing for a lesson without new keys, a detour or a lesson it does not know', () => {
		const progress = progressWith({});

		expect(keysToTame(PROGRESSION, progress, 'fr.lesson.text', RULES)).toEqual([]);
		expect(keysToTame(PROGRESSION, progress, 'fr.lesson.detour', RULES)).toEqual([]);
		expect(keysToTame(PROGRESSION, progress, 'fr.lesson.unknown', RULES)).toEqual([]);
	});

	it('only ever names new keys of the lesson, at most as many as the rules say, each once', () => {
		const counts = fc.record({
			attempts: fc.integer({ min: 0, max: 40 }),
			errors: fc.integer({ min: 0, max: 40 })
		});
		const keys = fc
			.dictionary(fc.constantFrom(',', '.', ';', 'v', 'b', 'x'), counts)
			.map((record) =>
				Object.fromEntries(
					Object.entries(record).map(([char, { attempts, errors }]) => [
						char,
						{ attempts, errors: Math.min(errors, attempts) }
					])
				)
			);
		fc.assert(
			fc.property(keys, fc.integer({ min: 1, max: 3 }), (record, maxKeys) => {
				const named = keysToTame(PROGRESSION, progressWith(record), 'fr.lesson.marks', {
					...RULES,
					maxKeys
				});
				expect(named.length).toBeLessThanOrEqual(maxKeys);
				expect(new Set(named).size).toBe(named.length);
				const order = [',', '.', ';'];
				expect(named.every((char) => order.includes(char))).toBe(true);
				expect([...named].sort((a, b) => order.indexOf(a) - order.indexOf(b))).toEqual(named);
			})
		);
	});
});
