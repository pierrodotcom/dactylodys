import { describe, expect, it } from 'vitest';
import type { NormalizedKeystroke, RawInputEvent } from '../types';
import { createInputNormalizer } from './normalizer';

type Fields = Omit<RawInputEvent, 'type' | 'timestamp'>;

function run(events: readonly RawInputEvent[]): NormalizedKeystroke[] {
	const normalizer = createInputNormalizer();
	return events.flatMap((event) => normalizer.push(event));
}

function chars(keystrokes: readonly NormalizedKeystroke[]): string {
	return keystrokes.map((keystroke) => keystroke.char ?? `<${keystroke.kind}>`).join('');
}

function clock() {
	let now = 1000;
	const at = (type: RawInputEvent['type'], fields: Fields): RawInputEvent => {
		now += 10;
		return { type, timestamp: now, ...fields };
	};
	return {
		keydown: (key: string, code: string, fields: Fields = {}) =>
			at('keydown', { key, code, ...fields }),
		keyup: (key: string, code: string, fields: Fields = {}) =>
			at('keyup', { key, code, ...fields }),
		beforeinput: (inputType: string, data: string | null = null, fields: Fields = {}) =>
			at('beforeinput', { inputType, data, ...fields }),
		input: (inputType: string, data: string | null = null, fields: Fields = {}) =>
			at('input', { inputType, data, ...fields }),
		compositionstart: (data = '') => at('compositionstart', { data }),
		compositionupdate: (data: string) => at('compositionupdate', { data }),
		compositionend: (data: string) => at('compositionend', { data })
	};
}

/** A full plain keystroke the way every browser delivers it. */
function typed(c: ReturnType<typeof clock>, key: string, code: string, fields: Fields = {}) {
	return [
		c.keydown(key, code, fields),
		c.beforeinput('insertText', key),
		c.input('insertText', key),
		c.keyup(key, code, fields)
	];
}

describe('plain characters', () => {
	it('emits one keystroke per key press, however many events describe it', () => {
		const c = clock();
		const result = run([...typed(c, 'a', 'KeyQ'), ...typed(c, 'b', 'KeyB')]);

		expect(result.map((k) => [k.kind, k.char, k.code, k.composed])).toEqual([
			['char', 'a', 'KeyQ', false],
			['char', 'b', 'KeyB', false]
		]);
	});

	it('takes the character from the input event, never from the key code', () => {
		const c = clock();
		const result = run([
			c.keydown('é', 'Digit2'),
			c.beforeinput('insertText', 'é'),
			c.input('insertText', 'é'),
			c.keyup('é', 'Digit2')
		]);

		expect(chars(result)).toBe('é');
		expect(result[0]?.code).toBe('Digit2');
	});

	it('prefers the input data over a diverging key value', () => {
		const c = clock();
		const result = run([
			c.keydown('e', 'KeyE'),
			c.beforeinput('insertText', 'ê'),
			c.input('insertText', 'ê'),
			c.keyup('e', 'KeyE')
		]);

		expect(chars(result)).toBe('ê');
	});

	it('emits from the input event alone when no keydown precedes it', () => {
		const c = clock();
		const result = run([c.input('insertText', 'x')]);

		expect(result).toEqual([
			{ kind: 'char', char: 'x', code: null, timestamp: 1010, composed: false }
		]);
	});

	it('uses the timestamp of the keydown, not the one of the input event', () => {
		const events: RawInputEvent[] = [
			{ type: 'keydown', timestamp: 100, key: 'a', code: 'KeyQ' },
			{ type: 'beforeinput', timestamp: 104, inputType: 'insertText', data: 'a' },
			{ type: 'input', timestamp: 105, inputType: 'insertText', data: 'a' }
		];

		expect(run(events)[0]?.timestamp).toBe(100);
	});

	it('ignores modifier keys when choosing the physical key', () => {
		const c = clock();
		const result = run([
			c.keydown('Shift', 'ShiftLeft', { shiftKey: true }),
			c.keydown('A', 'KeyQ', { shiftKey: true }),
			c.beforeinput('insertText', 'A'),
			c.input('insertText', 'A'),
			c.keyup('A', 'KeyQ', { shiftKey: true }),
			c.keyup('Shift', 'ShiftLeft')
		]);

		expect(result.map((k) => [k.char, k.code])).toEqual([['A', 'KeyQ']]);
	});

	it('handles a space', () => {
		const c = clock();

		expect(chars(run(typed(c, ' ', 'Space')))).toBe(' ');
	});

	it('does not reuse a stale key code for an input that has no keydown', () => {
		const c = clock();
		const result = run([...typed(c, 'a', 'KeyQ'), c.input('insertText', 'b')]);

		expect(result.map((k) => k.code)).toEqual(['KeyQ', null]);
	});

	it('normalizes the output to NFC', () => {
		const c = clock();
		const result = run([c.keydown('Unidentified', 'KeyE'), c.input('insertText', 'ê')]);

		expect(result[0]?.char).toBe('ê');
	});

	it('splits several typed characters into one keystroke each', () => {
		const c = clock();
		const result = run([c.keydown('Unidentified', 'KeyZ'), c.input('insertText', 'ab')]);

		expect(result.map((k) => [k.char, k.code])).toEqual([
			['a', 'KeyZ'],
			['b', 'KeyZ']
		]);
	});

	it('keeps a multi-codepoint grapheme as one keystroke', () => {
		const c = clock();
		const family = '\u{1F468}‍\u{1F469}‍\u{1F467}';
		const result = run([c.input('insertText', family)]);

		expect(result.map((k) => k.char)).toEqual([family]);
	});
});

