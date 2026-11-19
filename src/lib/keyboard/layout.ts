import type {
	CharIndex,
	DeadKeyDefinition,
	KeyboardGeometry,
	KeyCode,
	KeyLevels,
	KeyOutput,
	KeyPress,
	KeySequence,
	LayoutDefinition,
	LayoutPlatform,
	LayoutSource,
	ModifierLevel
} from './types';

/** The platforms a layout is made for: the keys and their modifiers differ from one to the other. */
export const LAYOUT_PLATFORMS: readonly LayoutPlatform[] = ['pc', 'mac'];
const GEOMETRIES: readonly KeyboardGeometry[] = ['iso', 'ansi'];
const LEVELS: readonly ModifierLevel[] = ['base', 'shift', 'altgr', 'shiftAltgr'];
const LAYOUT_ID_PATTERN = /^[a-z]{2,3}-[a-z]{2}-[a-z0-9]+-[a-z]+$/;
const KEY_CODE_PATTERN = /^[A-Z][A-Za-z0-9]*$/;
const SPACE = ' ';
const LINE_BREAK_PATTERN = /^[\r\n]+$/;

const segmenter = new Intl.Segmenter('und', { granularity: 'grapheme' });

function graphemesOf(text: string): string[] {
	return Array.from(segmenter.segment(text), (part) => part.segment);
}

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

function expectString(value: unknown, path: string): string {
	if (typeof value !== 'string' || value === '') fail(path, 'expected a non-empty string');
	return value;
}

function expectOneOf<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
	const found = allowed.find((candidate) => candidate === value);
	if (found === undefined) fail(path, `expected one of ${allowed.join(', ')}`);
	return found;
}

function expectGrapheme(value: unknown, path: string): string {
	const text = expectString(value, path).normalize('NFC');
	if (graphemesOf(text).length !== 1) fail(path, 'expected exactly one character');
	return text;
}

function rejectUnknown(record: Record<string, unknown>, allowed: readonly string[], path: string) {
	for (const name of Object.keys(record)) {
		if (!allowed.includes(name)) fail(`${path}.${name}`, 'unknown property');
	}
}

function isAbsoluteUrl(value: string): boolean {
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
}

function parseSource(value: unknown, path: string): LayoutSource {
	const record = expectRecord(value, path);
	rejectUnknown(record, ['name', 'url', 'license'], path);
	const url = expectString(record['url'], `${path}.url`);
	if (!isAbsoluteUrl(url)) fail(`${path}.url`, 'expected an absolute URL');
	return {
		name: expectString(record['name'], `${path}.name`),
		url,
		license: expectString(record['license'], `${path}.license`)
	};
}

function parseOutput(
	value: unknown,
	deadKeyNames: ReadonlySet<string>,
	referenced: Set<string>,
	path: string
): KeyOutput {
	if (typeof value === 'string') return expectGrapheme(value, path);
	const record = expectRecord(value, path);
	rejectUnknown(record, ['dead'], path);
	const dead = expectString(record['dead'], `${path}.dead`);
	if (!deadKeyNames.has(dead)) fail(`${path}.dead`, `no dead key "${dead}" in deadKeys`);
	referenced.add(dead);
	return { dead };
}

function parseKeyLevels(
	value: unknown,
	deadKeyNames: ReadonlySet<string>,
	referenced: Set<string>,
	path: string
): KeyLevels {
	const record = expectRecord(value, path);
	rejectUnknown(record, LEVELS, path);
	const levels = LEVELS.flatMap((level) =>
		Object.hasOwn(record, level)
			? [[level, parseOutput(record[level], deadKeyNames, referenced, `${path}.${level}`)] as const]
			: []
	);
	if (levels.length === 0) fail(path, 'expected at least one level');
	return Object.fromEntries(levels);
}

