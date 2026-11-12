import { m } from '$lib/paraglide/messages.js';
import { withOlderVariant, type AgedText } from '../shared/age-text';

/** What the inhabitant of each astre says, in this order. */
export const GREETINGS: readonly AgedText[] = [
	m.game_rocket_greeting_1,
	m.game_rocket_greeting_2,
	m.game_rocket_greeting_3,
	m.game_rocket_greeting_4,
	withOlderVariant(m.game_rocket_greeting_5, m.game_rocket_greeting_5_older),
	m.game_rocket_greeting_6,
	m.game_rocket_greeting_7,
	m.game_rocket_greeting_8,
	withOlderVariant(m.game_rocket_greeting_9, m.game_rocket_greeting_9_older),
	m.game_rocket_greeting_10
];
