import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lessonIds } from '$lib/engine/progression/definition';
import type { SessionMetrics } from '$lib/engine/types';
import { buildCharIndex, parseLayout } from '$lib/keyboard/layout';
import { LAYOUT_IDS } from '$lib/keyboard/layout-ids';
import { createProfile, withAdultWords, withOpenedWorld } from '$lib/state/profile';
import type { Profile } from '$lib/state/types';
import { progressionFor } from './content';
import { freePracticeWorld, freeWordsFor, recordFreePractice } from './free-practice';
import { REWARD_CATALOGUE } from './rewards';

const found = progressionFor(LAYOUT_IDS[0]);
if (!found) throw new Error('no progression for the first layout');
const progression = found;
const AZERTY = buildCharIndex(
	parseLayout(JSON.parse(readFileSync('layouts/fr-fr-azerty-pc.json', 'utf8')))
);
const FINISHED_AT = Date.parse('2026-11-05T09:00:00Z');

function child(): Profile {
	return createProfile({ id: 'kid', name: 'Kid', now: 1, platform: 'pc' });
}

const METRICS: SessionMetrics = {
	elapsedMs: 20_000,
	totalKeystrokes: 9,
	correctKeystrokes: 8,
	errorCount: 1,
	accuracy: (100 * 8) / 9,
	correctCharsPerMinute: 24,
	wordsPerMinute: 4.8,
	perChar: {
		l: { attempts: 5, errors: 1, meanLatencyMs: 300 },
		u: { attempts: 4, errors: 0, meanLatencyMs: 300 }
	}
};

function finish(profile: Profile) {
	return recordFreePractice(profile, progression, REWARD_CATALOGUE, {
		metrics: METRICS,
		gameId: 'hatching',
		finishedAt: FINISHED_AT,
		utcOffsetMinutes: 60
	});
}

describe('recordFreePractice', () => {
	it('counts the keys and the day, but plays no lesson and keeps no session', () => {
		const before = child();
		const { profile } = finish(before);
		expect(profile.progress.lessons).toEqual(before.progress.lessons);
		expect(profile.progress.chars['l']).toMatchObject({ attempts: 5, errors: 1 });
		expect(profile.progress.chars['u']).toMatchObject({ attempts: 4, errors: 0 });
		expect(profile.sessions).toEqual([]);
		expect(profile.practiceDays).toEqual(['2026-11-05']);
		expect(profile.ghosts).toEqual({});
		expect(profile.gamePlays).toEqual({ hatching: 1 });
	});

	it('opens no lesson, whatever the accuracy', () => {
		const { profile } = finish(child());
		const second = lessonIds(progression)[1] as string;
		expect(Object.hasOwn(profile.progress.lessons, second)).toBe(false);
	});

	it('counts a day already played once', () => {
		const once = finish(child()).profile;
		expect(finish(once).profile.practiceDays).toEqual(['2026-11-05']);
	});
});

describe('freeWordsFor', () => {
	it('keeps the words the current keyboard types', () => {
		const profile = withAdultWords(child(), ['lune', 'Ça', 'vélo']);
		expect(freeWordsFor(profile, AZERTY)).toEqual(['lune', 'vélo']);
		expect(freeWordsFor(child(), AZERTY)).toEqual([]);
	});
});

describe('freePracticeWorld', () => {
	it('is the world of the lesson the map proposes, an opened world included', () => {
		const [first, , third] = progression.worlds;
		expect(freePracticeWorld(progression, child())?.id).toBe(first?.id);
		const opened = withOpenedWorld(child(), third?.id ?? '');
		expect(freePracticeWorld(progression, opened)?.id).toBe(third?.id);
	});
});
