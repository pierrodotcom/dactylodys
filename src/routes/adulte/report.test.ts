import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseProgression } from '$lib/engine/progression/definition';
import type { CharSample, ProgressState } from '$lib/engine/progression/types';
import { buildCharIndex, parseLayout } from '$lib/keyboard/layout';
import { createProfile } from '$lib/state/profile';
import { ADULT_RULES } from './adult-rules';
import { hesitantKeys, keyMasteries, sortChildren, worldSummaries } from './report';

const progression = parseProgression(
	JSON.parse(readFileSync('content/fr/progression/azerty-decouverte.json', 'utf8'))
);
const charIndex = buildCharIndex(
	parseLayout(JSON.parse(readFileSync('layouts/fr-fr-azerty-pc.json', 'utf8')))
);
const ACQUIRED: CharSample = { attempts: 30, errors: 0, latencyMs: null };
const FRAGILE: CharSample = { attempts: 30, errors: 15, latencyMs: null };
const collator = new Intl.Collator('fr');

function progressOf(chars: Record<string, CharSample>): ProgressState {
	return {
		lessons: {},
		chars: Object.fromEntries(
			Object.entries(chars).map(([char, sample]) => [
				char,
				{ attempts: sample.attempts, errors: sample.errors, recent: [sample] }
			])
		)
	};
}

function timed(sample: CharSample, latencyMs: number): CharSample {
	return { ...sample, latencyMs };
}

/** Acquired keys found in 300 ms, the time of the child, plus those given. */
function steadyWith(chars: Record<string, CharSample>): ProgressState {
	const steady = Object.fromEntries(
		['s', 'd', 'j', 'k', 'l'].map((char) => [char, timed(ACQUIRED, 300)])
	);
	return progressOf({ ...steady, ...chars });
}

function hesitant(progress: ProgressState): readonly string[] {
	return hesitantKeys(
		progress,
		charIndex,
		ADULT_RULES.mastery,
		ADULT_RULES.hesitation,
		collator.compare
	);
}

describe('worldSummaries', () => {
	it('counts the lessons passed and the stars of each world', () => {
		const [first] = progression.worlds;
		const [lesson] = first?.lessons ?? [];
		if (!first || !lesson) throw new Error('no lesson');
		const progress: ProgressState = {
			lessons: { [lesson.id]: { bestAccuracy: 100, stars: 2, attempts: 1, lastPlayedAt: 1 } },
			chars: {}
		};
		const [summary, ...others] = worldSummaries(progression, progress);
		expect(summary).toMatchObject({
			worldId: first.id,
			lessonCount: first.lessons.length,
			lessonsPassed: 1,
			stars: 2,
			maxStars: first.lessons.length * 3
		});
		expect(others.every((world) => world.lessonsPassed === 0 && world.stars === 0)).toBe(true);
	});
});

describe('keyMasteries', () => {
	it('colours the key of each character typed, and leaves out the others', () => {
		const keys = keyMasteries(
			progressOf({ q: ACQUIRED, s: FRAGILE }),
			charIndex,
			ADULT_RULES.mastery
		);
		expect(keys.get('KeyA')).toBe('acquired');
		expect(keys.get('KeyS')).toBe('fragile');
		expect(keys.has('KeyD')).toBe(false);
	});

	it('lets the weakest character of a key win', () => {
		const keys = keyMasteries(
			progressOf({ q: ACQUIRED, Q: FRAGILE }),
			charIndex,
			ADULT_RULES.mastery
		);
		expect(keys.get('KeyA')).toBe('fragile');
	});

	it('puts a character typed after a dead key on its letter', () => {
		const keys = keyMasteries(progressOf({ ê: FRAGILE }), charIndex, ADULT_RULES.mastery);
		expect(keys.get('KeyE')).toBe('fragile');
	});
});

describe('hesitantKeys', () => {
	it('lists an acquired key found much later than the other keys of the child', () => {
		const progress = steadyWith({ f: timed(ACQUIRED, 600), g: timed(ACQUIRED, 400) });
		expect(hesitant(progress)).toEqual(['f']);
	});

	it('counts a key whose time is exactly the factor times the median', () => {
		const factor = ADULT_RULES.hesitation.factor;
		expect(hesitant(steadyWith({ f: timed(ACQUIRED, 300 * factor) }))).toEqual(['f']);
		expect(hesitant(steadyWith({ f: timed(ACQUIRED, 300 * factor - 1) }))).toEqual([]);
	});

	it('lists nothing while fewer keys than the minimum have a time', () => {
		const { minKeys } = ADULT_RULES.hesitation;
		const few = Object.fromEntries(
			['s', 'd', 'j', 'k', 'l'].slice(0, minKeys - 2).map((char) => [char, timed(ACQUIRED, 300)])
		);
		expect(hesitant(progressOf({ ...few, f: timed(ACQUIRED, 3000) }))).toEqual([]);
	});

	it('never lists a fragile key, however long it takes', () => {
		expect(hesitant(steadyWith({ f: timed(FRAGILE, 3000) }))).toEqual([]);
	});

	it('neither measures nor lists a key with fewer right keystrokes than the minimum', () => {
		const { minCorrect } = ADULT_RULES.hesitation;
		const few: CharSample = { attempts: minCorrect - 1, errors: 0, latencyMs: 3000 };
		expect(hesitant(steadyWith({ f: few }))).toEqual([]);
		const fourMeasured = progressOf({
			s: timed(ACQUIRED, 300),
			d: timed(ACQUIRED, 300),
			j: timed(ACQUIRED, 300),
			f: few,
			g: timed(ACQUIRED, 3000)
		});
		expect(hesitant(fourMeasured)).toEqual([]);
	});

	it('gathers the small letter and the capital of a key, and names the key once', () => {
		const progress = steadyWith({
			f: timed(ACQUIRED, 400),
			F: timed({ attempts: 20, errors: 0, latencyMs: null }, 1200)
		});
		expect(hesitant(progress)).toEqual(['f']);
	});

	it('does not count a capital as a key of its own among the keys with a time', () => {
		const progress = progressOf({
			s: timed(ACQUIRED, 300),
			d: timed(ACQUIRED, 300),
			f: timed(ACQUIRED, 300),
			F: timed(ACQUIRED, 300),
			k: timed(ACQUIRED, 3000)
		});
		expect(hesitant(progress)).toEqual([]);
	});

	it('lists nothing for a profile whose plays were kept without a time', () => {
		const progress = steadyWith({ f: ACQUIRED });
		const untimed = progressOf(
			Object.fromEntries(Object.keys(progress.chars).map((char) => [char, ACQUIRED]))
		);
		expect(hesitant(untimed)).toEqual([]);
	});
});

describe('sortChildren', () => {
	it('orders the children by nickname, never by what they did', () => {
		const make = (id: string, name: string, now: number) =>
			createProfile({ id, name, now, platform: 'pc' });
		const sorted = sortChildren(
			[make('1', 'Zoé', 1), make('2', 'ali', 2), make('3', 'Élio', 3), make('4', 'ali', 0)],
			new Intl.Collator('fr').compare
		);
		expect(sorted.map((profile) => profile.id)).toEqual(['4', '2', '3', '1']);
	});
});
