import { describe, expect, it, vi } from 'vitest';
import {
	createInstallPrompt,
	type BeforeInstallPromptEvent,
	type InstallHost
} from './install-prompt';

class FakeHost extends EventTarget implements InstallHost {
	standalone = false;
	readonly navigator = {
		userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0',
		platform: 'Win32',
		maxTouchPoints: 0
	};

	matchMedia() {
		return { matches: this.standalone };
	}
}

function promptEvent(outcome: 'accepted' | 'dismissed') {
	const event = new Event('beforeinstallprompt', { cancelable: true }) as BeforeInstallPromptEvent;
	const prompt = vi.fn(() => Promise.resolve());
	Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome }) });
	return { event, prompt };
}

describe('createInstallPrompt', () => {
	it('keeps the offer of the browser and holds back its own bar', () => {
		const host = new FakeHost();
		const installPrompt = createInstallPrompt();
		installPrompt.attach(host);
		const { event } = promptEvent('accepted');

		host.dispatchEvent(event);

		expect(event.defaultPrevented).toBe(true);
		expect(installPrompt.state()).toBe('ready');
	});

	it('opens the dialog once and reports the choice', async () => {
		const host = new FakeHost();
		const installPrompt = createInstallPrompt();
		installPrompt.attach(host);
		const { event, prompt } = promptEvent('dismissed');
		host.dispatchEvent(event);

		expect(await installPrompt.request()).toBe('dismissed');
		expect(prompt).toHaveBeenCalledTimes(1);
		expect(await installPrompt.request()).toBe('unavailable');
		expect(prompt).toHaveBeenCalledTimes(1);
	});

	it('has nothing to offer before the browser sends its event', async () => {
		const installPrompt = createInstallPrompt();
		installPrompt.attach(new FakeHost());
		expect(installPrompt.state()).toBe('unsupported');
		expect(await installPrompt.request()).toBe('unavailable');
	});

	it('knows the app is installed once the browser says so', () => {
		const host = new FakeHost();
		const installPrompt = createInstallPrompt();
		installPrompt.attach(host);
		host.dispatchEvent(promptEvent('accepted').event);

		host.dispatchEvent(new Event('appinstalled'));

		expect(installPrompt.state()).toBe('installed');
	});

	it('knows the app is installed when it runs as one', () => {
		const host = new FakeHost();
		host.standalone = true;
		const installPrompt = createInstallPrompt();
		installPrompt.attach(host);
		expect(installPrompt.state()).toBe('installed');
	});

	it('tells the listeners about each change, until they stop listening', () => {
		const host = new FakeHost();
		const installPrompt = createInstallPrompt();
		installPrompt.attach(host);
		const listener = vi.fn();
		const stop = installPrompt.subscribe(listener);

		host.dispatchEvent(promptEvent('accepted').event);
		expect(listener).toHaveBeenCalledTimes(1);
		stop();
		host.dispatchEvent(new Event('appinstalled'));
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('stops listening to the page when detached', () => {
		const host = new FakeHost();
		const installPrompt = createInstallPrompt();
		const detach = installPrompt.attach(host);
		detach();
		host.dispatchEvent(promptEvent('accepted').event);
		expect(installPrompt.state()).toBe('unsupported');
	});
});
