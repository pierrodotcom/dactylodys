import { describe, expect, it } from 'vitest';
import type { RawInputEvent } from '$lib/keyboard/types';
import { attachKeyboardCapture } from './capture';

function setup() {
	const target = new EventTarget();
	const received: RawInputEvent[] = [];
	let now = 0;
	const detach = attachKeyboardCapture(
		target,
		(event) => received.push(event),
		() => (now += 5)
	);
	const dispatch = (type: string, fields: object = {}, cancelable = false) => {
		const event = Object.assign(new Event(type, { cancelable }), fields);
		target.dispatchEvent(event);
		return event;
	};
	return { received, detach, dispatch };
}

describe('attachKeyboardCapture', () => {
	it('copies a keydown into plain data with the AltGraph state', () => {
		const { received, dispatch } = setup();

		dispatch('keydown', {
			key: '@',
			code: 'Digit0',
			repeat: false,
			isComposing: false,
			shiftKey: false,
			ctrlKey: true,
			altKey: true,
			metaKey: false,
			getModifierState: (key: string) => key === 'AltGraph'
		});

		expect(received).toEqual([
			{
				type: 'keydown',
				timestamp: 5,
				key: '@',
				code: 'Digit0',
				repeat: false,
				isComposing: false,
				shiftKey: false,
				ctrlKey: true,
				altKey: true,
				metaKey: false,
				altGraph: true
			}
		]);
	});

	it('copies input and composition events', () => {
		const { received, dispatch } = setup();

		dispatch('beforeinput', { inputType: 'insertText', data: 'a', isComposing: false });
		dispatch('input', { inputType: 'insertText', data: null, isComposing: false });
		dispatch('compositionstart', { data: '' });
		dispatch('compositionupdate', { data: '^' });
		dispatch('compositionend', { data: 'ê' });

		expect(received.map((event) => [event.type, event.data ?? null])).toEqual([
			['beforeinput', 'a'],
			['input', null],
			['compositionstart', ''],
			['compositionupdate', '^'],
			['compositionend', 'ê']
		]);
	});

	it('blocks paste and drop', () => {
		const { dispatch } = setup();

		expect(dispatch('paste', {}, true).defaultPrevented).toBe(true);
		expect(dispatch('drop', {}, true).defaultPrevented).toBe(true);
	});

	it('cancels paste and drop insertions but still reports them', () => {
		const { received, dispatch } = setup();

		const paste = dispatch('beforeinput', { inputType: 'insertFromPaste', data: null }, true);
		const drop = dispatch('beforeinput', { inputType: 'insertFromDrop', data: null }, true);
		const typing = dispatch('beforeinput', { inputType: 'insertText', data: 'a' }, true);

		expect([paste.defaultPrevented, drop.defaultPrevented, typing.defaultPrevented]).toEqual([
			true,
			true,
			false
		]);
		expect(received).toHaveLength(3);
	});

	it('stops forwarding once detached', () => {
		const { received, detach, dispatch } = setup();

		detach();
		dispatch('keyup', { key: 'a', code: 'KeyQ' });

		expect(received).toEqual([]);
	});
});
