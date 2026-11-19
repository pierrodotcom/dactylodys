import { m } from '$lib/paraglide/messages.js';

/**
 * The reminders to look at the screen, said in turn from one reminder to the next and from one play
 * to the next (audit P-20): first the way, by touch, then the rule. The voice records them in this
 * order (`LOOK_REMINDER_MESSAGES`).
 */
export const LOOK_REMINDERS: readonly (() => string)[] = [
	m.game_shared_look_reminder_touch,
	m.game_shared_look_reminder
];
