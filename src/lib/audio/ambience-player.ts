import { AMBIENCES, type AmbienceDefinition, type AmbienceId } from './ambience';

export interface RampedParamLike {
	cancelScheduledValues(startTime: number): unknown;
	setValueAtTime(value: number, startTime: number): unknown;
	linearRampToValueAtTime(value: number, endTime: number): unknown;
}

export interface AudioBufferLike {
	getChannelData(channel: number): Float32Array;
}

export interface BufferSourceLike {
	buffer: AudioBufferLike | null;
	loop: boolean;
	connect(destination: unknown): unknown;
	start(when?: number): void;
	stop(when?: number): void;
}

export interface BiquadFilterLike {
	type: string;
	readonly frequency: { value: number };
	connect(destination: unknown): unknown;
}

export interface AmbienceGainLike {
	readonly gain: RampedParamLike;
	connect(destination: unknown): unknown;
}

/** The part of `AudioContext` used by the background sound; the real one fits. */
export interface AmbienceContextLike {
	readonly currentTime: number;
	readonly sampleRate: number;
	readonly state: string;
	readonly destination: unknown;
	createBuffer(channels: number, length: number, sampleRate: number): AudioBufferLike;
	createBufferSource(): BufferSourceLike;
	createBiquadFilter(): BiquadFilterLike;
	createGain(): AmbienceGainLike;
	resume(): Promise<void>;
	close(): Promise<void>;
}

/** What the route knows; the player works out what is heard. */
export interface AmbienceState {
	/** The setting of the profile. */
	readonly ambience: 'none' | AmbienceId;
	/** A game is being played, or the child is between two games, and the page is shown. */
	readonly audible: boolean;
	/** A recorded instruction is being said: the background sound goes down under it. */
	readonly voiceSpeaking: boolean;
}

export interface AmbiencePlayerOptions {
	readonly createContext?: () => AmbienceContextLike;
	/** From 0 (included) to 1 (excluded); injected so that tests know the noise. */
	readonly random?: () => number;
	readonly definitions?: Readonly<Record<AmbienceId, AmbienceDefinition>>;
}

export interface AmbiencePlayer {
	/** Never throws: a background sound that cannot be played is silently skipped. */
	update(state: AmbienceState): void;
	dispose(): void;
}

const SUSPENDED_STATE = 'suspended';
const MONO = 1;
const LOWPASS = 'lowpass';

interface Ramp {
	readonly from: number;
	readonly to: number;
	readonly start: number;
	readonly end: number;
}

interface Playing {
	readonly id: AmbienceId;
	readonly source: BufferSourceLike;
	readonly gain: AmbienceGainLike;
	ramp: Ramp;
}

function createBrowserContext(): AmbienceContextLike {
	return new AudioContext();
}

function levelAt(ramp: Ramp, time: number): number {
	if (time >= ramp.end || ramp.end <= ramp.start) return ramp.to;
	if (time <= ramp.start) return ramp.from;
	return ramp.from + ((ramp.to - ramp.from) * (time - ramp.start)) / (ramp.end - ramp.start);
}

/**
 * Brown noise that loops without a click: the drift between the first and the last sample is
 * taken out, then the whole is brought to a peak of 1.
 */
export function fillBrownNoise(samples: Float32Array, step: number, random: () => number): void {
	let value = 0;
	for (let index = 0; index < samples.length; index++) {
		value += (random() * 2 - 1) * step;
		// A leak towards zero keeps the walk from wandering off.
		value *= 1 - step / 10;
		samples[index] = value;
	}
	const last = samples.length - 1;
	if (last <= 0) return;
	const first = samples[0] ?? 0;
	const drift = (samples[last] ?? 0) - first;
	let peak = 0;
	for (let index = 0; index <= last; index++) {
		const level = (samples[index] ?? 0) - first - (drift * index) / last;
		samples[index] = level;
		peak = Math.max(peak, Math.abs(level));
	}
	if (peak === 0) return;
	for (let index = 0; index <= last; index++) samples[index] = (samples[index] ?? 0) / peak;
}

export function createAmbiencePlayer(options: AmbiencePlayerOptions = {}): AmbiencePlayer {
	const createContext = options.createContext ?? createBrowserContext;
	const random = options.random ?? Math.random;
	const definitions = options.definitions ?? AMBIENCES;
	const buffers = new Map<AmbienceId, AudioBufferLike>();
	let context: AmbienceContextLike | undefined;
	let playing: Playing | undefined;
	let disposed = false;

	function bufferFor(audio: AmbienceContextLike, id: AmbienceId): AudioBufferLike {
		const known = buffers.get(id);
		if (known) return known;
		const definition = definitions[id];
		const length = Math.max(1, Math.round(definition.loopSeconds * audio.sampleRate));
		const buffer = audio.createBuffer(MONO, length, audio.sampleRate);
		fillBrownNoise(buffer.getChannelData(0), definition.step, random);
		buffers.set(id, buffer);
		return buffer;
	}

	function rampTo(current: Playing, to: number, seconds: number, now: number) {
		// Already on its way there: the ramp under way is kept, a fade-in is not cut short.
		if (current.ramp.to === to) return;
		const from = levelAt(current.ramp, now);
		const param = current.gain.gain;
		param.cancelScheduledValues(now);
		param.setValueAtTime(from, now);
		param.linearRampToValueAtTime(to, now + seconds);
		current.ramp = { from, to, start: now, end: now + seconds };
	}

	function fadeOut(audio: AmbienceContextLike) {
		const current = playing;
		if (!current) return;
		playing = undefined;
		const now = audio.currentTime;
		const seconds = definitions[current.id].fadeOutSeconds;
		rampTo(current, 0, seconds, now);
		current.source.stop(now + seconds);
	}

	function start(audio: AmbienceContextLike, id: AmbienceId, level: number) {
		const definition = definitions[id];
		const now = audio.currentTime;
		const source = audio.createBufferSource();
		source.buffer = bufferFor(audio, id);
		source.loop = true;
		const filter = audio.createBiquadFilter();
		filter.type = LOWPASS;
		filter.frequency.value = definition.lowpassHz;
		const gain = audio.createGain();
		const current: Playing = { id, source, gain, ramp: { from: 0, to: 0, start: now, end: now } };
		gain.gain.setValueAtTime(0, now);
		source.connect(filter);
		filter.connect(gain);
		gain.connect(audio.destination);
		source.start(now);
		playing = current;
		rampTo(current, level, definition.fadeInSeconds, now);
	}

	return {
		update(state) {
			if (disposed) return;
			try {
				const wanted = state.audible && state.ambience !== 'none' ? state.ambience : null;
				if (wanted === null) {
					if (context) fadeOut(context);
					return;
				}
				context ??= createContext();
				if (context.state === SUSPENDED_STATE) {
					Promise.resolve(context.resume()).catch(() => undefined);
				}
				const definition = definitions[wanted];
				const level = definition.volume * (state.voiceSpeaking ? definition.duckedShare : 1);
				if (playing && playing.id !== wanted) fadeOut(context);
				if (!playing) {
					start(context, wanted, level);
					return;
				}
				rampTo(playing, level, definition.duckSeconds, context.currentTime);
			} catch {
				// A missing or broken audio device must never disturb the game.
			}
		},
		dispose() {
			disposed = true;
			const closing = context;
			context = undefined;
			playing = undefined;
			try {
				Promise.resolve(closing?.close()).catch(() => undefined);
			} catch {
				// Already closed or unavailable: nothing left to release.
			}
		}
	};
}
