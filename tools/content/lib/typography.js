/*
 * The French typography of the interface (ADR-094), for the texts of `content/fr/` that the game
 * shows or says: a sign never starts a line on its own, so the space before « : ; ! ? » and « » »,
 * after « « », and between a number and « % » becomes a no-break space; the apostrophe is straight,
 * as the key the child learns. What the child types keeps its ordinary spaces (ADR-023): a no-break
 * space would ask for a key the keyboard does not have.
 *
 * Only a space already there changes: the voice hears a no-break space as a space and a curly
 * apostrophe as a straight one (`voiceKey`), so no recording is lost.
 */

export const NO_BREAK_SPACE = '\u00a0';

/** @type {readonly (readonly [RegExp, string])[]} */
const RULES = [
	[/ (?=[:;!?»])/gu, NO_BREAK_SPACE],
	[/(?<=«) /gu, NO_BREAK_SPACE],
	[/(?<=\d) (?=%)/gu, NO_BREAK_SPACE],
	[/[\u2018\u2019]/gu, "'"]
];

/**
 * @param {string} text
 * @returns {string}
 */
export function typeset(text) {
	return RULES.reduce(
		(current, [pattern, replacement]) => current.replace(pattern, replacement),
		text
	);
}

/*
 * Where the texts live, file by file of `content/<language>/`: a path names a string by its keys,
 * `[]` standing for any element of an array. `shown`: shown or said; `typed`: typed by the child
 * (or by the adult who records a trace); `notes`: neither, written for the people who read the data.
 */

/**
 * @typedef {{ readonly shown: readonly string[], readonly typed: readonly string[], readonly notes?: readonly string[] }} TextFields
 */

/** @type {Readonly<Record<string, TextFields>>} */
export const TEXT_FIELDS = {
	progression: {
		shown: [
			'worlds[].title',
			'worlds[].lessons[].title',
			'worlds[].lessons[].intro',
			'worlds[].lessons[].introByPlatform.mac',
			'worlds[].lessons[].steps[].text'
		],
		typed: [
			'rules.drillPatterns.vowels[]',
			'rules.drillPatterns.shapes[]',
			'rules.phraseEnd',
			'worlds[].lessons[].steps[].char',
			'worlds[].lessons[].newChars[]',
			'worlds[].lessons[].words[]',
			'worlds[].lessons[].warmUp[]',
			'worlds[].lessons[].warmUpReserve.alternatives[][]'
		]
	},
	rewards: {
		shown: ['colors[].title', 'nameSuggestions[]', 'rewards[].title', 'rewards[].description'],
		typed: ['rewards[].condition.chars[]']
	},
	story: {
		shown: ['worlds[].opening', 'worlds[].ending', 'worlds[].lessons[].line'],
		typed: []
	},
	adult: { shown: ['numbers[].words'], typed: [] },
	dev: { shown: ['prompts[].title', 'prompts[].instruction'], typed: ['prompts[].text'] },
	phrases: { shown: [], typed: ['phrases[].text'] },
	texts: { shown: [], typed: ['texts[].lines[]'] },
	words: {
		shown: ['themes[].title'],
		typed: ['words[].text'],
		notes: ['sources[].name', 'sources[].license']
	}
};

/**
 * @typedef {{ readonly path: string, readonly text: string }} FoundText
 */

/**
 * Every string of `data`, with its path: indices are written `[]`.
 * @param {unknown} data
 * @returns {FoundText[]}
 */
export function stringsOf(data) {
	/** @type {FoundText[]} */
	const found = [];
	/**
	 * @param {unknown} value
	 * @param {string} path
	 */
	function visit(value, path) {
		if (typeof value === 'string') found.push({ path, text: value });
		else if (Array.isArray(value)) for (const item of value) visit(item, `${path}[]`);
		else if (value !== null && typeof value === 'object') {
			for (const [key, item] of Object.entries(value))
				visit(item, path === '' ? key : `${path}.${key}`);
		}
	}
	visit(data, '');
	return found;
}

/**
 * `data` with every string at one of `paths` passed through `change`; the rest is left as it is.
 * @param {unknown} data
 * @param {readonly string[]} paths
 * @param {(text: string) => string} change
 * @returns {unknown}
 */
export function mapStrings(data, paths, change) {
	/**
	 * @param {unknown} value
	 * @param {string} path
	 * @returns {unknown}
	 */
	function visit(value, path) {
		if (typeof value === 'string') return paths.includes(path) ? change(value) : value;
		if (Array.isArray(value)) return value.map((item) => visit(item, `${path}[]`));
		if (value !== null && typeof value === 'object') {
			return Object.fromEntries(
				Object.entries(value).map(([key, item]) => [
					key,
					visit(item, path === '' ? key : `${path}.${key}`)
				])
			);
		}
		return value;
	}
	return visit(data, '');
}
