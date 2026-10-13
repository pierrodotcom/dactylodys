/**
 * How far an exercise was at the end of one of its groups. Both numbers are cumulated since the
 * start of the exercise.
 */
export interface PacePoint {
	/** Correct keystrokes so far. */
	readonly correctChars: number;
	/**
	 * Time spent typing so far: the sum of the durations of the groups, each measured from its
	 * first to its last keystroke. The time before a group and the rewards between groups are
	 * left out, so that a child who reads slowly or enjoys a reward does not race a faster ghost.
	 */
	readonly activeMs: number;
}

/**
 * The pace of one past play of a lesson: the rhythm only, never the text, since the next exercise
 * of the lesson is made of other groups. Plain JSON, stored in the profile.
 */
export interface GhostRun {
	readonly recordedAt: number;
	/** `correctChars` of the last point. */
	readonly charCount: number;
	/** `activeMs` of the last point. */
	readonly activeMs: number;
	/** In the order of the groups; both numbers never decrease. */
	readonly points: readonly PacePoint[];
}
