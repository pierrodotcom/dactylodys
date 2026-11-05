/**
 * What the adult space says about installing the game:
 * - `ready`: the browser offers the installation, a button starts it;
 * - `installed`: it runs as an installed app, or has just been installed;
 * - `ios`: iPhone and iPad have no button for it, only the Share menu;
 * - `unsupported`: nothing can be done from this page.
 */
export type InstallState = 'ready' | 'installed' | 'ios' | 'unsupported';

export interface InstallEnvironment {
	/** A `beforeinstallprompt` event has been kept and not used yet. */
	readonly hasPrompt: boolean;
	/** `display-mode: standalone` matches, or `navigator.standalone` is true (Safari). */
	readonly standalone: boolean;
	/** An `appinstalled` event has been seen since the page was opened. */
	readonly justInstalled: boolean;
	readonly userAgent: string;
	readonly platform: string;
	readonly maxTouchPoints: number;
}

const IOS_DEVICE = /iPhone|iPad|iPod/;
/** Since iPadOS 13 the iPad says it is a Mac; only a Mac with a touch screen is an iPad. */
const DESKTOP_MAC_PLATFORM = 'MacIntel';

export function isIos(env: Pick<InstallEnvironment, 'userAgent' | 'platform' | 'maxTouchPoints'>) {
	return (
		IOS_DEVICE.test(env.userAgent) ||
		(env.platform === DESKTOP_MAC_PLATFORM && env.maxTouchPoints > 1)
	);
}

export function installState(env: InstallEnvironment): InstallState {
	if (env.standalone || env.justInstalled) return 'installed';
	if (env.hasPrompt) return 'ready';
	return isIos(env) ? 'ios' : 'unsupported';
}
