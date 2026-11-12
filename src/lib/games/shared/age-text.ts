import { AGE_BANDS } from '../../engine/progression/banks';
import type { AgeBand } from '../../engine/progression/types';

/** A sentence a game shows, which may have a variant for the older children. */
export type AgedText = (ageBand?: AgeBand) => string;

/**
 * A bubble that sounds too young for the older children (ADR-057, proposal 15): they get its
 * `_older` variant, every other age group (or none given) gets the usual sentence.
 */
export function withOlderVariant(text: () => string, older: () => string): AgedText {
	return (ageBand) => (ageBand !== undefined && ageBand !== AGE_BANDS[0] ? older() : text());
}
