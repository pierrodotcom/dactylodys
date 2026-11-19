import { describe, expect, it } from 'vitest';
import { isTour, lessonIds, parseProgression } from '$lib/engine/progression/definition';
import progressionData from '../../../content/fr/progression/azerty-decouverte.json';
import playRules from '../../../content/common/play-rules.json';
import { professionalFacts } from './facts';

const progression = parseProgression(progressionData);

describe('professionalFacts', () => {
	it('reads every figure of the sheet from the data', () => {
		const facts = professionalFacts(progression, playRules);

		// The grand tours teach nothing new: the sheet counts the lessons that teach (ADR-075).
		const tours = progression.worlds.flatMap((world) => world.lessons).filter(isTour).length;
		expect(tours).toBeGreaterThan(0);
		expect(facts).toEqual({
			lessons: lessonIds(progression).length - tours,
			worlds: progression.worlds.length,
			unlockAccuracy: progressionData.rules.unlockAccuracy,
			pause: {
				exercises: playRules.sessionLengths.normal.earlyExercises,
				typing: playRules.sessionLengths.normal.typingMinutes,
				minutes: playRules.sessionLengths.normal.clockMinutes
			},
			fadeMinAttempts: progressionData.rules.keyboardFade.acquiredMinAttempts,
			fadeMaxErrorPercent: Math.round(progressionData.rules.keyboardFade.acquiredMaxErrorRate * 100)
		});
	});

	it('refuses a progression whose keyboard never fades, as the sheet would say it does', () => {
		const rules = { ...progression.rules, keyboardFade: undefined };

		expect(() => professionalFacts({ ...progression, rules }, playRules)).toThrow(/keyboardFade/);
	});
});
