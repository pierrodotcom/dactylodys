import { m } from '$lib/paraglide/messages.js';
import { withOlderVariant, type AgedText } from '../shared/age-text';

/** What the game says when a group is typed, in this order. */
export const QUIPS: readonly AgedText[] = [
	withOlderVariant(m.game_train_quip_1, m.game_train_quip_1_older),
	m.game_train_quip_2,
	m.game_train_quip_3,
	m.game_train_quip_4,
	m.game_train_quip_5,
	m.game_train_quip_6,
	m.game_train_quip_7,
	m.game_train_quip_8,
	m.game_train_quip_9,
	m.game_train_quip_10
];