describe('a keydown alone never produces a character', () => {
	it('emits nothing at keyup when no input event follows', () => {
		const c = clock();

		expect(run([c.keydown('a', 'KeyQ'), c.keyup('a', 'KeyQ')])).toEqual([]);
	});

	it('emits nothing when the next keydown arrives with no input in between', () => {
		const c = clock();

		expect(run([c.keydown('a', 'KeyQ'), c.keydown('b', 'KeyB')])).toEqual([]);
	});

	it('ignores the key Chrome on Windows reports for an AltGr dead key', () => {
		const c = clock();
		const altGr = { ctrlKey: true, altKey: true, altGraph: true };
		const result = run([
			c.keydown('é', 'Digit2', altGr),
			c.keyup('é', 'Digit2', altGr),
			c.keydown('~', 'Space'),
			c.beforeinput('insertText', '~'),
			c.input('insertText', '~'),
			c.keyup(' ', 'Space')
		]);

		expect(result.map((k) => [k.char, k.code])).toEqual([['~', 'Space']]);
	});

	it('does not duplicate a character that an input event already delivered', () => {
		const c = clock();
		const result = run(typed(c, 'a', 'KeyQ'));

		expect(result).toHaveLength(1);
	});

	it('ignores keys that are not characters', () => {
		const c = clock();
		const result = run([
			c.keydown('ArrowLeft', 'ArrowLeft'),
			c.keyup('ArrowLeft', 'ArrowLeft'),
			c.keydown('Tab', 'Tab'),
			c.keyup('Tab', 'Tab')
		]);

		expect(result).toEqual([]);
	});
});

describe('dead keys without composition events (Windows)', () => {
	it('emits nothing for the dead key alone', () => {
		const c = clock();

		expect(run([c.keydown('Dead', 'BracketLeft'), c.keyup('Dead', 'BracketLeft')])).toEqual([]);
	});

	it('emits one composed keystroke for the next key', () => {
		const c = clock();
		const result = run([
			c.keydown('Dead', 'BracketLeft'),
			c.keyup('Dead', 'BracketLeft'),
			c.keydown('ê', 'KeyE'),
			c.beforeinput('insertText', 'ê'),
			c.input('insertText', 'ê'),
			c.keyup('ê', 'KeyE')
		]);

		expect(result.map((k) => [k.char, k.code, k.composed])).toEqual([['ê', 'KeyE', true]]);
	});

	it('emits the isolated character for a dead key followed by space', () => {
		const c = clock();
		const result = run([
			c.keydown('Dead', 'BracketLeft'),
			c.keyup('Dead', 'BracketLeft'),
			c.keydown(' ', 'Space'),
			c.beforeinput('insertText', '^'),
			c.input('insertText', '^'),
			c.keyup(' ', 'Space')
		]);

		expect(result.map((k) => [k.char, k.code, k.composed])).toEqual([['^', 'Space', true]]);
	});

	it('emits two keystrokes when the dead key and the next key do not combine', () => {
		const c = clock();
		const result = run([
			c.keydown('Dead', 'BracketLeft'),
			c.keyup('Dead', 'BracketLeft'),
			c.keydown('z', 'KeyW'),
			c.beforeinput('insertText', '^z'),
			c.input('insertText', '^z'),
			c.keyup('z', 'KeyW')
		]);

		expect(result.map((k) => [k.char, k.code])).toEqual([
			['^', 'KeyW'],
			['z', 'KeyW']
		]);
	});

	it('does not flag the next unrelated character as composed', () => {
		const c = clock();
		const result = run([
			c.keydown('Dead', 'BracketLeft'),
			c.keyup('Dead', 'BracketLeft'),
			...typed(c, 'ê', 'KeyE'),
			...typed(c, 'a', 'KeyQ')
		]);

		expect(result.map((k) => k.composed)).toEqual([true, false]);
	});

	it('cancels a pending dead key on Backspace instead of deleting a character', () => {
		const c = clock();
		const result = run([
			...typed(c, 'a', 'KeyQ'),
			c.keydown('Dead', 'BracketLeft'),
			c.keyup('Dead', 'BracketLeft'),
			c.keydown('Backspace', 'Backspace'),
			c.keyup('Backspace', 'Backspace')
		]);

		expect(chars(result)).toBe('a');
	});
});

