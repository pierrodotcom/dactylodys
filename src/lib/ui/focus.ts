import type { Attachment } from 'svelte/attachments';

/** Puts the keyboard focus on the element as soon as it appears, e.g. the heading of a new screen. */
export const focusOnMount: Attachment<HTMLElement> = (node) => {
	node.focus();
};

/**
 * Puts the keyboard focus on the element a moment after it appears. For a button that shows up
 * under a child who is still pressing keys: Enter would otherwise click it at once.
 */
export function focusSoon(delayMs: number): Attachment<HTMLElement> {
	return (node) => {
		const timer = setTimeout(() => node.focus(), delayMs);
		return () => clearTimeout(timer);
	};
}

/**
 * Lets the keyboard reach a box only while it scrolls sideways, e.g. a table on a narrow page: a
 * tab stop that scrolls nothing would only be in the way.
 */
export const focusableWhileScrolling: Attachment<HTMLElement> = (node) => {
	const update = () => {
		if (node.scrollWidth > node.clientWidth) node.tabIndex = 0;
		else node.removeAttribute('tabindex');
	};
	update();
	const watcher = new ResizeObserver(update);
	watcher.observe(node);
	return () => watcher.disconnect();
};

/** Scrolls the element to the middle of the page, e.g. the lesson to play on a long map. */
export const centerInView: Attachment<HTMLElement> = (node) => {
	node.scrollIntoView({ block: 'center' });
};
