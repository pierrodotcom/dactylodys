import { m } from '$lib/paraglide/messages.js';

const SPACE = ' ';
const LINE_BREAK = '\n';

/** How a screen reader should say one character to type: a blank or a line break as a word. */
export function spokenGrapheme(grapheme: string): string {
	if (grapheme === SPACE) return m.ui_target_char_space();
	if (grapheme === LINE_BREAK) return m.ui_target_char_enter();
	return grapheme;
}
