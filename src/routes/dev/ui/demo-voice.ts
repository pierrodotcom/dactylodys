import { voiceKey } from '$lib/audio/voice-key';
import type { VoicePlayer } from '$lib/audio/voice-types';

/**
 * A voice for the gallery: it makes no sound and "says" a text until it is stopped, which lets
 * every state of a listen button be looked at for as long as needed.
 */
export function createDemoVoicePlayer(texts: readonly string[]): VoicePlayer {
	const known = new Set(texts.map(voiceKey));
	let finish: (() => void) | undefined;

	function stop() {
		const ending = finish;
		finish = undefined;
		ending?.();
	}

	return {
		has: (text) => known.has(voiceKey(text)),
		speak(text) {
			stop();
			if (!known.has(voiceKey(text))) return Promise.resolve('unavailable');
			return new Promise((resolve) => {
				finish = () => resolve('played');
			});
		},
		prepare() {
			// Nothing to load: the gallery voice is silent.
		},
		stop,
		dispose: stop
	};
}
