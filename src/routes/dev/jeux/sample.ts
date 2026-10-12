import type { Exercise } from '$lib/engine/progression/types';
import sampleData from '../../../../content/common/dev/games-sample.json';

function fail(message: string): never {
	throw new Error(`gamesSample: ${message}`);
}

/** The exercise the test page gives to a game: a few fixed groups. */
export function parseSample(data: unknown): Exercise {
	if (typeof data !== 'object' || data === null) fail('expected an object');
	const record = data as Record<string, unknown>;
	if (record['schemaVersion'] !== 1) fail('schemaVersion must be 1');
	const lessonId = record['lessonId'];
	if (typeof lessonId !== 'string' || lessonId === '') fail('lessonId must be a text');
	const groups = record['groups'];
	if (
		!Array.isArray(groups) ||
		groups.length === 0 ||
		!groups.every((group) => typeof group === 'string' && group !== '')
	) {
		fail('groups must be a list of texts');
	}
	return { lessonId, groups: groups as string[] };
}

export const SAMPLE_EXERCISE: Exercise = parseSample(sampleData);
