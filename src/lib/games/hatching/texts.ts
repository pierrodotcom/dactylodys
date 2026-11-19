import { m } from '$lib/paraglide/messages.js';
import { withOlderVariant, type AgedText } from '../shared/age-text';

/** What each little dino says as it comes out of its egg, in this order. */
export const CRIES: readonly AgedText[] = [
	m.game_hatching_cry_1,
	withOlderVariant(m.game_hatching_cry_2, m.game_hatching_cry_2_older),
	m.game_hatching_cry_3,
	m.game_hatching_cry_4,
	m.game_hatching_cry_5,
	m.game_hatching_cry_6,
	m.game_hatching_cry_7,
	withOlderVariant(m.game_hatching_cry_8, m.game_hatching_cry_8_older),
	m.game_hatching_cry_9,
	withOlderVariant(m.game_hatching_cry_10, m.game_hatching_cry_10_older)
];
