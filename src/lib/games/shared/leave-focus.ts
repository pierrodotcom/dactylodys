import type { Attachment } from 'svelte/attachments';

/**
 * Pressed with the mouse, a button in a screen that waits for typing (« Écouter » beside a
 * question of Floup, the help about Caps Lock) leaves the focus where it is: the next key is
 * typed in the field, and Space does not press the button again. It is still reached with Tab.
 */
export const leaveFocusInField: Attachment<HTMLElement> = (node) => {
	const keep = (event: MouseEvent) => event.preventDefault();
	node.addEventListener('mousedown', keep);
	return () => node.removeEventListener('mousedown', keep);
};
