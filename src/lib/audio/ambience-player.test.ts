import { describe, expect, it, vi } from 'vitest';
import { AMBIENCES, type AmbienceDefinition } from './ambience';
import {
	createAmbiencePlayer,
	fillBrownNoise,
	type AmbienceContextLike,
	type AmbienceState,
	type BufferSourceLike
} from './ambience-player';

type Call = readonly [string, ...number[]];

interface FakeSource extends BufferSourceLike {
	startedAt: number | undefined;
	stoppedAt: number | undefined;
}

interface FakeContext extends AmbienceContextLike {
	currentTime: number;
	state: string;
	sources: FakeSource[];
	/** Calls to the gain of each sound started, in order. */
	gainCalls: Call[][];
	filters: { type: string; frequency: { value: number } }[];
	buffers: Float32Array[];
	resume: ReturnType<typeof vi.fn<() => Promise<void>>>;
	close: ReturnType<typeof vi.fn<() => Promise<void>>>;
}

const SAMPLE_RATE = 100;
const SOUND: AmbienceDefinition = AMBIENCES['soft-noise'];

function fakeContext(state = 'running'): FakeContext {
	const context: FakeContext = {
		currentTime: 0,
		sampleRate: SAMPLE_RATE,
		state,
		destination: { name: 'destination' },
		sources: [],
		gainCalls: [],
		filters: [],
		buffers: [],
		createBuffer(_channels, length) {
			const data = new Float32Array(length);
			context.buffers.push(data);
			return { getChannelData: () => data };
		},
		createBufferSource() {
			const source: FakeSource = {
				buffer: null,
				loop: false,
				startedAt: undefined,
				stoppedAt: undefined,
				connect: () => undefined,
				start(when) {
					source.startedAt = when;
				},
				stop(when) {
					source.stoppedAt = when;
				}
			};
			context.sources.push(source);
			return source;
		},
		createBiquadFilter() {
			const filter = { type: '', frequency: { value: 0 }, connect: () => undefined };
			context.filters.push(filter);
			return filter;
		},
		createGain() {
			const calls: Call[] = [];
			context.gainCalls.push(calls);
			return {
				gain: {
					cancelScheduledValues: (time: number) => calls.push(['cancel', time]),
					setValueAtTime: (value: number, time: number) => calls.push(['set', value, time]),
					linearRampToValueAtTime: (value: number, time: number) =>
						calls.push(['ramp', value, time])
				},
				connect: () => undefined
			};
		},
		resume: vi.fn(() => Promise.resolve()),
		close: vi.fn(() => Promise.resolve())
	};
	return context;
}

const PLAYING: AmbienceState = { ambience: 'soft-noise', audible: true, voiceSpeaking: false };

function setup(state = 'running') {
	const context = fakeContext(state);
	const createContext = vi.fn(() => context);
	const player = createAmbiencePlayer({ createContext, random: () => 0.75 });
	return { context, createContext, player };
}

function lastRamp(calls: readonly Call[]): Call | undefined {
	return calls.filter((call) => call[0] === 'ramp').at(-1);
}

