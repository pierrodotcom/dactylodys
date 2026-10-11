import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const PRIMITIVES_FILE = 'tokens/primitives.tokens.json';
const SEMANTIC_FILE = 'tokens/semantic.tokens.json';
const THEME_FILES = { dark: 'tokens/themes/dark.tokens.json' } as const;

const BODY_TEXT_MIN = 7;
const TEXT_MIN = 4.5;
const NON_TEXT_MIN = 3;

type ContrastPair = { foreground: string; background: string; min: number };

const SURFACES = ['color.surface.base', 'color.surface.raised', 'color.surface.sunken'];

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
	{ foreground: 'color.border.strong', background: 'color.surface.base', min: NON_TEXT_MIN }
];

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
