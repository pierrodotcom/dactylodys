import type { SessionMetrics } from '../types';
import type { GhostRun, PacePoint } from './types';

const RUN_KEYS = ['recordedAt', 'charCount', 'activeMs', 'points'] as const;
const POINT_KEYS = ['correctChars', 'activeMs'] as const;
const DEFAULT_PATH = 'ghost';

function isCount(value: unknown): value is number {
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/** One point at the end of each group, from the metrics of the groups in the order they were typed. */
export function pacePoints(groups: readonly SessionMetrics[]): readonly PacePoint[] {
	let correctChars = 0;
	let activeMs = 0;
	return groups.map((metrics) => {
		correctChars += metrics.correctKeystrokes;
		activeMs += metrics.elapsedMs;
		return { correctChars, activeMs };
	});
}

/**
 * The run to keep for the next race, or `null` when the points give no pace to follow: nothing
 * typed, no time spent, or numbers that cannot be those of a play.
 */
export function toGhostRun(points: readonly PacePoint[], recordedAt: number): GhostRun | null {
	if (!isCount(recordedAt)) return null;
	const kept: PacePoint[] = [];
	let previous: PacePoint = { correctChars: 0, activeMs: 0 };
	for (const point of points) {
		if (!Number.isFinite(point.activeMs)) return null;
		const next = { correctChars: point.correctChars, activeMs: Math.round(point.activeMs) };
		if (!isCount(next.correctChars) || !isCount(next.activeMs)) return null;
		if (next.correctChars < previous.correctChars || next.activeMs < previous.activeMs) return null;
		kept.push(next);
		previous = next;
	}
	if (previous.correctChars === 0 || previous.activeMs === 0) return null;
	return {
		recordedAt,
		charCount: previous.correctChars,
		activeMs: previous.activeMs,
		points: kept
	};
}

/**
 * Share of the exercise, from 0 to 1, that the ghost has done `elapsedMs` after the start. Time
 * is counted like `PacePoint.activeMs`. A `paceFactor` under 1 slows the ghost down: it is done
 * `run.activeMs / paceFactor` after the start.
 */
export function ghostProgress(run: GhostRun, elapsedMs: number, paceFactor: number): number {
	if (!Number.isFinite(paceFactor) || paceFactor <= 0) {
		throw new RangeError('paceFactor must be a positive number');
	}
	// Compared before scaling: `(activeMs / paceFactor) * paceFactor` can fall just short of `activeMs`.
	if (elapsedMs >= run.activeMs / paceFactor) return 1;
	const ghostMs = elapsedMs * paceFactor;
	if (!(ghostMs > 0)) return 0;

	let fromChars = 0;
	let fromMs = 0;
	for (const point of run.points) {
		if (point.activeMs > ghostMs) {
			const share = (ghostMs - fromMs) / (point.activeMs - fromMs);
			const chars = fromChars + (point.correctChars - fromChars) * share;
			return Math.min(chars / run.charCount, 1);
		}
		fromChars = point.correctChars;
		fromMs = point.activeMs;
	}
	return 1;
}

function fail(path: string, message: string): never {
	throw new Error(`${path}: ${message}`);
}

function expectRecord(
	value: unknown,
	keys: readonly string[],
	path: string
): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		fail(path, 'expected an object');
	}
	const record = value as Record<string, unknown>;
	for (const name of Object.keys(record)) {
		if (!keys.includes(name)) fail(`${path}.${name}`, 'unknown property');
	}
	for (const name of keys) {
		if (!Object.hasOwn(record, name)) fail(`${path}.${name}`, 'missing property');
	}
	return record;
}

function expectCount(value: unknown, path: string): number {
	if (!isCount(value)) fail(path, 'expected a non-negative integer');
	return value;
}

/** Strict: stored runs are read back exactly as `toGhostRun` writes them. `path` prefixes the errors. */
export function parseGhostRun(data: unknown, path: string = DEFAULT_PATH): GhostRun {
	const record = expectRecord(data, RUN_KEYS, path);
	const rawPoints = record['points'];
	if (!Array.isArray(rawPoints) || rawPoints.length === 0) {
		fail(`${path}.points`, 'expected a non-empty array');
	}

	const points: PacePoint[] = [];
	let previous: PacePoint = { correctChars: 0, activeMs: 0 };
	rawPoints.forEach((raw: unknown, index) => {
		const pointPath = `${path}.points[${index}]`;
		const point = expectRecord(raw, POINT_KEYS, pointPath);
		const next = {
			correctChars: expectCount(point['correctChars'], `${pointPath}.correctChars`),
			activeMs: expectCount(point['activeMs'], `${pointPath}.activeMs`)
		};
		if (next.correctChars < previous.correctChars) {
			fail(`${pointPath}.correctChars`, 'expected a count that does not go down');
		}
		if (next.activeMs < previous.activeMs) {
			fail(`${pointPath}.activeMs`, 'expected a time that does not go down');
		}
		points.push(next);
		previous = next;
	});

	const charCount = expectCount(record['charCount'], `${path}.charCount`);
	if (charCount === 0 || charCount !== previous.correctChars) {
		fail(`${path}.charCount`, 'expected the positive count of the last point');
	}
	const activeMs = expectCount(record['activeMs'], `${path}.activeMs`);
	if (activeMs === 0 || activeMs !== previous.activeMs) {
		fail(`${path}.activeMs`, 'expected the positive time of the last point');
	}
	return {
		recordedAt: expectCount(record['recordedAt'], `${path}.recordedAt`),
		charCount,
		activeMs,
		points
	};
}
