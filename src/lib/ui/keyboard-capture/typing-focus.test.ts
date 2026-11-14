import { describe, expect, it } from 'vitest';
import type { RawInputEvent } from '$lib/keyboard/types';
import { focusPlace, typingFocusMove, type FocusPlace } from './typing-focus';

function keydown(key: string, extra: Partial<RawInputEvent> = {}): RawInputEvent {
	return { type: 'keydown', timestamp: 0, key, code: '', ...extra };
}

const AWAY: readonly FocusPlace[] = ['page', 'button'];

describe('typingFocusMove', () => {
	it('gives a key that writes to the field, from the page and from a button', () => {
		for (const place of AWAY) {
			expect(typingFocusMove(keydown('f', { code: 'KeyF' }), place)).toBe('take');
			expect(typingFocusMove(keydown('é', { code: 'Digit2' }), place)).toBe('take');
			expect(typingFocusMove(keydown('F', { code: 'KeyF', shiftKey: true }), place)).toBe('take');
			expect(typingFocusMove(keydown('Backspace', { code: 'Backspace' }), place)).toBe('take');
		}
	});

	it('gives a dead key to the field, so that the letter after it is composed there', () => {
		for (const place of AWAY) {
			expect(typingFocusMove(keydown('Dead', { code: 'BracketLeft' }), place)).toBe('take');
		}
	});

	it('gives AltGr and its character to the field: Windows reports it as Ctrl + Alt', () => {
		const altGr = { code: 'Digit0', ctrlKey: true, altKey: true, altGraph: true };
		expect(typingFocusMove(keydown('@', altGr), 'page')).toBe('take');
	});

	it('leaves Space and Enter to the button that has the focus', () => {
		expect(typingFocusMove(keydown(' ', { code: 'Space' }), 'button')).toBe('none');
		expect(typingFocusMove(keydown('Enter', { code: 'Enter' }), 'button')).toBe('none');
	});

	it('types Space and Enter when nothing has the focus', () => {
		expect(typingFocusMove(keydown(' ', { code: 'Space' }), 'page')).toBe('take');
		expect(typingFocusMove(keydown('Enter', { code: 'Enter' }), 'page')).toBe('take');
	});

	it('never takes Tab, Shift + Tab, Escape, an arrow or a modifier: the keyboard is not trapped', () => {
		for (const place of AWAY) {
			expect(typingFocusMove(keydown('Tab', { code: 'Tab' }), place)).toBe('none');
			expect(typingFocusMove(keydown('Tab', { code: 'Tab', shiftKey: true }), place)).toBe('none');
			expect(typingFocusMove(keydown('Escape', { code: 'Escape' }), place)).toBe('none');
			expect(typingFocusMove(keydown('ArrowDown', { code: 'ArrowDown' }), place)).toBe('none');
			expect(typingFocusMove(keydown('Shift', { code: 'ShiftLeft' }), place)).toBe('none');
			expect(typingFocusMove(keydown('F5', { code: 'F5' }), place)).toBe('none');
		}
	});

	it('leaves the shortcuts of the browser alone', () => {
		expect(typingFocusMove(keydown('r', { code: 'KeyR', ctrlKey: true }), 'page')).toBe('none');
		expect(typingFocusMove(keydown('l', { code: 'KeyL', metaKey: true }), 'page')).toBe('none');
	});

	it('sends Tab from the field to the first button instead of out of the page', () => {
		expect(typingFocusMove(keydown('Tab', { code: 'Tab' }), 'field')).toBe('first-button');
	});

	it('lets Shift + Tab, Ctrl + Tab and every other key of the field go their way', () => {
		expect(typingFocusMove(keydown('Tab', { code: 'Tab', shiftKey: true }), 'field')).toBe('none');
		expect(typingFocusMove(keydown('Tab', { code: 'Tab', ctrlKey: true }), 'field')).toBe('none');
		expect(typingFocusMove(keydown('f', { code: 'KeyF' }), 'field')).toBe('none');
	});

	it('does nothing while another control has the focus', () => {
		expect(typingFocusMove(keydown('f', { code: 'KeyF' }), 'elsewhere')).toBe('none');
		expect(typingFocusMove(keydown('Tab', { code: 'Tab' }), 'elsewhere')).toBe('none');
	});
});

describe('focusPlace', () => {
	const field = { id: 'the-field', tagName: 'TEXTAREA' };

	it('knows the field by its identifier', () => {
		expect(focusPlace(field, 'the-field')).toBe('field');
	});

	it('takes no focus, or the focus on the page itself, for the page', () => {
		expect(focusPlace(null, 'the-field')).toBe('page');
		expect(focusPlace({ id: '', tagName: 'BODY' }, 'the-field')).toBe('page');
		expect(focusPlace({ id: '', tagName: 'HTML' }, 'the-field')).toBe('page');
	});

	it('tells a button or a link from any other control', () => {
		expect(focusPlace({ id: '', tagName: 'BUTTON' }, 'the-field')).toBe('button');
		expect(focusPlace({ id: '', tagName: 'A' }, 'the-field')).toBe('button');
		expect(focusPlace({ id: 'other', tagName: 'TEXTAREA' }, 'the-field')).toBe('elsewhere');
		expect(focusPlace({ id: '', tagName: 'H1' }, 'the-field')).toBe('elsewhere');
	});
});
