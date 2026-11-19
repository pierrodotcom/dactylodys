import { describe, expect, it } from 'vitest';
import { restingHands, type FingerShape } from '$lib/keyboard/hands';
import { FINGERING_PROFILE_IDS, type FingeringProfileId } from '$lib/keyboard/layout-ids';
import { loadFingeringProfile, loadGeometry } from '$lib/keyboard/registry';
import { handFill } from './hand-fill';

const geometry = await loadGeometry('iso-105');

async function handsOf(id: FingeringProfileId) {
	return restingHands(geometry, await loadFingeringProfile(id));
}

const namesOf = (shapes: readonly FingerShape[]) => shapes.map((shape) => shape.finger).sort();

describe('handFill', () => {
	it.each(FINGERING_PROFILE_IDS)(
		'fills both palms and every finger drawn with %s when the hand is filled',
		async (id) => {
			const hands = await handsOf(id);
			const fill = handFill(hands, 'filled');

			expect(fill?.palms).toEqual(hands.map((hand) => hand.palm));
			expect(namesOf([...(fill?.fingers ?? []), ...(fill?.folded ?? [])])).toEqual(
				namesOf(hands.flatMap((hand) => hand.fingers))
			);
			expect(fill?.fingers.every((shape) => !shape.folded)).toBe(true);
			expect(fill?.folded.every((shape) => shape.folded)).toBe(true);
		}
	);

	it('fills the folded fingers apart: none with ten fingers, the little ones with six, six with two', async () => {
		expect(handFill(await handsOf('ten-fingers-iso'), 'filled')?.folded).toEqual([]);
		expect(namesOf(handFill(await handsOf('six-fingers-iso'), 'filled')?.folded ?? [])).toEqual([
			'left-pinky',
			'right-pinky'
		]);
		expect(handFill(await handsOf('two-index-iso'), 'filled')?.folded).toHaveLength(6);
	});

	it.each(FINGERING_PROFILE_IDS)(
		'fills nothing with %s when the hand is a contour: only the finger that shows a key is filled',
		async (id) => {
			expect(handFill(await handsOf(id), 'outline')).toBeNull();
		}
	);
});
