import type { Attachment } from 'svelte/attachments';

/** Puts the keyboard focus on the element as soon as it appears, e.g. the heading of a new screen. */
export const focusOnMount: Attachment<HTMLElement> = (node) => {
	node.focus();
};
