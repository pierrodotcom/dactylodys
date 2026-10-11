import { describe, expect, it } from 'vitest';
import { FINGERING_PROFILE_IDS, GEOMETRY_IDS, LAYOUT_IDS } from './layout-ids';
import type { FingeringProfileId, GeometryId, LayoutId } from './layout-ids';
import { geometryIdFor, loadFingeringProfile, loadGeometry, loadLayout } from './registry';

describe('loadLayout', () => {
	it.each(LAYOUT_IDS)('loads and validates %s', async (id) => {
		const layout = await loadLayout(id);
		expect(layout.id).toBe(id);
		expect(Object.keys(layout.keys).length).toBeGreaterThan(0);
	});

	it('rejects an unknown identifier', async () => {
		await expect(loadLayout('xx-xx-unknown-pc' as LayoutId)).rejects.toThrow('Unknown layout id');
		await expect(loadLayout('constructor' as LayoutId)).rejects.toThrow('Unknown layout id');
	});
});

describe('geometryIdFor', () => {
	it.each(LAYOUT_IDS)('picks a drawing of the same physical shape for %s', async (id) => {
		const layout = await loadLayout(id);

		const geometry = await loadGeometry(geometryIdFor(layout));

		expect(geometry.geometry).toBe(layout.geometry);
	});

	it('picks the ISO drawing for an ISO layout', async () => {
		expect(geometryIdFor(await loadLayout('fr-fr-azerty-pc'))).toBe('iso-105');
	});

	it('throws for a physical shape without a drawing', async () => {
		const layout = { ...(await loadLayout('fr-fr-azerty-pc')), geometry: 'ansi' as const };

		expect(() => geometryIdFor(layout)).toThrow('No keyboard drawing for the ansi geometry');
	});

	it('throws for an inherited property name used as a shape', async () => {
		const layout = {
			...(await loadLayout('fr-fr-azerty-pc')),
			geometry: 'constructor' as unknown as 'iso'
		};

		expect(() => geometryIdFor(layout)).toThrow('No keyboard drawing');
	});
});

describe('loadGeometry', () => {
	it.each(GEOMETRY_IDS)('loads and validates %s', async (id) => {
		const geometry = await loadGeometry(id);
		expect(geometry.id).toBe(id);
		expect(geometry.rows.length).toBeGreaterThan(0);
	});

	it('rejects an unknown identifier', async () => {
		await expect(loadGeometry('nope' as GeometryId)).rejects.toThrow('Unknown geometry id');
		await expect(loadGeometry('constructor' as GeometryId)).rejects.toThrow('Unknown geometry id');
	});
});

describe('loadFingeringProfile', () => {
	it.each(FINGERING_PROFILE_IDS)('loads and validates %s', async (id) => {
		const profile = await loadFingeringProfile(id);
		expect(profile.id).toBe(id);
		expect(profile.homeKeys['left-index']).toBe('KeyF');
	});

	it('rejects an unknown identifier', async () => {
		await expect(loadFingeringProfile('nope' as FingeringProfileId)).rejects.toThrow(
			'Unknown fingering profile id'
		);
	});
});
