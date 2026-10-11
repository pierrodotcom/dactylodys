import { readdirSync, readFileSync } from 'node:fs';
import { parseProgression } from './definition';
import type { ProgressionDefinition, Rng } from './types';

const CONTENT_DIR = 'content';
const PROGRESSION_DIR = 'progression';

export interface ProgressionFile {
	readonly path: string;
	readonly language: string;
	readonly slug: string;
	readonly data: unknown;
}

function jsonNamesIn(dir: string): string[] {
	try {
		return readdirSync(dir)
			.filter((name) => name.endsWith('.json'))
			.sort();
	} catch {
		return [];
	}
}

export function listProgressionFiles(): ProgressionFile[] {
	const files: ProgressionFile[] = [];
	for (const language of readdirSync(CONTENT_DIR, { withFileTypes: true })) {
		if (!language.isDirectory()) continue;
		const dir = `${CONTENT_DIR}/${language.name}/${PROGRESSION_DIR}`;
		for (const name of jsonNamesIn(dir)) {
			const path = `${dir}/${name}`;
			files.push({
				path,
				language: language.name,
				slug: name.replace(/\.json$/, ''),
				data: JSON.parse(readFileSync(path, 'utf8'))
			});
		}
	}
	return files;
}

export interface ShippedProgression {
	readonly file: string;
	readonly raw: unknown;
	readonly progression: ProgressionDefinition;
}

export function loadShippedProgressions(): ShippedProgression[] {
	return listProgressionFiles().map(({ path, data }) => ({
		file: path,
		raw: data,
		progression: parseProgression(data)
	}));
}

/** Deterministic generator (mulberry32) so that a failing seed can be replayed. */
export function seededRng(seed: number): Rng {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function deepFreeze<T>(value: T): T {
	if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
		Object.freeze(value);
		for (const child of Object.values(value)) {
			deepFreeze(child);
		}
	}
	return value;
}

export function clone<T>(value: T): T {
	return structuredClone(value);
}
