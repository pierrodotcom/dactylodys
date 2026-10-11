import { createInputNormalizer, splitGraphemes } from './input-adapter';
import type {
	KeyboardTrace,
	NormalizedKeystroke,
	RawInputEvent,
	RawInputEventType,
	TraceEnvironment
} from './types';

const EVENT_TYPES: readonly RawInputEventType[] = [
	'keydown',
	'keyup',
	'beforeinput',
	'input',
	'compositionstart',
	'compositionupdate',
	'compositionend'
];
const TRACE_KEYS = [
	'schemaVersion',
	'layoutId',
	'expectedText',
	'environment',
	'synthetic',
	'events'
];
const ENVIRONMENT_KEYS = [
	'browser',
	'browserVersion',
	'os',
	'osVersion',
	'userAgent',
	'keyboard',
	'recordedAt'
] as const;
const EVENT_STRING_KEYS = ['key', 'code', 'inputType'] as const;
const EVENT_BOOLEAN_KEYS = [
	'repeat',
	'isComposing',
	'shiftKey',
	'ctrlKey',
	'altKey',
	'metaKey',
	'altGraph'
] as const;
const EVENT_KEYS: readonly string[] = [
	'type',
	'timestamp',
	'data',
	...EVENT_STRING_KEYS,
	...EVENT_BOOLEAN_KEYS
];
const ISO_8601 = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;

function fail(path: string, problem: string): never {
	throw new Error(`Invalid keyboard trace at ${path}: ${problem}.`);
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return fail(path, 'expected an object');
	}
	return value as Record<string, unknown>;
}

function rejectUnknownKeys(
	record: Record<string, unknown>,
	allowed: readonly string[],
	path: string
) {
	const unknown = Object.keys(record).filter((key) => !allowed.includes(key));
	if (unknown.length > 0)
		fail(path, `unknown ${unknown.length > 1 ? 'properties' : 'property'} ${unknown.join(', ')}`);
}

function readString(record: Record<string, unknown>, key: string, path: string): string {
	const value = record[key];
	if (typeof value !== 'string') return fail(`${path}.${key}`, 'expected a string');
	return value;
}

function parseEnvironment(value: unknown, path: string): TraceEnvironment {
	const record = asRecord(value, path);
	rejectUnknownKeys(record, ENVIRONMENT_KEYS, path);
	const fields = Object.fromEntries(
		ENVIRONMENT_KEYS.map((key) => [key, readString(record, key, path)])
	) as unknown as TraceEnvironment;
	if (!ISO_8601.test(fields.recordedAt) || Number.isNaN(Date.parse(fields.recordedAt))) {
		fail(`${path}.recordedAt`, 'expected an ISO 8601 date');
	}
	return fields;
}

function parseEvent(value: unknown, path: string): RawInputEvent {
	const record = asRecord(value, path);
	rejectUnknownKeys(record, EVENT_KEYS, path);

	const type = record.type;
	if (typeof type !== 'string' || !EVENT_TYPES.includes(type as RawInputEventType)) {
		fail(`${path}.type`, `expected one of ${EVENT_TYPES.join(', ')}`);
	}
	const timestamp = record.timestamp;
	if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp < 0) {
		fail(`${path}.timestamp`, 'expected a finite number of milliseconds >= 0');
	}

	const event: Record<string, unknown> = { type, timestamp };
	for (const key of EVENT_STRING_KEYS) {
		if (record[key] === undefined) continue;
		event[key] = readString(record, key, path);
	}
	for (const key of EVENT_BOOLEAN_KEYS) {
		const flag = record[key];
		if (flag === undefined) continue;
		if (typeof flag !== 'boolean') fail(`${path}.${key}`, 'expected a boolean');
		event[key] = flag;
	}
	if (record.data !== undefined) {
		if (record.data !== null && typeof record.data !== 'string') {
			fail(`${path}.data`, 'expected a string or null');
		}
		event.data = record.data;
	}
	return event as unknown as RawInputEvent;
}

function parseEvents(value: unknown, path: string): RawInputEvent[] {
	if (!Array.isArray(value)) return fail(path, 'expected an array');
	let previous = 0;
	return value.map((item, index) => {
		const event = parseEvent(item, `${path}[${index}]`);
		if (event.timestamp < previous) {
			fail(`${path}[${index}].timestamp`, 'timestamps must not decrease');
		}
		previous = event.timestamp;
		return event;
	});
}

export function parseTrace(data: unknown): KeyboardTrace {
	const record = asRecord(data, 'trace');
	rejectUnknownKeys(record, TRACE_KEYS, 'trace');
	if (record.schemaVersion !== 1) fail('trace.schemaVersion', 'expected 1');
	const layoutId = readString(record, 'layoutId', 'trace');
	if (layoutId === '') fail('trace.layoutId', 'expected a non-empty string');
	const expectedText = readString(record, 'expectedText', 'trace');
	if (typeof record.synthetic !== 'boolean') fail('trace.synthetic', 'expected a boolean');
	return {
		schemaVersion: 1,
		layoutId,
		expectedText,
		environment: parseEnvironment(record.environment, 'trace.environment'),
		synthetic: record.synthetic,
		events: parseEvents(record.events, 'trace.events')
	};
}

/** Accepts one trace or an array of traces, as downloaded by the recording page. */
export function parseTraceFile(data: unknown): KeyboardTrace[] {
	if (!Array.isArray(data)) return [parseTrace(data)];
	if (data.length === 0) throw new Error('Invalid keyboard trace file: the array is empty.');
	return data.map((item, index) => {
		try {
			return parseTrace(item);
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			throw new Error(`Invalid keyboard trace file, trace ${index}: ${reason}`, { cause: error });
		}
	});
}

export function applyKeystrokeToText(text: string, keystroke: NormalizedKeystroke): string {
	switch (keystroke.kind) {
		case 'char':
			return text + (keystroke.char ?? '');
		case 'enter':
			return `${text}\n`;
		case 'backspace':
			return splitGraphemes(text).slice(0, -1).join('');
	}
}

export function replayEvents(events: readonly RawInputEvent[]): string {
	const normalizer = createInputNormalizer();
	let text = '';
	for (const event of events) {
		for (const keystroke of normalizer.push(event)) {
			text = applyKeystrokeToText(text, keystroke);
		}
	}
	return text;
}

export function replayTrace(trace: KeyboardTrace): string {
	return replayEvents(trace.events);
}