function parseDeadKey(value: unknown, path: string): DeadKeyDefinition {
	const record = expectRecord(value, path);
	rejectUnknown(record, ['standalone', 'compositions'], path);
	const compositions = expectRecord(record['compositions'], `${path}.compositions`);
	return {
		standalone: expectGrapheme(record['standalone'], `${path}.standalone`),
		compositions: Object.fromEntries(
			Object.entries(compositions).map(([base, composed]) => [
				expectGrapheme(base, `${path}.compositions key "${base}"`),
				expectGrapheme(composed, `${path}.compositions.${base}`)
			])
		)
	};
}

function parsePress(
	value: unknown,
	keys: Readonly<Record<KeyCode, KeyLevels>>,
	path: string
): KeyPress {
	const record = expectRecord(value, path);
	rejectUnknown(record, ['code', 'level'], path);
	const code = expectString(record['code'], `${path}.code`);
	if (!Object.hasOwn(keys, code)) fail(`${path}.code`, `no key "${code}" in keys`);
	const level = expectOneOf(record['level'], LEVELS, `${path}.level`);
	if (keys[code]?.[level] === undefined) {
		fail(`${path}.level`, `key "${code}" has no ${level} level`);
	}
	return { code, level };
}

function sameWay(first: KeySequence, second: KeySequence): boolean {
	return (
		first.length === second.length &&
		first.every((press, i) => press.code === second[i]?.code && press.level === second[i]?.level)
	);
}

/** The way to show for each character written in several ways: one the keys really write. */
function parsePreferred(
	value: unknown,
	layout: LayoutDefinition,
	path: string
): Record<string, KeySequence> {
	const record = expectRecord(value, path);
	const index = buildCharIndex(layout);
	const preferred: Record<string, KeySequence> = {};
	for (const [raw, rawWay] of Object.entries(record)) {
		const char = expectGrapheme(raw, `${path} key "${raw}"`);
		if (Object.hasOwn(preferred, char)) fail(path, `"${char}" is given twice`);
		const wayPath = `${path}.${raw}`;
		if (!Array.isArray(rawWay) || rawWay.length === 0) {
			fail(wayPath, 'expected a non-empty list of key presses');
		}
		const way = rawWay.map((press, i) => parsePress(press, layout.keys, `${wayPath}[${i}]`));
		if (!(index.get(char) ?? []).some((written) => sameWay(written, way))) {
			fail(wayPath, `these key presses do not write "${char}"`);
		}
		preferred[char] = way;
	}
	return preferred;
}

export function parseLayout(data: unknown): LayoutDefinition {
	const root = expectRecord(data, 'layout');
	rejectUnknown(
		root,
		[
			'schemaVersion',
			'id',
			'locale',
			'platform',
			'geometry',
			'sources',
			'keys',
			'deadKeys',
			'preferred'
		],
		'layout'
	);
	if (root['schemaVersion'] !== 1) fail('layout.schemaVersion', 'expected 1');

	const platform = expectOneOf(root['platform'], LAYOUT_PLATFORMS, 'layout.platform');
	const id = expectString(root['id'], 'layout.id');
	if (!LAYOUT_ID_PATTERN.test(id) || !id.endsWith(`-${platform}`)) {
		fail('layout.id', `expected <language>-<country>-<variant>-${platform}`);
	}
	const locale = expectString(root['locale'], 'layout.locale');
	try {
		Intl.getCanonicalLocales(locale);
	} catch {
		fail('layout.locale', 'expected a BCP 47 language tag');
	}
	const geometry = expectOneOf(root['geometry'], GEOMETRIES, 'layout.geometry');

	if (!Array.isArray(root['sources']) || root['sources'].length === 0) {
		fail('layout.sources', 'expected a non-empty array');
	}
	const sources = (root['sources'] as unknown[]).map((source, i) =>
		parseSource(source, `layout.sources[${i}]`)
	);

	const rawDeadKeys = expectRecord(root['deadKeys'], 'layout.deadKeys');
	const deadKeys = Object.fromEntries(
		Object.entries(rawDeadKeys).map(([name, def]) => [
			name,
			parseDeadKey(def, `layout.deadKeys.${name}`)
		])
	);
	const deadKeyNames = new Set(Object.keys(deadKeys));

	const rawKeys = expectRecord(root['keys'], 'layout.keys');
	if (Object.keys(rawKeys).length === 0) fail('layout.keys', 'expected at least one key');
	const referenced = new Set<string>();
	const keys = Object.fromEntries(
		Object.entries(rawKeys).map(([code, levels]) => {
			if (!KEY_CODE_PATTERN.test(code)) fail(`layout.keys.${code}`, 'invalid key code');
			return [code, parseKeyLevels(levels, deadKeyNames, referenced, `layout.keys.${code}`)];
		})
	);
	for (const name of deadKeyNames) {
		if (!referenced.has(name)) fail(`layout.deadKeys.${name}`, 'dead key is never referenced');
	}

	const layout: LayoutDefinition = {
		schemaVersion: 1,
		id,
		locale,
		platform,
		geometry,
		sources,
		keys,
		deadKeys
	};
	if (root['preferred'] === undefined) return layout;
	return { ...layout, preferred: parsePreferred(root['preferred'], layout, 'layout.preferred') };
}

