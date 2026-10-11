import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { NormalizedKeystroke, RawInputEvent, RawInputEventType } from '../types';
import { splitGraphemes } from './graphemes';
import { createInputNormalizer } from './normalizer';

const EVENT_TYPES: RawInputEventType[] = [
	'keydown',
	'keyup',
	'beforeinput',
	'input',
	'compositionstart',
	'compositionupdate',
	'compositionend'
];
const KEYS = [
	'a',
	'é',
	'^',
	'¨',
	' ',
	'Dead',
	'Process',
	'Unidentified',
	'Backspace',
	'Enter',
	'Shift',
	'Control',
	'Alt',
	'AltGraph',
	'Meta',
	'ArrowLeft',
	'Tab',
	''
];
const CODES = [
	'KeyQ',
	'KeyE',
	'BracketLeft',
	'Backspace',
	'Enter',
	'ShiftLeft',
	'ControlLeft',
	'AltRight'
];
const INPUT_TYPES = [
	'insertText',
	'insertCompositionText',
	'insertFromComposition',
	'insertFromPaste',
	'insertFromDrop',
	'deleteContentBackward',
	'insertLineBreak',
	'insertParagraph'
];
const DATA = ['a', 'é', '^', '^z', 'ê', '́', '\n', '', '\u{1F468}‍\u{1F469}', '\ud800'];

const optional = <T>(arbitrary: fc.Arbitrary<T>) =>
	fc.option(arbitrary, { nil: undefined, freq: 2 });
const text = (values: string[]) =>
	fc.oneof(fc.constantFrom(...values), fc.string({ unit: 'binary', maxLength: 6 }));

const rawEvent: fc.Arbitrary<RawInputEvent> = fc.record({
	type: fc.constantFrom(...EVENT_TYPES),
	timestamp: fc.double({ min: 0, max: 1e6, noNaN: true }),
	key: optional(text(KEYS)),
	code: optional(text(CODES)),
	repeat: optional(fc.boolean()),
	isComposing: optional(fc.boolean()),
	shiftKey: optional(fc.boolean()),
	ctrlKey: optional(fc.boolean()),
	altKey: optional(fc.boolean()),
	metaKey: optional(fc.boolean()),
	altGraph: optional(fc.boolean()),
	inputType: optional(text(INPUT_TYPES)),
	data: optional(fc.option(text(DATA), { nil: null }))
});

const eventSequence = fc.array(rawEvent, { maxLength: 60 });

function run(events: readonly RawInputEvent[]): NormalizedKeystroke[] {
	const normalizer = createInputNormalizer();
	return events.flatMap((event) => normalizer.push(event));
}

describe('input normalizer properties', () => {
	it('never throws, whatever the sequence of events', () => {
		fc.assert(fc.property(eventSequence, (events) => void run(events)));
	});

	it('is deterministic: the same events give the same keystrokes', () => {
		fc.assert(
			fc.property(eventSequence, (events) => {
				expect(run(events)).toEqual(run(events));
			})
		);
	});

	it('gives the same result when the events are replayed after a reset', () => {
		fc.assert(
			fc.property(eventSequence, (events) => {
				const normalizer = createInputNormalizer();
				const first = events.flatMap((event) => normalizer.push(event));
				normalizer.reset();
				const second = events.flatMap((event) => normalizer.push(event));
				expect(second).toEqual(first);
			})
		);
	});

	it('gives every char keystroke exactly one NFC grapheme', () => {
		fc.assert(
			fc.property(eventSequence, (events) => {
				for (const keystroke of run(events)) {
					if (keystroke.kind === 'char') {
						expect(keystroke.char).not.toBeNull();
						const char = keystroke.char ?? '';
						expect(splitGraphemes(char)).toHaveLength(1);
						expect(char.normalize('NFC')).toBe(char);
					} else {
						expect(keystroke.char).toBeNull();
					}
				}
			})
		);
	});

	it('only reports finite timestamps taken from the input events', () => {
		fc.assert(
			fc.property(eventSequence, (events) => {
				const known = new Set(events.map((event) => event.timestamp));
				for (const keystroke of run(events)) {
					expect(known.has(keystroke.timestamp)).toBe(true);
				}
			})
		);
	});

	it('emits one keystroke per key press when keydown, beforeinput and input describe it', () => {
		const letters = fc.array(fc.constantFrom('a', 'b', 'é', 'z', ' ', '@', 'ç'), { maxLength: 20 });
		fc.assert(
			fc.property(letters, (typedChars) => {
				const events = typedChars.flatMap((char, index): RawInputEvent[] => {
					const t = index * 100;
					return [
						{ type: 'keydown', timestamp: t, key: char, code: 'KeyA' },
						{ type: 'beforeinput', timestamp: t + 1, inputType: 'insertText', data: char },
						{ type: 'input', timestamp: t + 2, inputType: 'insertText', data: char },
						{ type: 'keyup', timestamp: t + 3, key: char, code: 'KeyA' }
					];
				});

				expect(run(events).map((keystroke) => keystroke.char)).toEqual(typedChars);
			})
		);
	});
});
