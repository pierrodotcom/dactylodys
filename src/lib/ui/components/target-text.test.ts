import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { endsLine, toTargetUnits } from './target-text';

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

	it('leaves a sign glued to its word and an opening sign as they are', () => {
		expect(textsOf('Oh, non.')).toEqual([['Oh,'], [' '], ['non.']]);
		expect(textsOf('dit « oui »')).toEqual([['dit'], [' '], ['«'], [' '], ['oui', ' ', '»']]);
		expect(textsOf(' ?')).toEqual([[' '], ['?']]);
	});

	it('ends a line with its line break, after the last word of the line', () => {
		expect(textsOf('Coucou !\nTu viens ?\n')).toEqual([
			['Coucou', ' ', '!', '\n'],
			['Tu'],
			[' '],
			['viens', ' ', '?', '\n']
		]);
		expect(textsOf('a \nb')).toEqual([['a'], [' ', '\n'], ['b']]);
		expect(textsOf('\n\na')).toEqual([['\n'], ['\n'], ['a']]);
	});

	it('says which units close their line', () => {
		const units = toTargetUnits([...'du pain\ndu lait']);
		expect(units.map(endsLine)).toEqual([false, false, true, false, false, false]);
		expect(units[2]?.map((group) => group.kind)).toEqual(['word', 'enter']);
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
