import type { VoicePlayer } from './voice-types';

type SpeakResult = Awaited<ReturnType<VoicePlayer['speak']>>;

/** Resolves after `ms`, or at once when `signal` aborts: the clock of a sequence, injected by tests. */
export type VoiceWait = (ms: number, signal: AbortSignal) => Promise<void>;

/** The clock of the browser. */
export const waitOnTimer: VoiceWait = (ms, signal) =>
	new Promise((resolve) => {
		if (signal.aborted) {
			resolve();
			return;
		}
		const timer = setTimeout(resolve, ms);
		signal.addEventListener(
			'abort',
			() => {
				clearTimeout(timer);
				resolve();
			},
			{ once: true }
		);
	});

export interface VoiceSequence {
	/** What the sentences stand for: asking to say it says them, one after the other. */
	readonly text: string;
	readonly sentences: readonly string[];
	/**
	 * Told the index of each sentence as it starts, then `null` once they are all said or stopped:
	 * the hand shows the key of a sentence while it is said.
	 */
	readonly onsentence?: (index: number | null) => void;
	/** A sentence keeps its turn at least this long, however short its clip: the time of the hand. */
	readonly minSentenceMs?: number;
	readonly wait?: VoiceWait;
}

/**
 * The voice that says `text` as its sentences, one at a time (audit P-13): the next one starts once
 * the previous one is said and its turn is over. Only when every sentence has a clip; otherwise
 * `text` is said whole, as before, when it has one. Any other text is said by `voice` itself.
 * `dispose` only stops what is being said: `voice` belongs to whoever gave it.
 */
export function sayInTurn(voice: VoicePlayer, sequence: VoiceSequence): VoicePlayer {
	const wait = sequence.wait ?? waitOnTimer;
	const turnMs = sequence.minSentenceMs ?? 0;
	/** The sentences being said; aborted when they are stopped or said again from the start. */
	let run: AbortController | null = null;

	function inTurn(): boolean {
		return (
			sequence.sentences.length > 0 && sequence.sentences.every((sentence) => voice.has(sentence))
		);
	}

	/** Leaves the sentences being said without a word: what comes next says what it does. */
	function drop(): AbortController | null {
		const dropped = run;
		run = null;
		dropped?.abort();
		return dropped;
	}

	function stop() {
		const dropped = drop();
		voice.stop();
		if (dropped !== null) sequence.onsentence?.(null);
	}

	async function sayAll(controller: AbortController): Promise<SpeakResult> {
		let result: SpeakResult = 'played';
		for (const [index, sentence] of sequence.sentences.entries()) {
			sequence.onsentence?.(index);
			const [said] = await Promise.all([voice.speak(sentence), wait(turnMs, controller.signal)]);
			if (controller.signal.aborted) return 'played';
			if (said !== 'played') result = said;
		}
		run = null;
		sequence.onsentence?.(null);
		return result;
	}

	return {
		has: (text) => (text === sequence.text && inTurn()) || voice.has(text),
		prepare(text) {
			if (text !== sequence.text || !inTurn()) {
				voice.prepare(text);
				return;
			}
			for (const sentence of sequence.sentences) voice.prepare(sentence);
		},
		speak(text) {
			if (text !== sequence.text || !inTurn()) {
				if (drop() !== null) sequence.onsentence?.(null);
				return voice.speak(text);
			}
			drop();
			const controller = new AbortController();
			run = controller;
			return sayAll(controller);
		},
		stop,
		dispose: stop
	};
}
