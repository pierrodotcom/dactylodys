import { describe, expect, it } from 'vitest';
import { installState, isIos, type InstallEnvironment } from './install-state';

const CHROME_PC: InstallEnvironment = {
	hasPrompt: false,
	standalone: false,
	justInstalled: false,
	userAgent:
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
	platform: 'Win32',
	maxTouchPoints: 0
};
const IPHONE: InstallEnvironment = {
	...CHROME_PC,
	userAgent:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
	platform: 'iPhone',
	maxTouchPoints: 5
};
const IPAD_AS_MAC: InstallEnvironment = {
	...CHROME_PC,
	userAgent:
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
	platform: 'MacIntel',
	maxTouchPoints: 5
};
const MAC: InstallEnvironment = { ...IPAD_AS_MAC, maxTouchPoints: 0 };

describe('installState', () => {
	it('offers the button when the browser keeps an installation prompt', () => {
		expect(installState({ ...CHROME_PC, hasPrompt: true })).toBe('ready');
	});

	it('says it is installed when it runs as an app', () => {
		expect(installState({ ...CHROME_PC, standalone: true })).toBe('installed');
		expect(installState({ ...IPHONE, standalone: true })).toBe('installed');
	});

	it('says it is installed right after the browser reports the installation', () => {
		expect(installState({ ...CHROME_PC, hasPrompt: true, justInstalled: true })).toBe('installed');
	});

	it('explains the Share menu on an iPhone and on an iPad, which have no button', () => {
		expect(installState(IPHONE)).toBe('ios');
		expect(installState(IPAD_AS_MAC)).toBe('ios');
	});

	it('does not take a Mac without a touch screen for an iPad', () => {
		expect(isIos(MAC)).toBe(false);
		expect(installState(MAC)).toBe('unsupported');
	});

	it('says nothing can be done in a browser that offers no installation', () => {
		expect(installState(CHROME_PC)).toBe('unsupported');
	});
});
