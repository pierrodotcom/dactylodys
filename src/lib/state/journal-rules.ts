/** How much of the journal of plays a profile keeps. */
export interface JournalRules {
	/**
	 * Most recent finished plays kept in `Profile.sessions`; older ones are dropped, the days
	 * played (`practiceDays`) are not. About two years of daily practice.
	 */
	readonly maxSessions: number;
}

export const JOURNAL_RULES: JournalRules = { maxSessions: 2000 };
