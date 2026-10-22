/*
 * Contract of the voice (J4, ADR-011 and ADR-022). Types only: the functions below are written
 * by the "voice" work package against these types.
 *
 *   voiceKey(text: string): string
 *   createVoicePlayer(options): VoicePlayer
 *
 * `voiceKey` is pure and shared with the offline chain of `tools/voice/` that generates the
 * files: both sides must give the same key to the same text. It is synchronous, because
 * `VoicePlayer.has` is: a digest of the Web Crypto API, which is asynchronous, does not fit.
 *
 * The voice is recorded beforehand and served with the app (no speech synthesis of the browser,
 * no request to another domain). It only speaks when the child asks for it, and has its own
 * setting, `Settings.voiceEnabled`, apart from the sounds of the game.
 */

export interface VoiceClip {
	/** Path of the audio file, relative to the manifest. */
	readonly file: string;
	readonly durationMs: number;
}

export interface VoiceManifest {
	readonly schemaVersion: 1;
	readonly locale: string;
	/** Where the voice comes from, for `static/ATTRIBUTIONS.md` and the credits. */
	readonly voice: {
		readonly name: string;
		readonly source: string;
		readonly license: string;
	};
	/**
	 * Keyed by `voiceKey` of the NFC text. Any sentence of the content can thus be found from the
	 * sentence itself: lessons, story and rewards need no identifier per line, and a text that is
	 * rewritten simply has no clip until the files are generated again.
	 */
	readonly clips: Readonly<Record<string, VoiceClip>>;
}

export interface VoicePlayer {
	/** Whether a clip exists for this text; lets a screen hide a "listen" button that would do nothing. */
	has(text: string): boolean;
	/**
	 * Never rejects. `played`: the clip was heard to its end or until `stop`; `unavailable`: no
	 * clip for this text, or it could not be played; `disabled`: the voice is turned off.
	 * Speaking again stops what was being said.
	 */
	speak(text: string): Promise<'played' | 'unavailable' | 'disabled'>;
	/**
	 * Starts loading the clip of this text before it is asked for (a pointer or the focus on its
	 * "listen" button), so that it plays at once; does nothing without a clip or with the voice off.
	 */
	prepare(text: string): void;
	stop(): void;
	dispose(): void;
}