export function buildCharIndex(layout: LayoutDefinition): CharIndex {
	const index = new Map<string, KeySequence[]>();
	const direct = new Map<string, KeySequence[]>();
	const deadPresses = new Map<string, KeySequence[]>();

	function add(table: Map<string, KeySequence[]>, char: string, sequence: KeySequence) {
		const list = table.get(char);
		if (list) list.push(sequence);
		else table.set(char, [sequence]);
	}

	for (const [code, levels] of Object.entries(layout.keys)) {
		for (const level of LEVELS) {
			const output = levels[level];
			if (output === undefined) continue;
			const press: KeyPress = { code, level };
			if (typeof output === 'string') {
				const char = output.normalize('NFC');
				add(index, char, [press]);
				add(direct, char, [press]);
			} else {
				add(deadPresses, output.dead, [press]);
			}
		}
	}

	function singlePresses(char: string): KeyPress[] {
		return (direct.get(char) ?? []).flatMap((sequence) => sequence);
	}

	for (const [name, definition] of Object.entries(layout.deadKeys)) {
		const deadOnes = (deadPresses.get(name) ?? []).flatMap((sequence) => sequence);
		for (const dead of deadOnes) {
			for (const space of singlePresses(SPACE)) {
				add(index, definition.standalone.normalize('NFC'), [dead, space]);
			}
			for (const [base, composed] of Object.entries(definition.compositions)) {
				for (const press of singlePresses(base.normalize('NFC'))) {
					add(index, composed.normalize('NFC'), [dead, press]);
				}
			}
		}
	}

	// The way the layout prefers comes first: the one the keyboard drawn shows.
	for (const [char, way] of Object.entries(layout.preferred ?? {})) {
		const ways = index.get(char.normalize('NFC'));
		const at = ways?.findIndex((written) => sameWay(written, way)) ?? -1;
		if (ways !== undefined && at > 0) ways.unshift(...ways.splice(at, 1));
	}

	return index;
}

/**
 * The key that writes a character: the last press of the first way the layout produces it, so the
 * letter typed after a dead key. A capital that the layout writes with no key of its own (Caps
 * Lock) is found on the key of its small letter. `null` when no key writes the character.
 */
export function keyCodeForChar(index: CharIndex, char: string): KeyCode | null {
	const typed = char.normalize('NFC');
	const sequence = index.get(typed)?.[0] ?? index.get(typed.toLowerCase())?.[0];
	return sequence?.at(-1)?.code ?? null;
}

export function findUnproducible(index: CharIndex, text: string): string[] {
	const missing = new Set<string>();
	for (const grapheme of graphemesOf(text.normalize('NFC'))) {
		if (LINE_BREAK_PATTERN.test(grapheme)) continue;
		if (!index.has(grapheme)) missing.add(grapheme);
	}
	return [...missing];
}
