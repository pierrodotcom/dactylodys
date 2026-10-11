const SEGMENTER = new Intl.Segmenter('en', { granularity: 'grapheme' });
const CONTROL_ONLY = /^\p{Cc}+$/u;

export function splitGraphemes(text: string): string[] {
	return Array.from(SEGMENTER.segment(text), (part) => part.segment);
}

/** Splits into typeable graphemes: NFC, one grapheme each, control characters dropped. */
export function toTypedGraphemes(text: string): string[] {
	const result: string[] = [];
	for (const raw of splitGraphemes(text.normalize('NFC'))) {
		const grapheme = raw.normalize('NFC');
		if (CONTROL_ONLY.test(grapheme)) continue;
		if (splitGraphemes(grapheme).length === 1) result.push(grapheme);
	}
	return result;
}
