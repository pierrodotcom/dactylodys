import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const PRIMITIVES_FILE = 'tokens/primitives.tokens.json';
const CONTENT_DIR = 'content';
const SEMANTIC_FILE = 'tokens/semantic.tokens.json';
const THEME_FILES = { dark: 'tokens/themes/dark.tokens.json' } as const;

const BODY_TEXT_MIN = 7;
const TEXT_MIN = 4.5;
const NON_TEXT_MIN = 3;

type ContrastPair = { foreground: string; background: string; min: number };

const SURFACES = ['color.surface.base', 'color.surface.raised', 'color.surface.sunken'];
const TEXT_SURFACES = SURFACES.slice(0, 2);

const FINGERS = [
	'left-pinky',
	'left-ring',
	'left-middle',
	'left-index',
	'left-thumb',
	'right-thumb',
	'right-index',
	'right-middle',
	'right-ring',
	'right-pinky'
];
const FINGER_COLORS = FINGERS.map((finger) => `color.finger.${finger}`);
/** Smallest CIELAB distance between two finger colors, for normal vision and each color blindness. */
const FINGER_MIN_DISTANCE = 12;

const CONTRAST_PAIRS: ContrastPair[] = [
	{ foreground: 'color.text.primary', background: 'color.surface.base', min: BODY_TEXT_MIN },
	...SURFACES.slice(1).map((background) => ({
		foreground: 'color.text.primary',
		background,
		min: TEXT_MIN
	})),
	...SURFACES.map((background) => ({
		foreground: 'color.text.secondary',
		background,
		min: TEXT_MIN
	})),
	...SURFACES.map((background) => ({ foreground: 'color.accent.base', background, min: TEXT_MIN })),
	{ foreground: 'color.text.on-accent', background: 'color.accent.base', min: TEXT_MIN },
	{ foreground: 'color.text.on-accent', background: 'color.accent.hover', min: TEXT_MIN },
	{ foreground: 'color.success.text', background: 'color.success.surface', min: TEXT_MIN },
	{ foreground: 'color.error.text', background: 'color.error.surface', min: TEXT_MIN },
	...SURFACES.map((background) => ({
		foreground: 'color.focus.ring',
		background,
		min: NON_TEXT_MIN
	})),
	{ foreground: 'color.border.strong', background: 'color.surface.base', min: NON_TEXT_MIN },
	...FINGER_COLORS.map((background) => ({
		foreground: 'color.key.text-on-finger',
		background,
		min: TEXT_MIN
	})),
	{ foreground: 'color.key.text', background: 'color.key.surface', min: TEXT_MIN },
	{ foreground: 'color.key.border', background: 'color.surface.sunken', min: NON_TEXT_MIN },
	...SURFACES.map((background) => ({
		foreground: 'color.key.target-outline',
		background,
		min: NON_TEXT_MIN
	})),
	...SURFACES.map((background) => ({
		foreground: 'color.oops.outline',
		background,
		min: NON_TEXT_MIN
	})),
	...TEXT_SURFACES.map((background) => ({
		foreground: 'color.typing.done',
		background,
		min: TEXT_MIN
	})),
	...TEXT_SURFACES.map((background) => ({
		foreground: 'color.typing.current-frame',
		background,
		min: NON_TEXT_MIN
	})),
	{ foreground: 'color.text.primary', background: 'color.typing.current-surface', min: TEXT_MIN }
];

/** Every colour the companion can take, in every reward catalogue: each needs its own tokens. */
const REWARD_CATALOGUES = readdirSync(CONTENT_DIR, { recursive: true, encoding: 'utf8' })
	.map((path) => path.replaceAll('\\', '/'))
	.filter((path) => /^[^/]+\/rewards\/[^/]+\.json$/.test(path));
const COMPANION_COLOR_IDS = [
	...new Set(
		REWARD_CATALOGUES.flatMap(
			(path) =>
				(JSON.parse(readFileSync(`${CONTENT_DIR}/${path}`, 'utf8')) as { colors: { id: string }[] })
					.colors
		).map((color) => color.id)
	)
];
const COMPANION_PARTS = ['body', 'belly', 'plate', 'cheek'];
/** The line is drawn over these parts: the shape must stay readable on each colour. */
const OUTLINED_PARTS = ['body', 'belly', 'plate'];

type Token = { value: unknown; type: string | undefined };
type TokenMap = Map<string, Token>;

const REFERENCE = /\{([^{}]+)\}/g;
const WHOLE_REFERENCE = /^\{([^{}]+)\}$/;
const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function isRecord(node: unknown): node is Record<string, unknown> {
	return typeof node === 'object' && node !== null && !Array.isArray(node);
}

