import { describe, expect, it } from 'vitest';
import type { VoicePlayer } from '$lib/audio/voice-types';
import { lessonIds, findLesson } from '$lib/engine/progression/definition';
import type { LessonDefinition } from '$lib/engine/progression/types';
import { loadFingeringProfile } from '$lib/keyboard/registry';
import { progressionFor } from './content';
import { introText, silencing } from './intro-text';

const progression = progressionFor('fr-fr-azerty-pc');
if (!progression) throw new Error('Expected the progression of the PC layout');
const lessons = lessonIds(progression).flatMap((id) => findLesson(progression, id) ?? []);
const tenFingers = await loadFingeringProfile('ten-fingers-iso');
const reduced = await Promise.all([
	loadFingeringProfile('six-fingers-iso'),
	loadFingeringProfile('two-index-iso')
]);

function lessonWith(steps: boolean): LessonDefinition {
	const lesson = lessons.find((candidate) => (candidate.steps ?? []).length > 0 === steps);
	if (!lesson) throw new Error(`Expected a lesson ${steps ? 'with' : 'without'} short sentences`);
	return lesson;
}

describe('introText', () => {
	it('shows the written instruction of every lesson with ten fingers', () => {
		for (const lesson of lessons) {
			expect(introText(lesson, 'pc', tenFingers)).toEqual({ kind: 'whole', text: lesson.intro });
		}
	});

	it('shows the instruction written for the platform of the layout', () => {
		const forMac = lessons.find((lesson) => lesson.introByPlatform?.mac !== undefined);
		expect(forMac).toBeDefined();
		if (!forMac) return;
		expect(introText(forMac, 'mac', tenFingers)).toEqual({
			kind: 'whole',
			text: forMac.introByPlatform?.mac
		});
	});

	it.each(reduced.map((profile) => [profile.id, profile] as const))(
		'shows the short sentences of a lesson instead of its instruction with %s',
		(_id, fingering) => {
			const lesson = lessonWith(true);
			expect(introText(lesson, 'pc', fingering)).toEqual({
				kind: 'steps',
				sentences: (lesson.steps ?? []).map((step) => step.text)
			});
			// The same sentences on every platform: they never say where a Mac differs.
			expect(introText(lesson, 'mac', fingering)).toEqual(introText(lesson, 'pc', fingering));
		}
	);

	it.each(reduced.map((profile) => [profile.id, profile] as const))(
		'keeps the instruction of a lesson that has no short sentence with %s',
		(_id, fingering) => {
			const lesson = lessonWith(false);
			expect(introText(lesson, 'pc', fingering)).toEqual({ kind: 'whole', text: lesson.intro });
		}
	);
});

/** A voice that has a clip for every text but `missing`, and notes what it is asked. */
function fakeVoice(missing: readonly string[] = []) {
	const said: string[] = [];
	const prepared: string[] = [];
	let stops = 0;
	let disposed = false;
	const voice: VoicePlayer = {
		has: (text) => !missing.includes(text),
		prepare: (text) => void prepared.push(text),
		speak: (text) => {
			said.push(text);
			return Promise.resolve(missing.includes(text) ? 'unavailable' : 'played');
		},
		stop: () => void (stops += 1),
		dispose: () => void (disposed = true)
	};
	return { voice, said, prepared, stops: () => stops, disposed: () => disposed };
}

describe('silencing', () => {
	const WHOLE = 'Ton auriculaire droit appuie sur Entrée.';
	const SHORT = 'Elle fait passer le texte à la ligne.';

	it('never says the text it silences, even when it is recorded', async () => {
		const fake = fakeVoice();
		const voice = silencing(fake.voice, WHOLE);
		expect(voice.has(WHOLE)).toBe(false);
		voice.prepare(WHOLE);
		await expect(voice.speak(WHOLE)).resolves.toBe('unavailable');
		expect(fake.said).toEqual([]);
		expect(fake.prepared).toEqual([]);
	});

	it('stops what was being said when asked for the text it silences, as speaking does', async () => {
		const fake = fakeVoice();
		await silencing(fake.voice, WHOLE).speak(WHOLE);
		expect(fake.stops()).toBe(1);
	});

	it('says any other text as the voice does', async () => {
		const fake = fakeVoice([WHOLE]);
		const voice = silencing(fake.voice, WHOLE);
		expect(voice.has(SHORT)).toBe(true);
		voice.prepare(SHORT);
		await expect(voice.speak(SHORT)).resolves.toBe('played');
		expect(fake.said).toEqual([SHORT]);
		expect(fake.prepared).toEqual([SHORT]);
	});

	it('stops the voice it was given, and leaves it alive', () => {
		const fake = fakeVoice();
		const voice = silencing(fake.voice, WHOLE);
		voice.stop();
		voice.dispose();
		expect(fake.stops()).toBe(2);
		expect(fake.disposed()).toBe(false);
	});
});
