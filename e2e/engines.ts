/**
 * A test that does not depend on the engine runs on Chromium only (audit Q-13): a layout measured
 * once, a text or a logic of a screen already covered by unit tests, a trial page of `/dev`, an API
 * that only Chromium has. Firefox and WebKit keep what the engine changes: typing and the judgement
 * of the keys, the focus and the walks at the keyboard, sound and voice, offline, printing, storage,
 * and a whole play of each game. `playwright.config.ts` leaves this tag out of their projects.
 */
export const CHROMIUM_ONLY = { tag: '@chromium' } as const;
