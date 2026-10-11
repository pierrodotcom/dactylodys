import { describe, expect, it, vi } from 'vitest';
import {
	createSoundPlayer,
	type AudioContextLike,
	type AudioParamLike,
	type OscillatorNodeLike
} from './sound-player';
import { SOUND_IDS, SOUNDS } from './sounds';

interface FakeOscillator extends OscillatorNodeLike {
	startedAt: number | undefined;
	stoppedAt: number | undefined;
	connectedTo: unknown;
}

interface FakeContext extends AudioContextLike {
	state: string;
	oscillators: FakeOscillator[];
	gains: { gain: AudioParamLike; connectedTo: unknown }[];
	resume: ReturnType<typeof vi.fn<() => Promise<void>>>;
	close: ReturnType<typeof vi.fn<() => Promise<void>>>;
}

const DESTINATION = { name: 'destination' };

function fakeParam(): AudioParamLike {
	return { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
}

function fakeContext(state = 'running'): FakeContext {
	const oscillators: FakeOscillator[] = [];
	const gains: FakeContext['gains'] = [];
	return {
		currentTime: 10,
		state,
		destination: DESTINATION,
		oscillators,
		gains,
		createOscillator() {
			const oscillator: FakeOscillator = {
				type: 'sine',
				frequency: fakeParam(),
				startedAt: undefined,
				stoppedAt: undefined,
				connectedTo: undefined,
				connect(destination) {
					oscillator.connectedTo = destination;
				},
				start(when) {
					oscillator.startedAt = when;
				},
				stop(when) {
					oscillator.stoppedAt = when;
				}
			};
			oscillators.push(oscillator);
			return oscillator;
		},
		createGain() {
			const gain = {
				gain: fakeParam(),
				connectedTo: undefined as unknown,
				connect(destination: unknown) {
					gain.connectedTo = destination;
				}
			};
			gains.push(gain);
			return gain;
		},
		resume: vi.fn(() => Promise.resolve()),
		close: vi.fn(() => Promise.resolve())
	};
}

describe('createSoundPlayer', () => {
	it('creates no audio context until a sound is played', () => {
		const createContext = vi.fn(() => fakeContext());
		const player = createSoundPlayer({ isEnabled: () => true, createContext });
		expect(createContext).not.toHaveBeenCalled();
		player.play('correct');
		expect(createContext).toHaveBeenCalledTimes(1);
	});

	it('reuses the same context for every sound', () => {
		const context = fakeContext();
		const createContext = vi.fn(() => context);
		const player = createSoundPlayer({ isEnabled: () => true, createContext });
		player.play('correct');
		player.play('error');
		expect(createContext).toHaveBeenCalledTimes(1);
	});

	it('plays nothing and creates no context when sound is disabled', () => {
		const createContext = vi.fn(() => fakeContext());
		const player = createSoundPlayer({ isEnabled: () => false, createContext });
		player.play('lessonDone');
		expect(createContext).not.toHaveBeenCalled();
	});

	it('follows the enabled flag at each call', () => {
		const context = fakeContext();
		let enabled = false;
		const player = createSoundPlayer({ isEnabled: () => enabled, createContext: () => context });
		player.play('correct');
		expect(context.oscillators).toHaveLength(0);
		enabled = true;
		player.play('correct');
		expect(context.oscillators).toHaveLength(1);
	});

	it.each(SOUND_IDS)('schedules one oscillator per note of %s with the configured pitch', (id) => {
		const context = fakeContext();
		const player = createSoundPlayer({ isEnabled: () => true, createContext: () => context });
		player.play(id);
		const definition = SOUNDS[id];
		expect(context.oscillators).toHaveLength(definition.notes.length);
		expect(context.gains).toHaveLength(definition.notes.length);
		definition.notes.forEach((note, index) => {
			const oscillator = context.oscillators[index];
			expect(oscillator?.type).toBe(definition.waveform);
			expect(oscillator?.frequency.setValueAtTime).toHaveBeenCalledWith(
				note.frequency,
				10 + note.start
			);
			expect(oscillator?.startedAt).toBeCloseTo(10 + note.start);
			expect(oscillator?.stoppedAt).toBeCloseTo(10 + note.start + note.duration);
			expect(oscillator?.connectedTo).toBe(context.gains[index]);
			expect(context.gains[index]?.connectedTo).toBe(DESTINATION);
		});
	});

	it('shapes each note with a gain envelope that starts and ends silent', () => {
		const context = fakeContext();
		const player = createSoundPlayer({ isEnabled: () => true, createContext: () => context });
		player.play('correct');
		const param = context.gains[0]?.gain;
		const definition = SOUNDS.correct;
		expect(param?.setValueAtTime).toHaveBeenCalledWith(0, 10);
		expect(param?.linearRampToValueAtTime).toHaveBeenCalledWith(
			definition.volume,
			10 + definition.attack
		);
		const note = definition.notes[0];
		expect(param?.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, 10 + (note?.duration ?? 0));
	});

	it('resumes a suspended context', () => {
		const context = fakeContext('suspended');
		const player = createSoundPlayer({ isEnabled: () => true, createContext: () => context });
		player.play('correct');
		expect(context.resume).toHaveBeenCalledTimes(1);
		expect(context.oscillators).toHaveLength(1);
	});

	it('does not touch a running context with resume', () => {
		const context = fakeContext('running');
		const player = createSoundPlayer({ isEnabled: () => true, createContext: () => context });
		player.play('correct');
		expect(context.resume).not.toHaveBeenCalled();
	});

	it('does not throw when the context cannot be created', () => {
		const player = createSoundPlayer({
			isEnabled: () => true,
			createContext: () => {
				throw new Error('no audio device');
			}
		});
		expect(() => player.play('correct')).not.toThrow();
	});

	it('tries again to create the context after a failure', () => {
		const context = fakeContext();
		let attempts = 0;
		const player = createSoundPlayer({
			isEnabled: () => true,
			createContext: () => {
				attempts += 1;
				if (attempts === 1) throw new Error('not yet');
				return context;
			}
		});
		player.play('correct');
		player.play('correct');
		expect(context.oscillators).toHaveLength(1);
	});

	it('does not throw when resuming is rejected', async () => {
		const context = fakeContext('suspended');
		context.resume.mockRejectedValue(new Error('blocked'));
		const player = createSoundPlayer({ isEnabled: () => true, createContext: () => context });
		expect(() => player.play('correct')).not.toThrow();
		await Promise.resolve();
	});

	it('does not throw when the context fails while scheduling', () => {
		const context = fakeContext();
		context.createOscillator = () => {
			throw new Error('broken');
		};
		const player = createSoundPlayer({ isEnabled: () => true, createContext: () => context });
		expect(() => player.play('groupDone')).not.toThrow();
	});

	it('does not throw when the enabled check fails', () => {
		const player = createSoundPlayer({
			isEnabled: () => {
				throw new Error('settings unavailable');
			},
			createContext: () => fakeContext()
		});
		expect(() => player.play('correct')).not.toThrow();
	});

	it('closes the context on dispose', () => {
		const context = fakeContext();
		const player = createSoundPlayer({ isEnabled: () => true, createContext: () => context });
		player.play('correct');
		player.dispose();
		expect(context.close).toHaveBeenCalledTimes(1);
	});

	it('does not throw when disposing before any sound or when closing fails', () => {
		const idle = createSoundPlayer({ isEnabled: () => true, createContext: () => fakeContext() });
		expect(() => idle.dispose()).not.toThrow();

		const context = fakeContext();
		context.close.mockImplementation(() => {
			throw new Error('already closed');
		});
		const player = createSoundPlayer({ isEnabled: () => true, createContext: () => context });
		player.play('correct');
		expect(() => player.dispose()).not.toThrow();
	});

	it('plays nothing after dispose', () => {
		const createContext = vi.fn(() => fakeContext());
		const player = createSoundPlayer({ isEnabled: () => true, createContext });
		player.dispose();
		player.play('correct');
		expect(createContext).not.toHaveBeenCalled();
	});
});
