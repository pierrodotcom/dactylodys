/**
 * @typedef {{ text: string, lessonId?: string }} PhraseLike
 */

/**
 * Story phrases (those with a `lessonId`) are written straight into the bank, not in
 * `phrases.fr.txt`: a new build keeps them as they are, after the generated phrases.
 * @template {PhraseLike} G
 * @template {PhraseLike} S
 * @param {readonly G[]} generated phrases built from `phrases.fr.txt`
 * @param {{ phrases?: readonly S[] } | undefined} previous the bank before this build, if any
 * @returns {(G | S)[]}
 */
export function withStoryPhrases(generated, previous) {
	const story = (previous?.phrases ?? []).filter((phrase) => phrase.lessonId !== undefined);
	const texts = new Set(generated.map((phrase) => phrase.text));
	for (const phrase of story) {
		if (texts.has(phrase.text)) {
			throw new Error(`Story phrase also in phrases.fr.txt: "${phrase.text}"`);
		}
	}
	return [...generated, ...story];
}
