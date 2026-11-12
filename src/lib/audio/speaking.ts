import type { VoicePlayer } from './voice-types';

/**
 * The same voice, which also says when it starts and stops speaking: the background sound goes
 * down under it. Speaking again before the end counts as one stretch of speech.
 */
export function withSpeakingSignal(
	voice: VoicePlayer,
	onchange: (speaking: boolean) => void
): VoicePlayer {
	let latest = 0;
	return {
		has: (text) => voice.has(text),
		prepare: (text) => voice.prepare(text),
		stop: () => voice.stop(),
		dispose: () => voice.dispose(),
		speak(text) {
			const turn = ++latest;
			// Without a clip nothing is said: the background sound is left as it is.
			if (voice.has(text)) onchange(true);
			return voice.speak(text).then((result) => {
				if (turn === latest) onchange(false);
				return result;
			});
		}
	};
}
