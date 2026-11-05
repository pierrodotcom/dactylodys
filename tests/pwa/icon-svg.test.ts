import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildIconSvg, tokenColor } from '../../tools/icons/icon-svg.js';

const config = JSON.parse(readFileSync('tools/icons/config.json', 'utf8'));
const tokens = JSON.parse(readFileSync('src/lib/generated/token-values.json', 'utf8')) as {
	light: Record<string, string>;
	dark: Record<string, string>;
};
const COMPANION = '<path id="drawing" d="M0 0"/>';

function icon(variant: string, maskable = false) {
	return buildIconSvg({ config: { ...config, variant }, tokens, companion: COMPANION, maskable });
}

describe('buildIconSvg', () => {
	it('draws the companion on a key, on the background of the variant, with colours from the tokens', () => {
		const svg = icon('A');
		expect(svg).toContain(COMPANION);
		expect(svg).toContain(`fill="${tokens.dark['color-surface-base']}"`);
		expect(svg).toContain(`fill="${tokens.dark['color-text-primary']}"`);
		expect(svg).toContain(`fill="${tokens.dark['color-border-strong']}"`);
	});

	it('switches to the other variant with the one value of the configuration', () => {
		const svg = icon('C');
		expect(svg).toContain(`fill="${tokens.dark['color-accent-base']}"`);
		expect(svg).toContain(`fill="${tokens.light['color-surface-raised']}"`);
		expect(svg).not.toContain(`fill="${tokens.dark['color-surface-base']}"`);
	});

	it('keeps the drawing of the maskable icon inside the safe circle', () => {
		const svg = icon('A', true);
		const scale = Number(/scale\(([\d.]+)\) translate/.exec(svg)?.[1]);
		const { content, safeRadius } = config.maskable;
		const corner = Math.hypot(content.right - content.left, content.bottom - content.top) / 2;

		expect(scale).toBeLessThan(1);
		expect(corner * scale).toBeLessThanOrEqual(safeRadius * config.canvas + 0.5);
	});

	it('does not shrink the other icons', () => {
		expect(icon('A', false)).not.toContain('scale(0.');
	});

	it('refuses an unknown variant or token', () => {
		expect(() => icon('Z')).toThrow(/variant/);
		expect(() => tokenColor(tokens, 'dark.color-nothing')).toThrow(/token/);
	});
});
