const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function toGraphemes(text: string): string[] {
	const normalized = text.normalize('NFC').replace(/\r\n?/g, '\n');
	return Array.from(segmenter.segment(normalized), (part) => part.segment);
}
