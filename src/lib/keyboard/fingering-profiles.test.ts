import { describe, expect, it } from 'vitest';
import { fingerForKey, modifierCodes } from './fingering';
import { buildCharIndex } from './layout';
import { FINGERING_PROFILE_IDS, LAYOUT_IDS } from './layout-ids';
import { loadFingeringProfile, loadLayout } from './registry';
import type { Finger, FingeringProfile, KeyPress } from './types';

/*
 * The fingerings the adult chooses from (ADR-075, choice 6) with the layouts the child types on,
 * character by character, every way of writing it: its keys are pressed by fingers the profile rests
 * somewhere, Shift by the other hand, and no finger is asked for two keys held together.
 */
const profiles = await Promise.all(FINGERING_PROFILE_IDS.map(loadFingeringProfile));
const layouts = await Promise.all(LAYOUT_IDS.map(loadLayout));

interface Press {
	readonly profile: FingeringProfile;
	/** Where the press comes from, to name it when it fails. */
	readonly where: string;
	readonly press: KeyPress;
}

const presses: Press[] = profiles.flatMap((profile) =>
	layouts
		.filter((layout) => layout.geometry === profile.geometry)
		.flatMap((layout) =>
			[...buildCharIndex(layout)].flatMap(([char, sequences]) =>
				sequences.flat().map((press) => ({
					profile,
					where: `${profile.id} ${layout.id} ${JSON.stringify(char)} ${press.code} ${press.level}`,
					press
				}))
			)
		)
);

const handOf = (finger: Finger | null) => finger?.split('-')[0];
/**
 * Option + Space writes a non-breaking space on a Mac, which no lesson asks for: one thumb holds
 * Option while the other presses Space, and the profiles give both keys to the right thumb (ADR-041).
 */
const isThumbOnBoth = ({ code, level }: KeyPress) =>
	code === 'Space' && (level === 'altgr' || level === 'shiftAltgr');

describe('every fingering profile with every layout', () => {
	it('has presses to look at for each profile', () => {
		for (const profile of profiles) {
			expect(presses.filter((item) => item.profile === profile).length).toBeGreaterThan(0);
		}
	});

	it('presses every key of every character with a finger the profile rests somewhere', () => {
		for (const { profile, where, press } of presses) {
			for (const code of [press.code, ...modifierCodes(press, profile)]) {
				const finger = fingerForKey(profile, code);
				expect(finger, `${where} ${code}`).not.toBeNull();
				if (finger !== null) expect(profile.homeKeys[finger], `${where} ${code}`).toBeDefined();
			}
		}
	});

	it('holds Shift with the other hand than the one that types the key', () => {
		for (const { profile, where, press } of presses) {
			if (press.level !== 'shift' && press.level !== 'shiftAltgr') continue;
			const [shift = ''] = modifierCodes(press, profile);
			expect(handOf(fingerForKey(profile, shift)), where).not.toBe(
				handOf(fingerForKey(profile, press.code))
			);
		}
	});

	it('never asks one finger for two keys held together', () => {
		for (const { profile, where, press } of presses) {
			if (isThumbOnBoth(press)) continue;
			const fingers = [press.code, ...modifierCodes(press, profile)].map((code) =>
				fingerForKey(profile, code)
			);
			expect(new Set(fingers).size, where).toBe(fingers.length);
		}
	});
});