describe('createAmbiencePlayer', () => {
	it('creates no audio context while there is no background sound', () => {
		const { createContext, player } = setup();
		player.update({ ...PLAYING, ambience: 'none' });
		player.update({ ...PLAYING, audible: false });
		expect(createContext).not.toHaveBeenCalled();
	});

	it('starts a filtered, looped noise that fades in from silence to its low volume', () => {
		const { context, player } = setup();
		context.currentTime = 5;
		player.update(PLAYING);

		const [source] = context.sources;
		expect(source?.loop).toBe(true);
		expect(source?.startedAt).toBe(5);
		expect(source?.stoppedAt).toBeUndefined();
		expect(context.filters[0]).toMatchObject({
			type: 'lowpass',
			frequency: { value: SOUND.lowpassHz }
		});
		expect(context.buffers[0]?.length).toBe(SOUND.loopSeconds * SAMPLE_RATE);
		expect(context.gainCalls[0]?.[0]).toEqual(['set', 0, 5]);
		expect(lastRamp(context.gainCalls[0] ?? [])).toEqual([
			'ramp',
			SOUND.volume,
			5 + SOUND.fadeInSeconds
		]);
	});

	it('wakes a suspended audio context', () => {
		const { context, player } = setup('suspended');
		player.update(PLAYING);
		expect(context.resume).toHaveBeenCalledOnce();
	});

	it('does not cut the fade-in short when told the same thing again', () => {
		const { context, player } = setup();
		player.update(PLAYING);
		context.currentTime = 1;
		player.update(PLAYING);
		expect(context.gainCalls[0]?.filter((call) => call[0] === 'ramp')).toHaveLength(1);
		expect(context.sources).toHaveLength(1);
	});

	it('fades out and stops at a pause, from where the fade-in had got to', () => {
		const { context, player } = setup();
		player.update(PLAYING);
		context.currentTime = SOUND.fadeInSeconds / 2;
		player.update({ ...PLAYING, audible: false });

		const calls = context.gainCalls[0] ?? [];
		expect(calls).toContainEqual(['set', SOUND.volume / 2, SOUND.fadeInSeconds / 2]);
		const end = SOUND.fadeInSeconds / 2 + SOUND.fadeOutSeconds;
		expect(lastRamp(calls)).toEqual(['ramp', 0, end]);
		expect(context.sources[0]?.stoppedAt).toBe(end);
	});

	it('starts again with a new fade-in once the game goes on', () => {
		const { context, player } = setup();
		player.update(PLAYING);
		context.currentTime = 10;
		player.update({ ...PLAYING, audible: false });
		context.currentTime = 20;
		player.update(PLAYING);

		expect(context.sources).toHaveLength(2);
		expect(context.sources[1]?.startedAt).toBe(20);
		expect(lastRamp(context.gainCalls[1] ?? [])).toEqual([
			'ramp',
			SOUND.volume,
			20 + SOUND.fadeInSeconds
		]);
		// The noise is generated once, then reused.
		expect(context.buffers).toHaveLength(1);
	});

	it('fades out when the setting goes back to none', () => {
		const { context, player } = setup();
		player.update(PLAYING);
		context.currentTime = 10;
		player.update({ ...PLAYING, ambience: 'none' });
		expect(lastRamp(context.gainCalls[0] ?? [])).toEqual(['ramp', 0, 10 + SOUND.fadeOutSeconds]);
	});

	it('goes down under the voice, then back up', () => {
		const { context, player } = setup();
		player.update(PLAYING);
		context.currentTime = 10;
		player.update({ ...PLAYING, voiceSpeaking: true });
		const calls = context.gainCalls[0] ?? [];
		expect(lastRamp(calls)).toEqual([
			'ramp',
			SOUND.volume * SOUND.duckedShare,
			10 + SOUND.duckSeconds
		]);

		context.currentTime = 15;
		player.update(PLAYING);
		expect(calls).toContainEqual(['set', SOUND.volume * SOUND.duckedShare, 15]);
		expect(lastRamp(calls)).toEqual(['ramp', SOUND.volume, 15 + SOUND.duckSeconds]);
		expect(context.sources).toHaveLength(1);
	});

	it('starts under the voice when the voice is already speaking', () => {
		const { context, player } = setup();
		player.update({ ...PLAYING, voiceSpeaking: true });
		expect(lastRamp(context.gainCalls[0] ?? [])?.[1]).toBe(SOUND.volume * SOUND.duckedShare);
	});

	it('keeps its volume far below the sounds of the game, and the voice on top', () => {
		for (const sound of Object.values(AMBIENCES)) {
			expect(sound.volume).toBeGreaterThan(0);
			expect(sound.volume).toBeLessThanOrEqual(0.1);
			expect(sound.duckedShare).toBeGreaterThanOrEqual(0);
			expect(sound.duckedShare).toBeLessThan(1);
			expect(sound.fadeInSeconds).toBeGreaterThanOrEqual(1);
			expect(sound.fadeOutSeconds).toBeGreaterThanOrEqual(1);
		}
	});

	it('never throws when the audio device is missing', () => {
		const player = createAmbiencePlayer({
			createContext: () => {
				throw new Error('no audio');
			}
		});
		expect(() => player.update(PLAYING)).not.toThrow();
	});

	it('closes its context once disposed, and stays silent afterwards', () => {
		const { context, createContext, player } = setup();
		player.update(PLAYING);
		player.dispose();
		expect(context.close).toHaveBeenCalledOnce();
		player.update(PLAYING);
		expect(createContext).toHaveBeenCalledOnce();
		expect(context.sources).toHaveLength(1);
	});
});

describe('fillBrownNoise', () => {
	it('fills the loop with a noise that peaks at 1 and ends where it starts', () => {
		let seed = 1;
		const random = () => {
			seed = (seed * 16_807) % 2_147_483_647;
			return seed / 2_147_483_647;
		};
		const samples = new Float32Array(1000);
		fillBrownNoise(samples, SOUND.step, random);
		const peak = Math.max(...Array.from(samples, Math.abs));
		expect(peak).toBeCloseTo(1, 5);
		expect(samples[999]).toBeCloseTo(samples[0] ?? 0, 5);
	});

	it('gives the same noise for the same random numbers', () => {
		const first = new Float32Array(50);
		const second = new Float32Array(50);
		fillBrownNoise(first, 0.1, () => 0.3);
		fillBrownNoise(second, 0.1, () => 0.3);
		expect(Array.from(first)).toEqual(Array.from(second));
	});
});
