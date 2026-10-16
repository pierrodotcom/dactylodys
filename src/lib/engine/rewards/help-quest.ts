import { isLessonPassed, recentCharStats } from '../progression/progress';
import type { ProgressionDefinition, ProgressState } from '../progression/types';
import type { HelpQuest, HelpQuestRecord, HelpQuestRules } from './types';

const RULE_KEYS = [
	'schemaVersion',
	'minRecentAttempts',
	'maxErrorRate',
	'targetLength',
	'minCharCount'
];

function fail(path: string, message: string): never {
	throw new Error(`${path}: ${message}`);
}

function expectRecord(value: unknown, path: string): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		fail(path, 'expected an object');
	}
	return value as Record<string, unknown>;
}

function expectPositiveInteger(value: unknown, path: string): number {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
		fail(path, 'expected an integer of at least 1');
	}
	return value;
}

/** Validates `content/common/help-quest.json`. */
export function parseHelpQuestRules(data: unknown): HelpQuestRules {
	const root = expectRecord(data, 'helpQuest');
	for (const name of Object.keys(root)) {
		if (!RULE_KEYS.includes(name)) fail(`helpQuest.${name}`, 'unknown property');
	}
	if (root['schemaVersion'] !== 1) fail('helpQuest.schemaVersion', 'expected 1');
	const minRecentAttempts = expectPositiveInteger(
		root['minRecentAttempts'],
		'helpQuest.minRecentAttempts'
	);
	const maxErrorRate = root['maxErrorRate'];
	if (typeof maxErrorRate !== 'number' || !Number.isFinite(maxErrorRate)) {
		fail('helpQuest.maxErrorRate', 'expected a finite number');
	}
	if (maxErrorRate < 0 || maxErrorRate >= 1) {
		fail('helpQuest.maxErrorRate', 'expected a number from 0 up to, but not including, 1');
	}
	const targetLength = expectPositiveInteger(root['targetLength'], 'helpQuest.targetLength');
	const minCharCount = expectPositiveInteger(root['minCharCount'], 'helpQuest.minCharCount');
	if (minCharCount > targetLength) {
		fail('helpQuest.minCharCount', 'expected at most targetLength');
	}
	return { schemaVersion: 1, minRecentAttempts, maxErrorRate, targetLength, minCharCount };
}

/** How many lessons were played in all, repeats included: what separates two help quests. */
export function lessonPlays(progress: ProgressState): number {
	return Object.values(progress.lessons).reduce((sum, lesson) => sum + lesson.attempts, 0);
}

/**
 * The key the companion asks help for, if any (ADR-027). Only keys of passed lessons are asked
 * about, judged on their recent results, and the hardest one wins (the first in the order of the
 * progression on a tie). Nothing is asked until another lesson was played since the last quest.
 */
export function helpQuestFor(
	progression: ProgressionDefinition,
	progress: ProgressState,
	rules: HelpQuestRules,
	last: HelpQuestRecord | null
): HelpQuest | null {
	if (last !== null && lessonPlays(progress) <= last.lessonPlays) return null;
	let best: HelpQuest | null = null;
	let bestRate = rules.maxErrorRate;
	for (const world of progression.worlds) {
		for (const lesson of world.lessons) {
			if (!isLessonPassed(progression.rules, progress, lesson.id)) continue;
			for (const char of lesson.newChars) {
				const { attempts, errors } = recentCharStats(progress, char);
				if (attempts <= 0 || attempts < rules.minRecentAttempts) continue;
				const rate = errors / attempts;
				if (rate > bestRate) {
					best = { char, lessonId: lesson.id };
					bestRate = rate;
				}
			}
		}
	}
	return best;
}
