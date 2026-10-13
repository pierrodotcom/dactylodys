import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { toTargetUnits } from './target-text';

const textsOf = (text: string): string[][] =>
	toTargetUnits([...text]).map((unit) =>
		unit.map((group) => group.cells.map((cell) => cell.text).join(''))
	);

describe('toTargetUnits', () => {
	it('puts every word and every space in its own unit', () => {
		expect(textsOf('le chat dort')).toEqual([['le'], [' '], ['chat'], [' '], ['dort']]);
	});

	it('keeps a sign written after a space with the word before it', () => {
		expect(textsOf('Qui a pris mon vélo ?')).toEqual([
			['Qui'],
			[' '],
			['a'],
			[' '],
			['pris'],
			[' '],
			['mon'],
			[' '],
			['vélo', ' ', '?']
		]);
		expect(textsOf('Mon garage : un vélo !')).toEqual([
			['Mon'],
			[' '],
			['garage', ' ', ':'],
			[' '],
			['un'],
			[' '],
			['vélo', ' ', '!']
		]);
	});

	it('leaves a sign glued to its word, an opening sign and a line break as they are', () => {
		expect(textsOf('Oh, non.')).toEqual([['Oh,'], [' '], ['non.']]);
		expect(textsOf('dit « oui »')).toEqual([['dit'], [' '], ['«'], [' '], ['oui', ' ', '»']]);
		expect(textsOf('a\n?')).toEqual([['a'], ['\n'], ['?']]);
		expect(textsOf(' ?')).toEqual([[' '], ['?']]);
	});

	it('marks spaces and words', () => {
		const kinds = toTargetUnits([...'a ?']).map((unit) => unit.map((group) => group.kind));
		expect(kinds).toEqual([['word', 'space', 'word']]);
	});

	it('keeps every character once, in order, with its index', () => {
		fc.assert(
			fc.property(
				fc.array(fc.constantFrom('a', 'é', ' ', '\n', '?', '!', ':', ',', '«', '-')),
				(graphemes) => {
					const cells = toTargetUnits(graphemes).flatMap((unit) =>
						unit.flatMap((group) => group.cells)
					);
					expect(cells.map((cell) => cell.text)).toEqual(graphemes);
					expect(cells.map((cell) => cell.index)).toEqual(graphemes.map((_, index) => index));
				}
			)
		);
	});
});
