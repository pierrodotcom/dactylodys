import { parseGateNumbers, type GateNumbers } from './gate';

/* Every language that has its file: adding a language adds a file, not code. */
const FILES = import.meta.glob<unknown>('../../../content/*/adult/gate-numbers.json', {
	eager: true,
	import: 'default'
});
const LANGUAGE_OF_PATH = /content\/([^/]+)\/adult\//;
const BASE_LANGUAGE = 'fr';

const GATE_NUMBERS: ReadonlyMap<string, GateNumbers> = new Map(
	Object.entries(FILES).map(([path, data]) => [
		LANGUAGE_OF_PATH.exec(path)?.[1] ?? path,
		parseGateNumbers(data)
	])
);

/** The numbers of the gate in the language of the interface, else in the base language. */
export function gateNumbersFor(locale: string): GateNumbers {
	const language = locale.split('-')[0] ?? BASE_LANGUAGE;
	const numbers = GATE_NUMBERS.get(language) ?? GATE_NUMBERS.get(BASE_LANGUAGE);
	if (!numbers) throw new Error(`no gate numbers for ${locale}`);
	return numbers;
}
