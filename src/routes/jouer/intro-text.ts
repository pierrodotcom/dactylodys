import type { VoicePlayer } from '$lib/audio/voice-types';
import { lessonIntro } from '$lib/engine/progression/definition';
import type { LessonDefinition } from '$lib/engine/progression/types';
import { isReducedFingering } from '$lib/keyboard/fingering';
import type { FingeringProfile, LayoutPlatform } from '$lib/keyboard/types';

/**
 * What the screen before a lesson says of it. `whole`: its written instruction, for the platform
 * of the layout. `steps`: with a reduced fingering (ADR-075, choice 6), its short sentences instead
 * (audit P-13), which name no finger: the instruction was written for ten fingers and may name one
 * the child leaves folded. A lesson without short sentences keeps its instruction.
 */
export type IntroText =
	| { readonly kind: 'whole'; readonly text: string }
	| { readonly kind: 'steps'; readonly sentences: readonly string[] };

export function introText(
	lesson: LessonDefinition,
	platform: LayoutPlatform,
	fingering: FingeringProfile
): IntroText {
	const steps = lesson.steps ?? [];
	if (!isReducedFingering(fingering) || steps.length === 0) {
		return { kind: 'whole', text: lessonIntro(lesson, platform) };
	}
	return { kind: 'steps', sentences: steps.map((step) => step.text) };
}

/**
 * The voice that never says `text`, recorded or not, and says anything else as `voice` does. With a
 * reduced fingering, the instruction of a lesson is never said whole: only its short sentences, once
 * they are all recorded (`sayInTurn`). Stopping or disposing of it only stops `voice`, which belongs
 * to whoever gave it.
 */
export function silencing(voice: VoicePlayer, text: string): VoicePlayer {
	return {
		has: (said) => said !== text && voice.has(said),
		prepare(said) {
			if (said !== text) voice.prepare(said);
		},
		speak(said) {
			if (said !== text) return voice.speak(said);
			// Asking to speak stops what was being said, as the voice itself does.
			voice.stop();
			return Promise.resolve('unavailable');
		},
		stop: () => voice.stop(),
		dispose: () => voice.stop()
	};
}
