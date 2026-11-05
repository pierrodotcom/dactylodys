import { installState, type InstallEnvironment, type InstallState } from './install-state';

/** The event Chromium browsers send when the site can be installed (not in the DOM types). */
export interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	readonly userChoice: Promise<{ readonly outcome: 'accepted' | 'dismissed' }>;
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

/** The part of `window` that is read: a page opened in a browser tab or in an installed app. */
export interface InstallHost {
	addEventListener(type: string, listener: (event: Event) => void): void;
	removeEventListener(type: string, listener: (event: Event) => void): void;
	matchMedia(query: string): { readonly matches: boolean };
	readonly navigator: {
		readonly userAgent: string;
		readonly platform: string;
		readonly maxTouchPoints: number;
		readonly standalone?: boolean;
	};
}

const STANDALONE_QUERY = '(display-mode: standalone)';

export interface InstallPrompt {
	/** Starts listening; returns the function that stops it. */
	attach(host: InstallHost): () => void;
	state(): InstallState;
	/** Calls `listener` at each change; returns the function that stops it. */
	subscribe(listener: () => void): () => void;
	/** Opens the browser's own installation dialog; only from a click. */
	request(): Promise<InstallOutcome>;
}

/**
 * Keeps the installation offer of the browser. The event comes once, soon after the page opens,
 * which is long before an adult reaches the adult space: it is kept here, from the layout of the
 * site. It is held back (`preventDefault`) so that the browser does not show its own bar to the
 * child; only the adult space offers it.
 */
export function createInstallPrompt(): InstallPrompt {
	let host: InstallHost | null = null;
	let pending: BeforeInstallPromptEvent | null = null;
	let justInstalled = false;
	const listeners = new Set<() => void>();

	const notify = () => listeners.forEach((listener) => listener());

	function environment(): InstallEnvironment {
		if (host === null) {
			return {
				hasPrompt: false,
				standalone: false,
				justInstalled,
				userAgent: '',
				platform: '',
				maxTouchPoints: 0
			};
		}
		const { navigator } = host;
		return {
			hasPrompt: pending !== null,
			standalone: host.matchMedia(STANDALONE_QUERY).matches || navigator.standalone === true,
			justInstalled,
			userAgent: navigator.userAgent,
			platform: navigator.platform,
			maxTouchPoints: navigator.maxTouchPoints
		};
	}

	const onPrompt = (event: Event) => {
		event.preventDefault();
		pending = event as BeforeInstallPromptEvent;
		notify();
	};
	const onInstalled = () => {
		pending = null;
		justInstalled = true;
		notify();
	};

	return {
		attach(target) {
			host = target;
			target.addEventListener('beforeinstallprompt', onPrompt);
			target.addEventListener('appinstalled', onInstalled);
			notify();
			return () => {
				target.removeEventListener('beforeinstallprompt', onPrompt);
				target.removeEventListener('appinstalled', onInstalled);
				if (host === target) host = null;
			};
		},
		state: () => installState(environment()),
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		async request() {
			const event = pending;
			if (event === null) return 'unavailable';
			// An event can be used once: a new one comes if the browser still offers the installation.
			pending = null;
			notify();
			await event.prompt();
			const { outcome } = await event.userChoice;
			return outcome;
		}
	};
}

/** The one the site shares: filled from the layout, read by the adult space. */
export const installPrompt = createInstallPrompt();