describe('composition (macOS)', () => {
	function deadThenLetter(c: ReturnType<typeof clock>, composed: string) {
		return [
			c.keydown('Dead', 'BracketLeft'),
			c.compositionstart(),
			c.beforeinput('insertCompositionText', '^', { isComposing: true }),
			c.compositionupdate('^'),
			c.input('insertCompositionText', '^', { isComposing: true }),
			c.keyup('Dead', 'BracketLeft', { isComposing: true }),
			c.keydown('Process', 'KeyE', { isComposing: true }),
			c.beforeinput('insertCompositionText', composed, { isComposing: true }),
			c.compositionupdate(composed),
			c.input('insertCompositionText', composed, { isComposing: true }),
			c.compositionend(composed),
			c.keyup('e', 'KeyE')
		];
	}

	it('emits nothing while the dead key composition is open', () => {
		const c = clock();
		const events = deadThenLetter(c, 'ê');
		const beforeEnd = events.slice(
			0,
			events.findIndex((e) => e.type === 'compositionend')
		);

		expect(run(beforeEnd)).toEqual([]);
	});

	it('emits the composed character once, at compositionend', () => {
		const c = clock();
		const result = run(deadThenLetter(c, 'ê'));

		expect(result.map((k) => [k.char, k.code, k.composed])).toEqual([['ê', 'KeyE', true]]);
	});

	it('does not repeat the composed character when an insertFromComposition event follows', () => {
		const c = clock();
		const result = run([
			c.keydown('Process', 'KeyE', { isComposing: true }),
			c.compositionupdate('ê'),
			c.compositionend('ê'),
			c.beforeinput('insertFromComposition', 'ê'),
			c.input('insertFromComposition', 'ê'),
			c.keyup('e', 'KeyE')
		]);

		expect(chars(result)).toBe('ê');
	});

	it('emits the isolated character for a dead key followed by space', () => {
		const c = clock();
		const result = run([
			c.keydown('Dead', 'BracketLeft'),
			c.compositionstart(),
			c.compositionupdate('^'),
			c.keyup('Dead', 'BracketLeft'),
			c.keydown(' ', 'Space', { isComposing: true }),
			c.compositionend('^'),
			c.keyup(' ', 'Space')
		]);

		expect(result.map((k) => [k.char, k.code, k.composed])).toEqual([['^', 'Space', true]]);
	});

	it('emits two keystrokes when the composition produces two characters', () => {
		const c = clock();
		const result = run(deadThenLetter(c, '^z'));

		expect(result.map((k) => [k.char, k.composed])).toEqual([
			['^', true],
			['z', true]
		]);
	});

	it('emits nothing when the composition is cancelled', () => {
		const c = clock();
		const result = run([
			c.keydown('Dead', 'BracketLeft'),
			c.compositionstart(),
			c.compositionupdate('^'),
			c.keydown('Backspace', 'Backspace', { isComposing: true }),
			c.compositionend(''),
			c.keyup('Backspace', 'Backspace')
		]);

		expect(result).toEqual([]);
	});

	it('types a normal character after a composition without duplicating anything', () => {
		const c = clock();
		const result = run([...deadThenLetter(c, 'ê'), ...typed(c, 'a', 'KeyQ')]);

		expect(result.map((k) => [k.char, k.composed])).toEqual([
			['ê', true],
			['a', false]
		]);
	});

	it('does not emit the key of a keydown that arrives after the composition (Safari order)', () => {
		const c = clock();
		const result = run([
			c.compositionstart(),
			c.compositionupdate('^'),
			c.input('insertCompositionText', '^'),
			c.keydown('Unidentified', 'BracketLeft'),
			c.keyup('Unidentified', 'BracketLeft'),
			c.compositionupdate('ê'),
			c.compositionend('ê'),
			c.keydown('e', 'KeyE'),
			c.keyup('e', 'KeyE')
		]);

		expect(chars(result)).toBe('ê');
	});
});

