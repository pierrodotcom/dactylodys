import type { FingerShape, HandShape, Point } from '$lib/keyboard/hands';
import type { HandDrawing } from '$lib/state/types';

/** The inside of the hands at rest, painted under their contour (`HandGuide`). */
export interface HandFill {
	readonly palms: readonly (readonly Point[])[];
	/** The fingers that rest on a key. */
	readonly fingers: readonly FingerShape[];
	/** The fingers a reduced fingering folds (ADR-075, choice 6): fainter, as their contour is. */
	readonly folded: readonly FingerShape[];
}

/**
 * What fills the hands at rest, as the child chose to draw them (version 20): `filled`, the palms
 * and every finger, as the hands were first drawn; `outline`, nothing, so that the letters under
 * them stay legible (E-11). Either way the finger that shows a key is filled, apart.
 */
export function handFill(hands: readonly HandShape[], drawing: HandDrawing): HandFill | null {
	if (drawing === 'outline') return null;
	const fingers = hands.flatMap((hand) => hand.fingers);
	return {
		palms: hands.map((hand) => hand.palm),
		fingers: fingers.filter((shape) => !shape.folded),
		folded: fingers.filter((shape) => shape.folded)
	};
}
