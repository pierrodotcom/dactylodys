import { describe, expect, it } from 'vitest';
import * as shapes from './shapes';
import {
	CRACK_COUNT,
	CRACKS,
	SHELL_BOTTOM_BOX,
	SHELL_BOTTOM_PATH,
	SHELL_BOTTOM_RIM,
	SHELL_BOTTOM_SHADE,
	SHELL_INSIDE_PATH,
	SHELL_INSIDE_RIM,
	SHELL_INSIDE_SHADE,
	mirror
} from './shapes';

function pointsOf(d: string): [number, number][] {
	return [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => [
		Number(m[1]),
		Number(m[2])
	]);
}

function pathsIn(value: unknown): string[] {
	if (typeof value === 'string') return value.startsWith('M') ? [value] : [];
	if (Array.isArray(value)) return value.flatMap(pathsIn);
	if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(pathsIn);
	return [];
}

describe('hatching shapes', () => {
	it('has four cracks, one per stage, each longer than the one before', () => {
		expect(CRACK_COUNT).toBe(4);
		const widths = CRACKS.map(({ groove }) => {
			const xs = pointsOf(groove).map(([x]) => x);
			return Math.max(...xs) - Math.min(...xs);
		});
		widths.slice(1).forEach((width, i) => expect(width).toBeGreaterThan(widths[i] ?? 0));
	});

	it('writes every path with finite numbers only', () => {
		const paths = pathsIn(Object.values(shapes));
		expect(paths.length).toBeGreaterThan(50);
		for (const d of paths) {
			expect(d).not.toMatch(/NaN|Infinity|undefined/);
			expect(pointsOf(d).length).toBeGreaterThan(0);
		}
	});

	it('keeps both halves of the bottom of the shell inside the box they share', () => {
		const box = SHELL_BOTTOM_BOX;
		const halves = [
			SHELL_BOTTOM_PATH,
			SHELL_BOTTOM_RIM,
			SHELL_BOTTOM_SHADE,
			SHELL_INSIDE_PATH,
			SHELL_INSIDE_RIM,
			SHELL_INSIDE_SHADE
		];
		for (const [x, y] of halves.flatMap(pointsOf)) {
			expect(x).toBeGreaterThanOrEqual(box.x);
			expect(x).toBeLessThanOrEqual(box.x + box.width);
			expect(y).toBeGreaterThanOrEqual(box.y);
			expect(y).toBeLessThanOrEqual(box.y + box.height);
		}
	});

	it('mirrors a path around the middle of the egg', () => {
		expect(mirror('M10 20L60 30C70 40 80 50 110 60Z')).toBe('M110 20L60 30C50 40 40 50 10 60Z');
	});
});
