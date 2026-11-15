import type { Attachment } from 'svelte/attachments';

/** Puts the keyboard focus on the element as soon as it appears, e.g. the heading of a new screen. */
export const focusOnMount: Attachment<HTMLElement> = (node) => {
	node.focus();
};

/** The same, for a screen that brings the element into view itself: the focus does not scroll. */
export const focusOnMountInPlace: Attachment<HTMLElement> = (node) => {
	node.focus({ preventScroll: true });
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

/** Room kept at the top of the page for a bar that stays there (the scroll padding of the page). */
function topClearance(): number {
	const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart);
	return Number.isFinite(padding) ? padding : 0;
}

/** Room kept at the bottom of the page: a focused card, drawn a little larger, stays whole. */
function bottomClearance(): number {
	const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockEnd);
	return Number.isFinite(padding) ? padding : 0;
}

/** The element is whole on the screen, below the bar that stays at the top of the page. */
export function isInView(element: Element): boolean {
	const box = element.getBoundingClientRect();
	return box.top >= topClearance() && box.bottom <= window.innerHeight;
}

/**
 * Brings the element to the middle of the page only when it is not in view already, e.g. the lesson
 * to play on a long map: a page that shows it opens at its top, its bar in view.
 */
export const revealInView: Attachment<HTMLElement> = (node) => {
	if (!isInView(node)) node.scrollIntoView({ block: 'center' });
};

/**
 * Scrolls the page the least that shows the element whole, without taking `keep` out of view
 * above it: an instruction is never scrolled away to show the choices that follow it. Done again
 * once the fonts are there: the screen is a little taller then.
 */
export function revealBelow(keep: () => Element | null | undefined): Attachment<HTMLElement> {
	return (node) => {
		let gone = false;
		const reveal = () => {
			if (gone) return;
			const below = node.getBoundingClientRect().bottom + bottomClearance() - window.innerHeight;
			if (below <= 0) return;
			const anchor = keep()?.getBoundingClientRect();
			const room = anchor === undefined ? below : anchor.top - topClearance();
			const by = Math.min(below, room);
			if (by > 0) window.scrollBy({ top: by, behavior: 'instant' });
		};
		reveal();
		void document.fonts.ready.then(() => requestAnimationFrame(reveal));
		return () => {
			gone = true;
		};
	};
}
