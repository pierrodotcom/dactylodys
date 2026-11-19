import { describe, expect, it } from 'vitest';
import { sayInTurn, type VoiceWait } from './voice-sequence';
import type { VoicePlayer } from './voice-types';

type SpeakResult = Awaited<ReturnType<VoicePlayer['speak']>>;

/**
 * A voice whose clips end when the test says so: `finish()` ends the sentence being said. Like the
 * real player, speaking again or stopping ends the sentence being said as `played`.
 */
function fakeVoice(recorded: readonly string[], enabled = true) {
	const said: string[] = [];
	const prepared: string[] = [];
	let ending: ((result: SpeakResult) => void) | null = null;
	let stops = 0;
	let disposed = false;
	const endCurrent = (result: SpeakResult) => {
		const end = ending;
		ending = null;
		end?.(result);
	};
	const voice: VoicePlayer = {
		has: (text) => recorded.includes(text),
		prepare: (text) => {
			prepared.push(text);
		},
		speak(text) {
			endCurrent('played');
			if (!enabled) return Promise.resolve('disabled');
			if (!recorded.includes(text)) return Promise.resolve('unavailable');
			said.push(text);
			return new Promise((resolve) => (ending = resolve));
		},
		stop() {
			stops += 1;
			endCurrent('played');
		},
		dispose() {
			disposed = true;
		}
	};
	return {
		voice,
		said,
		prepared,
		finish: () => endCurrent('played'),
		stops: () => stops,
		disposed: () => disposed
	};
}

/** A clock that only moves when the test moves it. */
function fakeClock() {
	let now = 0;
	const sleepers: { at: number; wake: () => void }[] = [];
	const wait: VoiceWait = (ms, signal) =>
		new Promise((resolve) => {
			if (signal.aborted) return resolve();
			const sleeper = { at: now + ms, wake: () => resolve() };
			sleepers.push(sleeper);
			signal.addEventListener('abort', () => resolve(), { once: true });
		});
	return {
		wait,
		advance(ms: number) {
			now += ms;
			for (const sleeper of sleepers.filter((item) => item.at <= now)) {
				sleepers.splice(sleepers.indexOf(sleeper), 1);
				sleeper.wake();
			}
		}
	};
}

