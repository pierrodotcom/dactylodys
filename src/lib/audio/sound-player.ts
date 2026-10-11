import { SOUNDS, type SoundDefinition, type SoundId } from './sounds';

export interface AudioParamLike {
	setValueAtTime(value: number, startTime: number): unknown;
	linearRampToValueAtTime(value: number, endTime: number): unknown;
}

export interface OscillatorNodeLike {
	type: string;
	readonly frequency: AudioParamLike;
	connect(destination: unknown): unknown;
	start(when?: number): void;
	stop(when?: number): void;
}

export interface GainNodeLike {
	readonly gain: AudioParamLike;
	connect(destination: unknown): unknown;
}

/** The part of `AudioContext` used by the sound player; the real one fits. */
export interface AudioContextLike {
	readonly currentTime: number;
	readonly state: string;
	readonly destination: unknown;
	createOscillator(): OscillatorNodeLike;
	createGain(): GainNodeLike;
	resume(): Promise<void>;
	close(): Promise<void>;
}

export interface SoundPlayerOptions {
	readonly isEnabled: () => boolean;
	readonly createContext?: () => AudioContextLike;
}

export interface SoundPlayer {
	/** Never throws: a sound that cannot be played is silently skipped. */
	play(sound: SoundId): void;
	dispose(): void;
}

const SUSPENDED_STATE = 'suspended';

function createBrowserContext(): AudioContextLike {
	return new AudioContext();
}

function scheduleSound(context: AudioContextLike, definition: SoundDefinition) {
	const origin = context.currentTime;
	for (const note of definition.notes) {
		const start = origin + note.start;
		const end = start + note.duration;
		const oscillator = context.createOscillator();
		const gain = context.createGain();

		oscillator.type = definition.waveform;
		oscillator.frequency.setValueAtTime(note.frequency, start);
		gain.gain.setValueAtTime(0, start);
		gain.gain.linearRampToValueAtTime(definition.volume, start + definition.attack);
		gain.gain.setValueAtTime(definition.volume, end - definition.release);
		gain.gain.linearRampToValueAtTime(0, end);

		oscillator.connect(gain);
		gain.connect(context.destination);
		oscillator.start(start);
		oscillator.stop(end);
	}
}

export function createSoundPlayer(options: SoundPlayerOptions): SoundPlayer {
	const createContext = options.createContext ?? createBrowserContext;
	let context: AudioContextLike | undefined;
	let disposed = false;

	return {
		play(sound) {
			if (disposed) return;
			try {
				if (!options.isEnabled()) return;
				context ??= createContext();
				if (context.state === SUSPENDED_STATE) {
					Promise.resolve(context.resume()).catch(() => undefined);
				}
				scheduleSound(context, SOUNDS[sound]);
			} catch {
				// A missing or broken audio device must never disturb the game.
			}
		},
		dispose() {
			disposed = true;
			const closing = context;
			context = undefined;
			try {
				Promise.resolve(closing?.close()).catch(() => undefined);
			} catch {
				// Already closed or unavailable: nothing left to release.
			}
		}
	};
}
