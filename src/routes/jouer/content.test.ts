import { describe, expect, it } from 'vitest';
import { LAYOUT_IDS } from '$lib/keyboard/layout-ids';
import { loadLayout } from '$lib/keyboard/registry';
import { progressionFor } from './content';
import { chooseCheckSteps } from './keyboard-check';
import { LAYOUT_LABELS } from './labels';
import { PLAY_RULES } from './play-rules';

describe('progressionFor', () => {
	it.each(LAYOUT_IDS)('has lessons for the layout %s', (layoutId) => {
		const progression = progressionFor(layoutId);

		expect(progression?.layoutIds).toContain(layoutId);
		expect(progression?.worlds[0]?.lessons.length).toBeGreaterThan(0);
	});
});

describe('layouts offered to the child', () => {
	it.each(LAYOUT_IDS)('names the layout %s in words', (layoutId) => {
		expect(LAYOUT_LABELS[layoutId]().trim()).not.toBe('');
	});

	it.each(LAYOUT_IDS)('gives a step to every key checked on the layout %s', async (layoutId) => {
		const layout = await loadLayout(layoutId);

		const steps = chooseCheckSteps(layout, PLAY_RULES.keyboardCheckCodes);

		expect(steps).toHaveLength(PLAY_RULES.keyboardCheckCodes.length);
	});
});