/** Lets the promises of the sequence move on. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const INTRO = 'Pose tes deux index sur les touches F et J.';
const STEPS = ['F, à gauche : la touche au petit trait.', 'J, à droite : elle aussi a un trait.'];
const TURN_MS = 1400;

function sequenceOf(voice: VoicePlayer, clock = fakeClock()) {
	const shown: (number | null)[] = [];
	const player = sayInTurn(voice, {
		text: INTRO,
		sentences: STEPS,
		onsentence: (index) => shown.push(index),
		minSentenceMs: TURN_MS,
		wait: clock.wait
	});
	return { player, shown, clock };
}

describe('sayInTurn', () => {
	it('says each sentence in turn, while the key of each one is shown, then gives the hand back', async () => {
		const fake = fakeVoice(STEPS);
		const { player, shown, clock } = sequenceOf(fake.voice);

		const done = player.speak(INTRO);
		expect(fake.said).toEqual([STEPS[0]]);
		expect(shown).toEqual([0]);

		fake.finish();
		clock.advance(TURN_MS);
		await settle();
		expect(fake.said).toEqual(STEPS);
		expect(shown).toEqual([0, 1]);

		fake.finish();
		clock.advance(TURN_MS);
		await expect(done).resolves.toBe('played');
		expect(shown).toEqual([0, 1, null]);
	});

	it('waits for the hand when a sentence is shorter than its turn', async () => {
		const fake = fakeVoice(STEPS);
		const { player, shown, clock } = sequenceOf(fake.voice);

		void player.speak(INTRO);
		fake.finish();
		await settle();
		expect(shown).toEqual([0]);

		clock.advance(TURN_MS - 1);
		await settle();
		expect(fake.said).toEqual([STEPS[0]]);

		clock.advance(1);
		await settle();
		expect(fake.said).toEqual(STEPS);
	});

	it('waits for the end of a sentence longer than its turn', async () => {
		const fake = fakeVoice(STEPS);
		const { player, clock } = sequenceOf(fake.voice);

		void player.speak(INTRO);
		clock.advance(TURN_MS * 3);
		await settle();
		expect(fake.said).toEqual([STEPS[0]]);

		fake.finish();
		await settle();
		expect(fake.said).toEqual(STEPS);
	});

	it('stops at once: nothing more is said, and the hand is given back', async () => {
		const fake = fakeVoice(STEPS);
		const { player, shown, clock } = sequenceOf(fake.voice);

		const done = player.speak(INTRO);
		player.stop();
		await expect(done).resolves.toBe('played');
		expect(shown).toEqual([0, null]);
		expect(fake.stops()).toBe(1);

		clock.advance(TURN_MS * 4);
		await settle();
		expect(fake.said).toEqual([STEPS[0]]);
		expect(shown).toEqual([0, null]);
	});

	it('starts again from the first sentence when asked again, the former turn left silently', async () => {
		const fake = fakeVoice(STEPS);
		const { player, shown, clock } = sequenceOf(fake.voice);

		const first = player.speak(INTRO);
		fake.finish();
		clock.advance(TURN_MS);
		await settle();
		const again = player.speak(INTRO);
		await expect(first).resolves.toBe('played');
		expect(shown).toEqual([0, 1, 0]);
		expect(fake.said).toEqual([STEPS[0], STEPS[1], STEPS[0]]);

		for (let turn = 0; turn < STEPS.length; turn++) {
			fake.finish();
			clock.advance(TURN_MS);
			await settle();
		}
		await expect(again).resolves.toBe('played');
		expect(shown).toEqual([0, 1, 0, 1, null]);
	});

	it('says the whole text, as before, while one sentence has no clip', async () => {
		const fake = fakeVoice([STEPS[0]!, INTRO]);
		const { player, shown } = sequenceOf(fake.voice);

		expect(player.has(INTRO)).toBe(true);
		const done = player.speak(INTRO);
		expect(fake.said).toEqual([INTRO]);
		fake.finish();
		await expect(done).resolves.toBe('played');
		expect(shown).toEqual([]);
	});

	it('has a clip for the text when every sentence has one, or the text itself', () => {
		expect(sequenceOf(fakeVoice(STEPS).voice).player.has(INTRO)).toBe(true);
		expect(sequenceOf(fakeVoice([INTRO]).voice).player.has(INTRO)).toBe(true);
		expect(sequenceOf(fakeVoice([STEPS[1]!]).voice).player.has(INTRO)).toBe(false);
		expect(sequenceOf(fakeVoice(STEPS).voice).player.has('Autre chose.')).toBe(false);
	});

	it('prepares the clip of every sentence it will say', () => {
		const fake = fakeVoice(STEPS);
		sequenceOf(fake.voice).player.prepare(INTRO);
		expect(fake.prepared).toEqual(STEPS);

		const whole = fakeVoice([INTRO]);
		sequenceOf(whole.voice).player.prepare(INTRO);
		expect(whole.prepared).toEqual([INTRO]);
	});

	it('still shows each key in turn when the voice is turned off, and says so', async () => {
		const fake = fakeVoice(STEPS, false);
		const { player, shown, clock } = sequenceOf(fake.voice);

		const done = player.speak(INTRO);
		await settle();
		expect(shown).toEqual([0]);
		clock.advance(TURN_MS);
		await settle();
		expect(shown).toEqual([0, 1]);
		clock.advance(TURN_MS);
		await expect(done).resolves.toBe('disabled');
		expect(shown).toEqual([0, 1, null]);
		expect(fake.said).toEqual([]);
	});

	it('leaves any other text to the voice, and gives the hand back first', async () => {
		const other = 'Regarde toujours l’écran.';
		const fake = fakeVoice([...STEPS, other]);
		const { player, shown } = sequenceOf(fake.voice);

		void player.speak(INTRO);
		const said = player.speak(other);
		expect(shown).toEqual([0, null]);
		expect(fake.said).toEqual([STEPS[0], other]);
		fake.finish();
		await expect(said).resolves.toBe('played');
	});

	it('stops when disposed, and leaves the voice it was given alive', async () => {
		const fake = fakeVoice(STEPS);
		const { player, shown } = sequenceOf(fake.voice);

		const done = player.speak(INTRO);
		player.dispose();
		await expect(done).resolves.toBe('played');
		expect(shown).toEqual([0, null]);
		expect(fake.disposed()).toBe(false);
	});
});
