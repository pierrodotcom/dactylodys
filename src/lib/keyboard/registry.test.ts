import { describe, expect, it } from 'vitest';
import { FINGERING_PROFILE_IDS, LAYOUT_IDS } from './layout-ids';
import type { FingeringProfileId, LayoutId } from './layout-ids';
import { loadFingeringProfile, loadLayout } from './registry';

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
