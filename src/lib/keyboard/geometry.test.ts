import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGeometry } from './geometry';
import { FINGERING_PROFILE_IDS, GEOMETRY_IDS, LAYOUT_IDS } from './layout-ids';
import { loadFingeringProfile, loadLayout } from './registry';

function readGeometryFile(id: string): unknown {
	return JSON.parse(readFileSync(`layouts/geometry/${id}.json`, 'utf8'));
}

function makeGeometry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		schemaVersion: 1,
		id: 'test-geometry',
		geometry: 'iso',
		rows: [
			{
				offset: 0,
				keys: [
					{ code: 'KeyA', width: 1 },
					{ code: 'Tab', width: 1.5 }
				]
			}
		],
		...overrides
	};
}

describe('parseGeometry', () => {
	it('accepts a valid geometry', () => {
		const geometry = parseGeometry(makeGeometry());
		expect(geometry.id).toBe('test-geometry');
		expect(geometry.rows[0]?.keys[1]).toEqual({ code: 'Tab', width: 1.5 });
	});

	it.each([
		['a non-object', 42, 'geometry: expected an object'],
		['a wrong schema version', makeGeometry({ schemaVersion: 2 }), 'geometry.schemaVersion'],
		['an invalid id', makeGeometry({ id: 'Not An Id' }), 'geometry.id'],
		['an unknown geometry', makeGeometry({ geometry: 'jis' }), 'geometry.geometry'],
		['an unknown property', makeGeometry({ extra: true }), 'geometry.extra'],
		['no row', makeGeometry({ rows: [] }), 'geometry.rows'],
		['a row without key', makeGeometry({ rows: [{ offset: 0, keys: [] }] }), 'rows[0].keys'],
		[
			'a negative offset',
			makeGeometry({ rows: [{ offset: -1, keys: [{ code: 'KeyA', width: 1 }] }] }),
			'rows[0].offset'
		],
		[
			'an invalid key code',
			makeGeometry({ rows: [{ offset: 0, keys: [{ code: 'key a', width: 1 }] }] }),
			'rows[0].keys[0].code'
		],
		[
			'a zero width',
			makeGeometry({ rows: [{ offset: 0, keys: [{ code: 'KeyA', width: 0 }] }] }),
			'rows[0].keys[0].width'
		],
		[
			'a width that is not a multiple of a quarter',
			makeGeometry({ rows: [{ offset: 0, keys: [{ code: 'KeyA', width: 1.1 }] }] }),
			'multiple of 0.25'
		],
		[
			'a width that is not a number',
			makeGeometry({ rows: [{ offset: 0, keys: [{ code: 'KeyA', width: '1' }] }] }),
			'rows[0].keys[0].width'
		],
		[
			'a code repeated in another row',
			makeGeometry({
				rows: [
					{ offset: 0, keys: [{ code: 'KeyA', width: 1 }] },
					{ offset: 0, keys: [{ code: 'KeyA', width: 1 }] }
				]
			}),
			'duplicate key KeyA'
		],
		[
			'an unknown key property',
			makeGeometry({ rows: [{ offset: 0, keys: [{ code: 'KeyA', width: 1, label: 'A' }] }] }),
			'rows[0].keys[0].label'
		]
	])('rejects %s with the faulty path', (_name, data, path) => {
		expect(() => parseGeometry(data)).toThrow(path);
	});
});

describe.each(GEOMETRY_IDS)('geometry file %s', (id) => {
	const geometry = parseGeometry(readGeometryFile(id));
	const codes = geometry.rows.flatMap((row) => row.keys.map((key) => key.code));

	it('is valid and declares its own id', () => {
		expect(geometry.id).toBe(id);
	});

	it('has no duplicate key code', () => {
		expect(new Set(codes).size).toBe(codes.length);
	});

	it.each(LAYOUT_IDS)('contains every key of the layout %s', async (layoutId) => {
		const layout = await loadLayout(layoutId);
		const missing = Object.keys(layout.keys).filter((code) => !codes.includes(code));
		expect(missing).toEqual([]);
	});

	it.each(FINGERING_PROFILE_IDS)(
		'contains every key of the fingering profile %s',
		async (fingeringId) => {
			const profile = await loadFingeringProfile(fingeringId);
			const missing = Object.keys(profile.fingers).filter((code) => !codes.includes(code));
			expect(missing).toEqual([]);
		}
	);

	it('keeps the five rows of the alphanumeric block', () => {
		expect(geometry.rows).toHaveLength(5);
	});

	it('gives the digit, tab, shift and space rows the same width', () => {
		const widths = [0, 1, 3, 4].map((index) => {
			const row = geometry.rows[index];
			return (row?.offset ?? 0) + (row?.keys.reduce((total, key) => total + key.width, 0) ?? 0);
		});
		expect(new Set(widths).size).toBe(1);
	});
});
