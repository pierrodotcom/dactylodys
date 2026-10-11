import { parseTraceFile, replayEvents } from '$lib/keyboard/trace';
import type { KeyboardTrace, RawInputEvent } from '$lib/keyboard/types';

export interface DetectedEnvironment {
	browser: string;
	browserVersion: string;
	os: string;
	osVersion: string;
}

export interface TracePrompt {
	readonly id: string;
	readonly title: string;
	readonly text: string;
	readonly instruction: string;
}

export interface RecordingContext {
	layoutId: string;
	keyboard: string;
	userAgent: string;
	environment: DetectedEnvironment;
	recordedAt: string;
}

export const UNKNOWN = 'unknown';

const BROWSERS: readonly (readonly [name: string, pattern: RegExp])[] = [
	['Edge', /\bEdg(?:e|A|iOS)?\/([\d.]+)/],
	['Opera', /\bOPR\/([\d.]+)/],
	['Firefox', /\b(?:Firefox|FxiOS)\/([\d.]+)/],
	['Chrome', /\b(?:Chrome|CriOS)\/([\d.]+)/],
	['Safari', /\bVersion\/([\d.]+).*\bSafari\//]
];

const SYSTEMS: readonly (readonly [name: string, pattern: RegExp])[] = [
	['Windows', /\bWindows NT ([\d.]+)/],
	['Android', /\bAndroid ([\d.]+)/],
	['iOS', /\b(?:iPhone|iPad|iPod).*?\bOS ([\d_]+)/],
	['ChromeOS', /\bCrOS \S+ ([\d.]+)/],
	['macOS', /\bMac OS X ([\d_.]+)/],
	['Linux', /\bLinux\b()/]
];

function firstMatch(
	userAgent: string,
	candidates: readonly (readonly [string, RegExp])[]
): [string, string] {
	for (const [name, pattern] of candidates) {
		const match = pattern.exec(userAgent);
		if (match) return [name, (match[1] ?? '').replaceAll('_', '.')];
	}
	return [UNKNOWN, ''];
}

export function detectEnvironment(userAgent: string): DetectedEnvironment {
	const [browser, browserVersion] = firstMatch(userAgent, BROWSERS);
	const [os, osVersion] = firstMatch(userAgent, SYSTEMS);
	return { browser, browserVersion, os, osVersion };
}

export function slugify(value: string): string {
	const slug = value
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return slug === '' ? UNKNOWN : slug;
}

export function traceFileName(
	layoutId: string,
	environment: DetectedEnvironment,
	date: string
): string {
	return `${layoutId}__${slugify(environment.os)}-${slugify(environment.browser)}__${date}.json`;
}

/** A recording that holds more than the key releases that follow focusing the field. */
export function isRecorded(events: readonly RawInputEvent[]): boolean {
	return events.some((event) => event.type !== 'keyup');
}

export function isIdentical(prompt: TracePrompt, events: readonly RawInputEvent[]): boolean {
	return replayEvents(events) === prompt.text;
}

const TIMESTAMP_DECIMALS = 1000;

function rebase(events: readonly RawInputEvent[]): RawInputEvent[] {
	const origin = events[0]?.timestamp ?? 0;
	return events.map((event) => ({
		...event,
		timestamp: Math.round((event.timestamp - origin) * TIMESTAMP_DECIMALS) / TIMESTAMP_DECIMALS
	}));
}

/** One trace per recorded prompt, validated like any trace file before it is offered. */
export function buildTraces(
	prompts: readonly TracePrompt[],
	runs: readonly (readonly RawInputEvent[])[],
	context: RecordingContext
): KeyboardTrace[] {
	const traces = prompts.flatMap((prompt, index): KeyboardTrace[] => {
		const events = runs[index] ?? [];
		if (!isRecorded(events)) return [];
		return [
			{
				schemaVersion: 1,
				layoutId: context.layoutId,
				expectedText: prompt.text,
				environment: {
					...context.environment,
					userAgent: context.userAgent,
					keyboard: context.keyboard,
					recordedAt: context.recordedAt
				},
				synthetic: false,
				events: rebase(events)
			}
		];
	});
	if (traces.length > 0) parseTraceFile(traces);
	return traces;
}

/** One event per line, so recorded files stay readable and diff well. */
export function serializeTraces(traces: readonly KeyboardTrace[]): string {
	const items = traces.map((trace) => {
		const { events, ...header } = trace;
		const lines = events.map((event) => `\t${JSON.stringify(event)}`).join(',\n');
		const body = JSON.stringify(header, null, '\t').slice(0, -2);
		return `${body},\n\t"events": [\n${lines}\n\t]\n}`;
	});
	return `[\n${items.map((item) => item.replace(/^/gm, '\t')).join(',\n')}\n]\n`;
}

function readText(record: Record<string, unknown>, key: string, where: string): string {
	const value = record[key];
	if (typeof value !== 'string' || value === '') {
		throw new Error(`Invalid trace prompts: ${where}.${key} must be a non-empty string.`);
	}
	return value;
}

export function parsePrompts(data: unknown): TracePrompt[] {
	const root = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
	if (root.schemaVersion !== 1) throw new Error('Invalid trace prompts: expected schemaVersion 1.');
	if (!Array.isArray(root.prompts) || root.prompts.length === 0) {
		throw new Error('Invalid trace prompts: expected a non-empty "prompts" array.');
	}
	const ids = new Set<string>();
	return root.prompts.map((item: unknown, index: number): TracePrompt => {
		const where = `prompts[${index}]`;
		const record = (typeof item === 'object' && item !== null ? item : {}) as Record<
			string,
			unknown
		>;
		const prompt = {
			id: readText(record, 'id', where),
			title: readText(record, 'title', where),
			text: readText(record, 'text', where),
			instruction: readText(record, 'instruction', where)
		};
		if (ids.has(prompt.id)) throw new Error(`Invalid trace prompts: duplicate id ${prompt.id}.`);
		ids.add(prompt.id);
		if (prompt.text !== prompt.text.normalize('NFC')) {
			throw new Error(`Invalid trace prompts: ${where}.text must be NFC.`);
		}
		return prompt;
	});
}
