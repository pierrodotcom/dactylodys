import type { ConsolidationRules } from './consolidation';
import type { SupportRules } from './support';
import type { WordLevel } from './types';

/**
 * What the result of a lesson proposes after a play (`content/common/result-rules.json`): one
 * more play to tame new keys, and help for a child who stumbles. Data, never constants in the code.
 */
export interface ResultRules {
	readonly schemaVersion: 1;
	readonly consolidation: ConsolidationRules;
	readonly support: SupportRules;
}

const LEVELS: readonly WordLevel[] = [1, 2, 3];

function fail(path: string, message: string): never {
	throw new Error(`${path}: ${message}`);
}

function expectRecord(value: unknown, path: string, names: readonly string[]) {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		fail(path, 'expected an object');
	}
	const record = value as Record<string, unknown>;
	for (const name of Object.keys(record)) {
		if (!names.includes(name)) fail(`${path}.${name}`, 'unknown property');
	}
	return record;
}

function expectInteger(value: unknown, path: string, min: number): number {
	if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min) {
		fail(path, `expected an integer of at least ${min}`);
	}
	return value;
}

function expectNumber(value: unknown, path: string, min: number, below: number): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value >= below) {
		fail(path, `expected a number from ${min} up to, but not including, ${below}`);
	}
	return value;
}

function parseConsolidation(data: unknown, path: string): ConsolidationRules {
	const root = expectRecord(data, path, ['minRecentAttempts', 'maxErrorRate', 'maxKeys']);
	return {
		minRecentAttempts: expectInteger(root['minRecentAttempts'], `${path}.minRecentAttempts`, 0),
		maxErrorRate: expectNumber(root['maxErrorRate'], `${path}.maxErrorRate`, 0, 1),
		maxKeys: expectInteger(root['maxKeys'], `${path}.maxKeys`, 1)
	};
}

function parseSupport(data: unknown, path: string): SupportRules {
	const root = expectRecord(data, path, ['afterFailedPlays', 'closeMargin', 'wordLevel']);
	const wordLevel = LEVELS.find((level) => level === root['wordLevel']);
	if (wordLevel === undefined) fail(`${path}.wordLevel`, `expected one of ${LEVELS.join(', ')}`);
	return {
		afterFailedPlays: expectInteger(root['afterFailedPlays'], `${path}.afterFailedPlays`, 1),
		closeMargin: expectNumber(root['closeMargin'], `${path}.closeMargin`, 0, 100),
		wordLevel
	};
}

export function parseResultRules(data: unknown): ResultRules {
	const root = expectRecord(data, 'resultRules', ['schemaVersion', 'consolidation', 'support']);
	if (root['schemaVersion'] !== 1) fail('resultRules.schemaVersion', 'expected 1');
	return {
		schemaVersion: 1,
		consolidation: parseConsolidation(root['consolidation'], 'resultRules.consolidation'),
		support: parseSupport(root['support'], 'resultRules.support')
	};
}
