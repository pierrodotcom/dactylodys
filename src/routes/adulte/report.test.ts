import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseProgression } from '$lib/engine/progression/definition';
import type { CharSample, ProgressState } from '$lib/engine/progression/types';
import { buildCharIndex, parseLayout } from '$lib/keyboard/layout';
import { createProfile } from '$lib/state/profile';
import { ADULT_RULES } from './adult-rules';
import { keyMasteries, sortChildren, worldSummaries } from './report';

const progression = parseProgression(
	JSON.parse(readFileSync('content/fr/progression/azerty-decouverte.json', 'utf8'))
);
const charIndex = buildCharIndex(
	parseLayout(JSON.parse(readFileSync('layouts/fr-fr-azerty-pc.json', 'utf8')))
);
const ACQUIRED: CharSample = { attempts: 30, errors: 0 };
const FRAGILE: CharSample = { attempts: 30, errors: 15 };

function progressOf(chars: Record<string, CharSample>): ProgressState {
	return {
		lessons: {},
		chars: Object.fromEntries(
			Object.entries(chars).map(([char, sample]) => [char, { ...sample, recent: [sample] }])
		)
	};
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