function collectTokens(
	node: Record<string, unknown>,
	path: string[],
	inheritedType: string | undefined,
	tokens: TokenMap,
	problems: string[]
): void {
	const type = typeof node.$type === 'string' ? node.$type : inheritedType;
	if ('$value' in node) {
		tokens.set(path.join('.'), { value: node.$value, type });
		return;
	}
	const children = Object.entries(node).filter(([key]) => !key.startsWith('$'));
	if (children.length === 0) {
		problems.push(`${path.join('.')}: no $value`);
	}
	for (const [key, child] of children) {
		if (isRecord(child)) {
			collectTokens(child, [...path, key], type, tokens, problems);
		} else {
			problems.push(`${[...path, key].join('.')}: not a token`);
		}
	}
}

function loadTokens(path: string): { tokens: TokenMap; problems: string[] } {
	const root: unknown = JSON.parse(readFileSync(path, 'utf8'));
	const tokens: TokenMap = new Map();
	const problems: string[] = [];
	if (isRecord(root)) {
		collectTokens(root, [], undefined, tokens, problems);
	} else {
		problems.push(`${path}: root is not an object`);
	}
	return { tokens, problems };
}

function referencesIn(value: unknown): string[] {
	if (typeof value === 'string') {
		return [...value.matchAll(REFERENCE)].flatMap((match) => (match[1] ? [match[1]] : []));
	}
	if (Array.isArray(value)) {
		return value.flatMap(referencesIn);
	}
	if (isRecord(value)) {
		return Object.values(value).flatMap(referencesIn);
	}
	return [];
}

function resolveValue(value: unknown, tokens: TokenMap, trail: string[] = []): unknown {
	const target = typeof value === 'string' ? value.match(WHOLE_REFERENCE)?.[1] : undefined;
	if (target === undefined) {
		return value;
	}
	if (trail.includes(target)) {
		throw new Error(`Circular reference: ${[...trail, target].join(' -> ')}`);
	}
	const token = tokens.get(target);
	if (!token) {
		throw new Error(`Unknown reference: ${target}`);
	}
	return resolveValue(token.value, tokens, [...trail, target]);
}

function parseHexColor(hex: string): [number, number, number] {
	if (!HEX_COLOR.test(hex)) {
		throw new Error(`Unsupported color: ${hex}`);
	}
	const digits = hex.slice(1);
	const full = digits.length === 3 ? [...digits].map((digit) => digit + digit).join('') : digits;
	const [red, green, blue] = [0, 2, 4].map((start) => parseInt(full.slice(start, start + 2), 16));
	return [red ?? 0, green ?? 0, blue ?? 0];
}

