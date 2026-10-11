import { describe, expect, it } from 'vitest';
import { SOUND_IDS, SOUNDS } from './sounds';

const MAX_VOLUME = 0.25;
const MAX_FREQUENCY = 1200;
const MIN_FREQUENCY = 100;
const MAX_ERROR_FREQUENCY = 300;
const MAX_SOUND_SECONDS = 1;
const MAX_CORRECT_SECONDS = 0.2;

describe('sound table', () => {
	it.each(SOUND_IDS)('keeps %s moderate, short and never shrill', (id) => {
		const sound = SOUNDS[id];
		expect(sound.volume).toBeGreaterThan(0);
		expect(sound.volume).toBeLessThanOrEqual(MAX_VOLUME);
		expect(sound.notes.length).toBeGreaterThan(0);
		for (const note of sound.notes) {
			expect(note.frequency).toBeGreaterThanOrEqual(MIN_FREQUENCY);
			expect(note.frequency).toBeLessThanOrEqual(MAX_FREQUENCY);
			expect(note.start).toBeGreaterThanOrEqual(0);
			expect(note.start + note.duration).toBeLessThanOrEqual(MAX_SOUND_SECONDS);
			expect(sound.attack).toBeLessThan(note.duration);
			expect(sound.attack + sound.release).toBeLessThanOrEqual(note.duration);
		}
	});

	it('uses only soft waveforms', () => {
		for (const id of SOUND_IDS) {
			expect(['sine', 'triangle']).toContain(SOUNDS[id].waveform);
		}
	});

	it('makes the correct sound a single brief note', () => {
		expect(SOUNDS.correct.notes).toHaveLength(1);
		expect(SOUNDS.correct.notes[0]?.duration).toBeLessThanOrEqual(MAX_CORRECT_SECONDS);
	});

	it('makes the error sound lower than every other sound', () => {
		const lowestOfOthers = Math.min(
			...SOUND_IDS.filter((id) => id !== 'error').flatMap((id) =>
				SOUNDS[id].notes.map((note) => note.frequency)
			)
		);
		for (const note of SOUNDS.error.notes) {
			expect(note.frequency).toBeLessThanOrEqual(MAX_ERROR_FREQUENCY);
			expect(note.frequency).toBeLessThan(lowestOfOthers);
		}
		expect(SOUNDS.error.volume).toBeLessThanOrEqual(SOUNDS.correct.volume);
	});

	it('makes the group sound two notes', () => {
		expect(SOUNDS.groupDone.notes).toHaveLength(2);
	});

	it('makes the lesson sound a rising arpeggio', () => {
		const frequencies = SOUNDS.lessonDone.notes.map((note) => note.frequency);
		expect(frequencies.length).toBeGreaterThanOrEqual(3);
		expect(frequencies).toEqual([...frequencies].sort((a, b) => a - b));
		expect(new Set(frequencies).size).toBe(frequencies.length);
	});
});
