import { lessonIds } from '$lib/engine/progression/definition';
import type { ProgressionDefinition } from '$lib/engine/progression/types';
import type { PlayRules } from '../jouer/play-rules';

/** The figures the sheet for professionals gives: read from the data, never written in its text. */
export interface ProfessionalFacts {
	readonly lessons: number;
	readonly worlds: number;
	/** Accuracy, in percent, that passes a lesson. */
	readonly unlockAccuracy: number;
	readonly breakAfterExercises: number;
	readonly breakAfterMinutes: number;
	/** Recent keystrokes of a key, at least, before its letter fades from the keyboard drawn. */
	readonly fadeMinAttempts: number;
	/** Highest share of errors, in percent, of a key whose letter fades. */
	readonly fadeMaxErrorPercent: number;
}

const PERCENT = 100;

export function professionalFacts(
	progression: ProgressionDefinition,
	playRules: Pick<PlayRules, 'breakAfterExercises' | 'breakAfterMinutes'>
): ProfessionalFacts {
	const fade = progression.rules.keyboardFade;
	if (!fade) throw new Error(`${progression.id}: the sheet for professionals needs keyboardFade`);
	return {
		lessons: lessonIds(progression).length,
		worlds: progression.worlds.length,
		unlockAccuracy: progression.rules.unlockAccuracy,
		breakAfterExercises: playRules.breakAfterExercises,
		breakAfterMinutes: playRules.breakAfterMinutes,
		fadeMinAttempts: fade.acquiredMinAttempts,
		fadeMaxErrorPercent: Math.round(fade.acquiredMaxErrorRate * PERCENT)
	};
}