function relativeLuminance(hex: string): number {
	const [red, green, blue] = parseHexColor(hex).map((channel) => {
		const value = channel / 255;
		return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0);
}

function contrastRatio(first: string, second: string): number {
	const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
	const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
	return (lighter + 0.05) / (darker + 0.05);
}

type Matrix = readonly [
	readonly [number, number, number],
	readonly [number, number, number],
	readonly [number, number, number]
];

/** Machado et al. (2009), severity 1, applied to linear RGB. */
const VISIONS: Record<string, Matrix> = {
	normal: [
		[1, 0, 0],
		[0, 1, 0],
		[0, 0, 1]
	],
	protanopia: [
		[0.152286, 1.052583, -0.204868],
		[0.114503, 0.786281, 0.099216],
		[-0.003882, -0.048116, 1.051998]
	],
	deuteranopia: [
		[0.367322, 0.860646, -0.227968],
		[0.280085, 0.672501, 0.047413],
		[-0.01182, 0.04294, 0.968881]
	],
	tritanopia: [
		[1.255528, -0.076749, -0.178779],
		[-0.078411, 0.930809, 0.147602],
		[0.004733, 0.691367, 0.3039]
	]
};

function toLab(hex: string, matrix: Matrix): [number, number, number] {
	const linear = parseHexColor(hex).map((channel) => {
		const value = channel / 255;
		return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	});
	const [red, green, blue] = matrix.map((row) =>
		Math.min(
			1,
			Math.max(
				0,
				row.reduce((sum, factor, i) => sum + factor * (linear[i] ?? 0), 0)
			)
		)
	);
	const x = (0.4124 * (red ?? 0) + 0.3576 * (green ?? 0) + 0.1805 * (blue ?? 0)) / 0.95047;
	const y = 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0);
	const z = (0.0193 * (red ?? 0) + 0.1192 * (green ?? 0) + 0.9505 * (blue ?? 0)) / 1.08883;
	const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
	return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

function labDistance(first: string, second: string, matrix: Matrix): number {
	const [l1, a1, b1] = toLab(first, matrix);
	const [l2, a2, b2] = toLab(second, matrix);
	return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

const primitives = loadTokens(PRIMITIVES_FILE);
const semantic = loadTokens(SEMANTIC_FILE);
const darkTheme = loadTokens(THEME_FILES.dark);

const themes = [{ name: 'dark', path: THEME_FILES.dark, ...darkTheme }];
const allFiles = [
	{ path: PRIMITIVES_FILE, ...primitives },
	{ path: SEMANTIC_FILE, ...semantic },
	...themes
];
const contrastThemes = [{ name: 'light', overrides: new Map<string, Token>() }].concat(
	themes.map((theme) => ({ name: theme.name, overrides: theme.tokens }))
);

const referenceTargets: TokenMap = new Map([...primitives.tokens, ...semantic.tokens]);

function themeColor(overrides: TokenMap, name: string): string {
	const token = overrides.get(name) ?? semantic.tokens.get(name);
	if (!token) {
		throw new Error(`Unknown token: ${name}`);
	}
	const value = resolveValue(token.value, referenceTargets);
	if (typeof value !== 'string') {
		throw new Error(`Token ${name} does not resolve to a color`);
	}
	return value;
}

describe('contrast helpers', () => {
	it('computes 21:1 for black on white', () => {
		expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
	});

	it('computes 1:1 for identical colors', () => {
		expect(contrastRatio('#7a6d58', '#7a6d58')).toBeCloseTo(1, 5);
	});

	it('is symmetric and accepts short hex notation', () => {
		expect(contrastRatio('#fff', '#767676')).toBeCloseTo(contrastRatio('#767676', '#ffffff'), 5);
		expect(contrastRatio('#767676', '#ffffff')).toBeGreaterThan(4.5);
	});

	it('rejects colors that are not hexadecimal', () => {
		expect(() => parseHexColor('teal')).toThrow();
	});
});

describe.each(allFiles)('$path', ({ tokens, problems }) => {
	it('contains only well-formed tokens', () => {
		expect(problems).toEqual([]);
		expect(tokens.size).toBeGreaterThan(0);
	});

	it('gives every token a $value and a $type', () => {
		const untyped = [...tokens].filter(([, token]) => !token.type || token.value === undefined);
		expect(untyped.map(([name]) => name)).toEqual([]);
	});

	it('only references existing tokens', () => {
		const unknown = [...tokens].flatMap(([name, token]) =>
			referencesIn(token.value)
				.filter((target) => !referenceTargets.has(target))
				.map((target) => `${name} -> ${target}`)
		);
		expect(unknown).toEqual([]);
	});

	it('has no circular reference', () => {
		for (const [, token] of tokens) {
			expect(() => resolveValue(token.value, referenceTargets)).not.toThrow();
		}
	});
});

describe.each(themes)('theme $name', (theme) => {
	it('only redefines existing semantic tokens', () => {
		const foreign = [...theme.tokens.keys()].filter((name) => !semantic.tokens.has(name));
		expect(foreign).toEqual([]);
	});

	it('keeps the type of the tokens it redefines', () => {
		const changed = [...theme.tokens]
			.filter(([name, token]) => semantic.tokens.get(name)?.type !== token.type)
			.map(([name]) => name);
		expect(changed).toEqual([]);
	});
});

describe.each(contrastThemes)('finger colors in $name theme', ({ overrides }) => {
	const colors = FINGER_COLORS.map((name) => themeColor(overrides, name));

	it('defines one color per finger', () => {
		expect(new Set(colors).size).toBe(FINGERS.length);
	});

	it.each(Object.entries(VISIONS))(
		'keeps every pair of fingers distinguishable with %s vision',
		(_vision, matrix) => {
			const tooClose = colors.flatMap((first, i) =>
				colors
					.slice(i + 1)
					.map((second, offset) => ({
						pair: `${FINGERS[i]}/${FINGERS[i + 1 + offset]}`,
						first,
						second
					}))
					.filter(({ first: a, second: b }) => labDistance(a, b, matrix) < FINGER_MIN_DISTANCE)
					.map(({ pair }) => pair)
			);
			expect(tooClose).toEqual([]);
		}
	);
});

describe.each(contrastThemes)('contrast in $name theme', ({ overrides }) => {
	it.each(CONTRAST_PAIRS)(
		'$foreground on $background reaches at least $min:1',
		({ foreground, background, min }) => {
			const ratio = contrastRatio(
				themeColor(overrides, foreground),
				themeColor(overrides, background)
			);
			expect(ratio).toBeGreaterThanOrEqual(min);
		}
	);
});

describe('companion colours', () => {
	it('finds the colours of the reward catalogues', () => {
		expect(COMPANION_COLOR_IDS.length).toBeGreaterThan(0);
	});

	it.each(COMPANION_COLOR_IDS)('gives the colour %s a token for each part', (id) => {
		const missing = COMPANION_PARTS.map((part) => `color.companion.${id}.${part}`).filter(
			(name) => !semantic.tokens.has(name)
		);
		expect(missing).toEqual([]);
	});
});

const LINE = 'color.companion.line';
/** Marks drawn on a fill, never under the line. */
const WEAR_MARKS = ['color.wear.ink', 'color.wear.spot'];
const WEAR_COLORS = [...semantic.tokens.keys()].filter(
	(name) => name.startsWith('color.wear.') && !WEAR_MARKS.includes(name)
);
const TROPHY_FILLS = [...semantic.tokens.keys()].filter(
	(name) => name.startsWith('color.trophy.') && name !== 'color.trophy.symbol'
);
const DRAWING_PAIRS: ContrastPair[] = [
	...COMPANION_COLOR_IDS.flatMap((id) =>
		OUTLINED_PARTS.map((part) => ({
			foreground: LINE,
			background: `color.companion.${id}.${part}`,
			min: NON_TEXT_MIN
		}))
	),
	...WEAR_COLORS.map((background) => ({ foreground: LINE, background, min: NON_TEXT_MIN })),
	...TROPHY_FILLS.map((background) => ({
		foreground: 'color.trophy.symbol',
		background,
		min: NON_TEXT_MIN
	})),
	/** A reward is drawn alone on its backdrop: its outline, or its silhouette, must show. */
	{ foreground: LINE, background: 'color.reward.backdrop', min: NON_TEXT_MIN },
	{ foreground: 'color.silhouette', background: 'color.reward.backdrop', min: NON_TEXT_MIN }
];

describe.each(contrastThemes)('drawing contrast in $name theme', ({ overrides }) => {
	it('checks the clothes and the trophies', () => {
		expect(WEAR_COLORS.length).toBeGreaterThan(0);
		expect(TROPHY_FILLS.length).toBeGreaterThan(0);
	});

	it.each(DRAWING_PAIRS)(
		'$foreground on $background reaches at least $min:1',
		({ foreground, background, min }) => {
			const ratio = contrastRatio(
				themeColor(overrides, foreground),
				themeColor(overrides, background)
			);
			expect(ratio).toBeGreaterThanOrEqual(min);
		}
	);
});

/**
 * Keys written twice in one object of a JSON text. `JSON.parse` keeps the last one silently: two
 * branches that each add the same group (a merge that git resolves on its own) lose half of it.
 */
const BACKSLASH = String.fromCharCode(92);

function duplicateKeys(text: string): string[] {
	const found: string[] = [];
	const stack: { keys: Set<string>; isObject: boolean }[] = [];
	let expectingKey = false;
	for (let index = 0; index < text.length; index++) {
		const char = text[index];
		if (char === '"') {
			let end = index + 1;
			while (text[end] !== '"') end += text[end] === BACKSLASH ? 2 : 1;
			const value = text.slice(index + 1, end);
			const frame = stack[stack.length - 1];
			if (expectingKey && frame?.isObject) {
				if (frame.keys.has(value)) found.push(value);
				frame.keys.add(value);
				expectingKey = false;
			}
			index = end;
		} else if (char === '{' || char === '[') {
			stack.push({ keys: new Set(), isObject: char === '{' });
			expectingKey = char === '{';
		} else if (char === '}' || char === ']') {
			stack.pop();
		} else if (char === ',') {
			expectingKey = stack[stack.length - 1]?.isObject ?? false;
		}
	}
	return found;
}

describe('token files', () => {
	it('finds a key written twice in one object', () => {
		expect(duplicateKeys('{"a":{"x":1},"b":[{"x":1},{"x":2}],"a":{"y":2}}')).toEqual(['a']);
	});

	for (const file of [PRIMITIVES_FILE, SEMANTIC_FILE, ...Object.values(THEME_FILES)]) {
		it(`never writes a group twice in ${file}`, () => {
			expect(duplicateKeys(readFileSync(file, 'utf8'))).toEqual([]);
		});
	}
});
