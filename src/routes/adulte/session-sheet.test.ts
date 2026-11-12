import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lessonIds, parseProgression } from '$lib/engine/progression/definition';
import type { CharSample, ProgressState } from '$lib/engine/progression/types';
import { buildCharIndex, parseLayout } from '$lib/keyboard/layout';
import { createProfile } from '$lib/state/profile';
import type { Profile } from '$lib/state/types';
import { PLAY_RULES } from '../jouer/play-rules';
import { ADULT_RULES } from './adult-rules';
import { sessionSheet } from './session-sheet';

const progression = parseProgression(
	JSON.parse(readFileSync('content/fr/progression/azerty-decouverte.json', 'utf8'))
);
const charIndex = buildCharIndex(
	parseLayout(JSON.parse(readFileSync('layouts/fr-fr-azerty-pc.json', 'utf8')))
);
const collator = new Intl.Collator('fr');
const ACQUIRED: CharSample = { attempts: 30, errors: 0, latencyMs: 300 };
const FRAGILE: CharSample = { attempts: 30, errors: 15, latencyMs: null };
const LEARNING: CharSample = { attempts: 8, errors: 1, latencyMs: null };
const SLOW: CharSample = { attempts: 30, errors: 0, latencyMs: 900 };
const [FIRST_ID = '', SECOND_ID = ''] = lessonIds(progression);
const [FIRST_WORLD] = progression.worlds;

function childWith(chars: Record<string, CharSample>, passed: readonly string[] = []): Profile {
	const base = createProfile({ id: 'child', name: 'Lou', now: 1, platform: 'pc' });
	const progress: ProgressState = {
		lessons: Object.fromEntries(
			passed.map((id) => [id, { bestAccuracy: 100, stars: 2, attempts: 1, lastPlayedAt: 1 }])
		),
		chars: Object.fromEntries(
			Object.entries(chars).map(([char, sample]) => [
				char,
				{ attempts: sample.attempts, errors: sample.errors, recent: [sample] }
			])
		)
	};
	return { ...base, progress };
}

function sheetOf(profile: Profile, withLayout = true) {
	return sessionSheet({
		profile,
		progression,
		charIndex: withLayout ? charIndex : null,
		rules: ADULT_RULES,
		playRules: PLAY_RULES,
		compare: collator.compare
	});
}

/** Acquired keys found in 300 ms: enough measured keys for one to stand out. */
const STEADY = Object.fromEntries(['s', 'd', 'j', 'k', 'f'].map((char) => [char, ACQUIRED]));

describe('sessionSheet', () => {
	it('names the lesson the child plays now, its rank and its world', () => {
		const sheet = sheetOf(childWith({}, [FIRST_ID]));
		const second = progression.worlds
			.flatMap((world) => world.lessons)
			.find((lesson) => lesson.id === SECOND_ID);
		expect(sheet.lesson).toEqual({
			worldTitle: FIRST_WORLD?.title,
			title: second?.title,
			number: 2
		});
	});

	it('has no lesson when the layout has no progression', () => {
		const sheet = sessionSheet({
			profile: childWith({}),
			progression: undefined,
			charIndex,
			rules: ADULT_RULES,
			playRules: PLAY_RULES,
			compare: collator.compare
		});
		expect(sheet.lesson).toBeNull();
	});

	it('says it is the first time when no key was typed yet', () => {
		const sheet = sheetOf(childWith({}));
		expect(sheet.status).toBe('first');
		expect(sheet.lesson?.number).toBe(1);
	});

	it('lists the keys still being learned, the fragile ones and the hesitant ones', () => {
		const sheet = sheetOf(childWith({ ...STEADY, l: SLOW, q: FRAGILE, m: LEARNING }));
		expect(sheet.status).toBe('keys');
		expect(sheet.learning).toEqual(['m']);
		expect(sheet.fragile).toEqual(['q']);
		expect(sheet.hesitant).toEqual(['l']);
	});

	it('has nothing to point out when every key typed is acquired and found in time', () => {
		const sheet = sheetOf(childWith(STEADY));
		expect(sheet.status).toBe('quiet');
		expect([...sheet.learning, ...sheet.fragile, ...sheet.hesitant]).toEqual([]);
	});

	it('leaves out the hesitant keys while the layout is unknown', () => {
		const sheet = sheetOf(childWith({ ...STEADY, l: SLOW }), false);
		expect(sheet.hesitant).toEqual([]);
		expect(sheet.status).toBe('quiet');
	});

	it('takes the length of a session and the break from the rules of play', () => {
		const sheet = sessionSheet({
			profile: childWith({}),
			progression,
			charIndex,
			rules: ADULT_RULES,
			playRules: { breakAfterMinutes: 9, breakAfterExercises: 3 },
			compare: collator.compare
		});
		expect(sheet.breakAfterMinutes).toBe(9);
		expect(sheet.breakAfterExercises).toBe(3);
		expect(sheetOf(childWith({})).breakAfterMinutes).toBe(PLAY_RULES.breakAfterMinutes);
	});
});
