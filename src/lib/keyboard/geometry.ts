import type {
	GeometryKey,
	GeometryRow,
	KeyboardGeometry,
	KeyboardGeometryDefinition,
	KeyCode
} from './types';

const GEOMETRIES: readonly KeyboardGeometry[] = ['iso', 'ansi'];
const KEY_CODE_PATTERN = /^[A-Z][A-Za-z0-9]*$/;
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Real keys come in quarter-unit sizes (1, 1.25, 1.5, 1.75, 2, 2.25...). */
const WIDTH_STEP = 0.25;
const MAX_WIDTH = 16;

function fail(path: string, message: string): never {
	throw new Error(`${path}: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function expectRecord(value: unknown, path: string): Record<string, unknown> {
	if (!isRecord(value)) fail(path, 'expected an object');
	return value;
}

function expectArray(value: unknown, path: string): unknown[] {
	if (!Array.isArray(value) || value.length === 0) fail(path, 'expected a non-empty array');
	return value;
}

function rejectUnknown(record: Record<string, unknown>, allowed: readonly string[], path: string) {
	for (const name of Object.keys(record)) {
		if (!allowed.includes(name)) fail(`${path}.${name}`, 'unknown property');
	}
}

function expectQuarterUnits(value: unknown, min: number, path: string): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, 'expected a number');
	if (value < min || value > MAX_WIDTH)
		fail(path, `expected a value between ${min} and ${MAX_WIDTH}`);
	if (value % WIDTH_STEP !== 0) fail(path, `expected a multiple of ${WIDTH_STEP}`);
	return value;
}

function parseKey(value: unknown, seen: Set<KeyCode>, path: string): GeometryKey {
	const record = expectRecord(value, path);
	rejectUnknown(record, ['code', 'width'], path);
	const code = record['code'];
	if (typeof code !== 'string' || !KEY_CODE_PATTERN.test(code))
		fail(`${path}.code`, 'invalid key code');
	if (seen.has(code)) fail(`${path}.code`, `duplicate key ${code}`);
	seen.add(code);
	return { code, width: expectQuarterUnits(record['width'], WIDTH_STEP, `${path}.width`) };
}

function parseRow(value: unknown, seen: Set<KeyCode>, path: string): GeometryRow {
	const record = expectRecord(value, path);
	rejectUnknown(record, ['offset', 'keys'], path);
	return {
		offset: expectQuarterUnits(record['offset'], 0, `${path}.offset`),
		keys: expectArray(record['keys'], `${path}.keys`).map((key, i) =>
			parseKey(key, seen, `${path}.keys[${i}]`)
		)
	};
}

export function parseGeometry(data: unknown): KeyboardGeometryDefinition {
	const root = expectRecord(data, 'geometry');
	rejectUnknown(root, ['schemaVersion', 'id', 'geometry', 'rows'], 'geometry');
	if (root['schemaVersion'] !== 1) fail('geometry.schemaVersion', 'expected 1');
	const id = root['id'];
	if (typeof id !== 'string' || !ID_PATTERN.test(id))
		fail('geometry.id', 'expected a kebab-case id');
	const geometry = GEOMETRIES.find((candidate) => candidate === root['geometry']);
	if (geometry === undefined) fail('geometry.geometry', `expected one of ${GEOMETRIES.join(', ')}`);

	const seen = new Set<KeyCode>();
	const rows = expectArray(root['rows'], 'geometry.rows').map((row, i) =>
		parseRow(row, seen, `geometry.rows[${i}]`)
	);
	return { schemaVersion: 1, id, geometry, rows };
}
