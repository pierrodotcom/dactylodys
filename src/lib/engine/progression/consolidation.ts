import { findLesson, isDetour } from './definition';
import { recentCharStats } from './progress';
import type { ProgressionDefinition, ProgressState } from './types';

/**
 * When the result of a lesson proposes one more play to tame its new keys (ADR-075, choice 3):
 * data, never constants in the code. Nothing is ever locked by it.
 */
export interface ConsolidationRules {
	/** Recent keystrokes of a new key under which it is still to tame. */
	readonly minRecentAttempts: number;
	/** Share (0 to 1) of wrong recent keystrokes above which a new key is still to tame. */
	readonly maxErrorRate: number;
	/** Keys named at most on the button that proposes the play, at least 1. */
	readonly maxKeys: number;
}

interface Need {
	readonly char: string;
	/** Place of the key among the new keys of the lesson. */
	readonly place: number;
	readonly attempts: number;
	readonly rate: number;
	readonly wrong: boolean;
}

/** Keys too often wrong first, the most often wrong first; then the least typed; then the lesson. */
function byNeed(first: Need, second: Need): number {
	if (first.wrong !== second.wrong) return first.wrong ? -1 : 1;
	if (first.wrong && first.rate !== second.rate) return second.rate - first.rate;
	return first.attempts - second.attempts || first.place - second.place;
}

/**
 * The new keys of the lesson the child would do well to play once more, to name on the button that
 * proposes it: those typed fewer than `minRecentAttempts` times lately, or wrong more often than
 * `maxErrorRate`, judged like every key on its recent results only (`recentCharStats`, ADR-025).
 * The most in need are kept, `maxKeys` at most, in the order of the lesson. None for a detour, for
 * a lesson without new keys, or for a lesson the progression does not have.
 */
export function keysToTame(
	progression: ProgressionDefinition,
	progress: ProgressState,
	lessonId: string,
	rules: ConsolidationRules
): string[] {
	const lesson = findLesson(progression, lessonId);
	if (lesson === undefined || isDetour(lesson)) return [];
	const needs: Need[] = [];
	lesson.newChars.forEach((char, place) => {
		const { attempts, errors } = recentCharStats(progress, char);
		const rate = attempts > 0 ? errors / attempts : 0;
		const wrong = rate > rules.maxErrorRate;
		if (wrong || attempts < rules.minRecentAttempts) {
			needs.push({ char, place, attempts, rate, wrong });
		}
	});
	return needs
		.sort(byNeed)
		.slice(0, Math.max(0, rules.maxKeys))
		.sort((first, second) => first.place - second.place)
		.map((need) => need.char);
}
