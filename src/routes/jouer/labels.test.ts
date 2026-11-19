import { describe, expect, it } from 'vitest';
import { FINGERING_PROFILE_IDS } from '$lib/keyboard/layout-ids';
import { m } from '$lib/paraglide/messages.js';
import { FINGERING_LABELS, fingeringChangeNote } from './labels';

describe('fingeringChangeNote', () => {
	it('says that the keys of the edge change finger between ten and six fingers', () => {
		expect(fingeringChangeNote('ten-fingers-iso', 'six-fingers-iso')).toBe(
			m.settings_fingering_changed()
		);
		expect(fingeringChangeNote('six-fingers-iso', 'ten-fingers-iso')).toBe(
			m.settings_fingering_changed()
		);
	});

	it('says that every key goes to the index of its side, going to two index fingers', () => {
		for (const from of ['ten-fingers-iso', 'six-fingers-iso'] as const) {
			expect(fingeringChangeNote(from, 'two-index-iso')).toBe(
				m.settings_fingering_changed_two_index()
			);
		}
	});

	it('says that the fingers take their keys back, leaving two index fingers', () => {
		for (const to of ['ten-fingers-iso', 'six-fingers-iso'] as const) {
			expect(fingeringChangeNote('two-index-iso', to)).toBe(
				m.settings_fingering_changed_from_two_index()
			);
		}
	});

	it('always says that the progress is kept, whatever the change', () => {
		for (const from of FINGERING_PROFILE_IDS) {
			for (const to of FINGERING_PROFILE_IDS) {
				expect(fingeringChangeNote(from, to)).toMatch(/progrès sont gardés/);
			}
		}
		expect(Object.keys(FINGERING_LABELS).sort()).toEqual([...FINGERING_PROFILE_IDS].sort());
	});
});