describe('AltGr', () => {
	it('accepts a character typed with Ctrl+Alt as Windows reports AltGr', () => {
		const c = clock();
		const altgr = { ctrlKey: true, altKey: true, altGraph: true };
		const result = run([
			c.keydown('Control', 'ControlLeft', { ctrlKey: true }),
			c.keydown('AltGraph', 'AltRight', altgr),
			c.keydown('@', 'Digit0', altgr),
			c.beforeinput('insertText', '@'),
			c.input('insertText', '@'),
			c.keyup('@', 'Digit0', altgr),
			c.keyup('AltGraph', 'AltRight', { ctrlKey: true }),
			c.keyup('Control', 'ControlLeft')
		]);

		expect(result.map((k) => [k.char, k.code])).toEqual([['@', 'Digit0']]);
	});

	it('accepts Ctrl+Alt without the AltGraph flag', () => {
		const c = clock();

		expect(chars(run(typed(c, '{', 'Digit4', { ctrlKey: true, altKey: true })))).toBe('{');
	});

	it('accepts the altGraph flag alone', () => {
		const c = clock();

		expect(chars(run(typed(c, '€', 'KeyE', { altGraph: true })))).toBe('€');
	});

	it('accepts Option on macOS (alt only)', () => {
		const c = clock();

		expect(chars(run(typed(c, '{', 'Digit5', { altKey: true })))).toBe('{');
	});
});

describe('shortcuts', () => {
	it('ignores Ctrl combinations', () => {
		const c = clock();
		const result = run([
			c.keydown('Control', 'ControlLeft', { ctrlKey: true }),
			c.keydown('a', 'KeyQ', { ctrlKey: true }),
			c.keyup('a', 'KeyQ', { ctrlKey: true }),
			c.keyup('Control', 'ControlLeft')
		]);

		expect(result).toEqual([]);
	});

	it('ignores Meta combinations', () => {
		const c = clock();
		const result = run([
			c.keydown('Meta', 'MetaLeft', { metaKey: true }),
			c.keydown('c', 'KeyC', { metaKey: true }),
			c.keyup('c', 'KeyC', { metaKey: true })
		]);

		expect(result).toEqual([]);
	});

	it('ignores Ctrl+Backspace and Ctrl+Enter', () => {
		const c = clock();
		const result = run([
			c.keydown('Backspace', 'Backspace', { ctrlKey: true }),
			c.keyup('Backspace', 'Backspace', { ctrlKey: true }),
			c.keydown('Enter', 'Enter', { ctrlKey: true }),
			c.keyup('Enter', 'Enter', { ctrlKey: true })
		]);

		expect(result).toEqual([]);
	});
});

describe('auto-repeat', () => {
	it('emits a held character once', () => {
		const c = clock();
		const result = run([
			c.keydown('a', 'KeyQ'),
			c.beforeinput('insertText', 'a'),
			c.input('insertText', 'a'),
			c.keydown('a', 'KeyQ', { repeat: true }),
			c.beforeinput('insertText', 'a'),
			c.input('insertText', 'a'),
			c.keydown('a', 'KeyQ', { repeat: true }),
			c.beforeinput('insertText', 'a'),
			c.input('insertText', 'a'),
			c.keyup('a', 'KeyQ')
		]);

		expect(chars(result)).toBe('a');
	});

	it('ignores a repeated keydown with no input event as well', () => {
		const c = clock();
		const result = run([
			c.keydown('a', 'KeyQ'),
			c.keydown('a', 'KeyQ', { repeat: true }),
			c.keyup('a', 'KeyQ')
		]);

		expect(chars(result)).toBe('');
	});

	it('types normally again after the key was released', () => {
		const c = clock();
		const result = run([
			c.keydown('a', 'KeyQ'),
			c.beforeinput('insertText', 'a'),
			c.input('insertText', 'a'),
			c.keydown('a', 'KeyQ', { repeat: true }),
			c.beforeinput('insertText', 'a'),
			c.input('insertText', 'a'),
			c.keyup('a', 'KeyQ'),
			...typed(c, 'b', 'KeyB')
		]);

		expect(chars(result)).toBe('ab');
	});
});

