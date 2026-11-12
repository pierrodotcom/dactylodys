import { parsePhraseBank, parseTextBank, parseWordBank } from '$lib/engine/progression/banks';
import type {
	PhraseBank,
	ProgressionDefinition,
	TextBank,
	WordBank
} from '$lib/engine/progression/types';

/** Where the raw banks of a language come from; each one is fetched when it is needed. */
export interface BankSources {
	readonly words: () => Promise<unknown>;
	readonly phrases: () => Promise<unknown>;
	/** The useful texts of the last world, for a language that has some. */
	readonly texts?: () => Promise<unknown>;
}

/** The banks that could be loaded; a missing one means the exercise goes on without it. */
export interface LoadedBanks {
	readonly words?: WordBank;
	readonly phrases?: PhraseBank;
	readonly texts?: TextBank;
}

export type BankReporter = (message: string, error: unknown) => void;

/** One entry per language, keyed by the language of the progression's locale. */
export const BANK_SOURCES: Readonly<Record<string, BankSources>> = {
	fr: {
		words: () => import('../../../content/fr/words/base.json').then((module) => module.default),
		phrases: () => import('../../../content/fr/phrases/base.json').then((module) => module.default),
		texts: () => import('../../../content/fr/texts/base.json').then((module) => module.default)
	}
};

function reportToConsole(message: string, error: unknown): void {
	console.error(message, error);
}

async function loadOne<T>(
	name: string,
	load: () => Promise<unknown>,
	parse: (data: unknown) => T,
	report: BankReporter
): Promise<T | undefined> {
	try {
		return parse(await load());
	} catch (error) {
		report(`Cannot load the ${name} bank`, error);
		return undefined;
	}
}

/** Loads and validates the banks of the progression's language. A failure never throws. */
export async function loadBanks(
	progression: Pick<ProgressionDefinition, 'locale'>,
	sources: Readonly<Record<string, BankSources>> = BANK_SOURCES,
	report: BankReporter = reportToConsole
): Promise<LoadedBanks> {
	const language = new Intl.Locale(progression.locale).language;
	const source = Object.hasOwn(sources, language) ? sources[language] : undefined;
	if (source === undefined) return {};
	const [words, phrases, texts] = await Promise.all([
		loadOne('word', source.words, parseWordBank, report),
		loadOne('phrase', source.phrases, parsePhraseBank, report),
		source.texts === undefined
			? Promise.resolve(undefined)
			: loadOne('text', source.texts, parseTextBank, report)
	]);
	return {
		...(words === undefined ? {} : { words }),
		...(phrases === undefined ? {} : { phrases }),
		...(texts === undefined ? {} : { texts })
	};
}

/** The result of `pending`, or `fallback` once `timeoutMs` has gone by without it. */
export function settleWithin<T>(
	pending: Promise<T>,
	timeoutMs: number,
	fallback: T,
	report: BankReporter = reportToConsole
): Promise<T> {
	return new Promise((resolve) => {
		const timer = setTimeout(() => {
			report('The banks are too slow to load, playing without them', timeoutMs);
			resolve(fallback);
		}, timeoutMs);
		void pending.then((value) => {
			clearTimeout(timer);
			resolve(value);
		});
	});
}
