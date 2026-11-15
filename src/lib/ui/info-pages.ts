/** The pages written for adults, linked from the home page and from the adult space, in that order. */
export const INFO_PAGES = [
	{ id: 'adults', route: '/pour-les-adultes' },
	{ id: 'professionals', route: '/pour-les-professionnels' },
	{ id: 'privacy', route: '/confidentialite' },
	{ id: 'accessibility', route: '/accessibilite' },
	{ id: 'credits', route: '/credits' }
] as const;

export type InfoPageId = (typeof INFO_PAGES)[number]['id'];

const ADULT_SPACE_ROUTE = '/adulte';

/*
 * An adult who opens a page for adults from the adult space comes back to it without passing the
 * gate again. Kept in the memory of the page only: reloading, or going anywhere else in the game,
 * closes the space, and a child who opens it afterwards meets the gate.
 */
let adultSpaceOpen = false;

export const adultSpace = {
	isOpen: (): boolean => adultSpaceOpen,
	open(): void {
		adultSpaceOpen = true;
	},
	close(): void {
		adultSpaceOpen = false;
	},
	/** To call before each navigation, with the route it leads to: `null` outside the game. */
	follow(routeId: string | null): void {
		const stays =
			routeId === ADULT_SPACE_ROUTE || INFO_PAGES.some((page) => page.route === routeId);
		if (!stays) adultSpaceOpen = false;
	}
};