describe('Backspace and Enter', () => {
	it('emits Backspace once for keydown plus deleteContentBackward', () => {
		const c = clock();
		const result = run([
			c.keydown('Backspace', 'Backspace'),
			c.beforeinput('deleteContentBackward'),
			c.input('deleteContentBackward'),
			c.keyup('Backspace', 'Backspace')
		]);

		expect(result.map((k) => [k.kind, k.char, k.code])).toEqual([['backspace', null, 'Backspace']]);
	});

	it('emits Backspace from the keydown alone', () => {
		const c = clock();

		expect(chars(run([c.keydown('Backspace', 'Backspace')]))).toBe('<backspace>');
	});

	it('emits Backspace from deleteContentBackward alone', () => {
		const c = clock();
		const result = run([c.beforeinput('deleteContentBackward'), c.input('deleteContentBackward')]);

		expect(result.map((k) => [k.kind, k.code])).toEqual([['backspace', null]]);
	});

	it('emits Backspace twice for two key presses', () => {
		const c = clock();
		const press = () => [
			c.keydown('Backspace', 'Backspace'),
			c.beforeinput('deleteContentBackward'),
			c.input('deleteContentBackward'),
			c.keyup('Backspace', 'Backspace')
		];

		expect(chars(run([...press(), ...press()]))).toBe('<backspace><backspace>');
	});

	it('emits one Backspace per auto-repeat, since each one deletes a character', () => {
		const c = clock();
		const result = run([
			c.keydown('Backspace', 'Backspace'),
			c.beforeinput('deleteContentBackward'),
			c.input('deleteContentBackward'),
			c.keydown('Backspace', 'Backspace', { repeat: true }),
			c.beforeinput('deleteContentBackward'),
			c.input('deleteContentBackward'),
			c.keyup('Backspace', 'Backspace')
		]);

		expect(chars(result)).toBe('<backspace><backspace>');
	});

	it.each(['insertLineBreak', 'insertParagraph'])('emits Enter once for %s', (inputType) => {
		const c = clock();
		const result = run([
			c.keydown('Enter', 'Enter'),
			c.beforeinput(inputType),
			c.input(inputType),
			c.keyup('Enter', 'Enter')
		]);

		expect(result.map((k) => [k.kind, k.char, k.code])).toEqual([['enter', null, 'Enter']]);
	});

	it('emits Enter from the input type alone', () => {
		const c = clock();

		expect(chars(run([c.beforeinput('insertLineBreak'), c.input('insertLineBreak')]))).toBe(
			'<enter>'
		);
	});

	it('does not repeat Enter while the key is held', () => {
		const c = clock();
		const result = run([
			c.keydown('Enter', 'Enter'),
			c.beforeinput('insertLineBreak'),
			c.input('insertLineBreak'),
			c.keydown('Enter', 'Enter', { repeat: true }),
			c.beforeinput('insertLineBreak'),
			c.input('insertLineBreak'),
			c.keyup('Enter', 'Enter')
		]);

		expect(chars(result)).toBe('<enter>');
	});

	it('does not treat the Enter that validates a composition as a line break', () => {
		const c = clock();
		const result = run([
			c.compositionstart(),
			c.compositionupdate('a'),
			c.keydown('Enter', 'Enter', { isComposing: true }),
			c.compositionend('a'),
			c.keyup('Enter', 'Enter')
		]);

		expect(chars(result)).toBe('a');
	});
});

describe('paste and drop', () => {
	it.each(['insertFromPaste', 'insertFromDrop', 'insertFromYank', 'insertReplacementText'])(
		'ignores %s',
		(inputType) => {
			const c = clock();
			const result = run([
				c.beforeinput(inputType, 'pasted text'),
				c.input(inputType, 'pasted text')
			]);

			expect(result).toEqual([]);
		}
	);

	it('ignores Ctrl+V together with the paste it triggers', () => {
		const c = clock();
		const result = run([
			c.keydown('Control', 'ControlLeft', { ctrlKey: true }),
			c.keydown('v', 'KeyV', { ctrlKey: true }),
			c.beforeinput('insertFromPaste'),
			c.input('insertFromPaste', 'pasted'),
			c.keyup('v', 'KeyV', { ctrlKey: true }),
			c.keyup('Control', 'ControlLeft')
		]);

		expect(result).toEqual([]);
	});

	it('keeps typing normally after a paste', () => {
		const c = clock();
		const result = run([c.beforeinput('insertFromPaste', 'zzz'), ...typed(c, 'a', 'KeyQ')]);

		expect(chars(result)).toBe('a');
	});
});

describe('reset', () => {
	it('forgets a pending dead key and an open composition', () => {
		const c = clock();
		const normalizer = createInputNormalizer();
		normalizer.push(c.keydown('Dead', 'BracketLeft'));
		normalizer.push(c.compositionstart());
		normalizer.reset();

		const out = [...typed(c, 'a', 'KeyQ')].flatMap((event) => normalizer.push(event));

		expect(out.map((k) => [k.char, k.composed])).toEqual([['a', false]]);
	});
});
