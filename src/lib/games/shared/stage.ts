/**
 * Steps of a picture to show while a group is typed: more as the group advances, none before the
 * first good key, at least one right after it, all of them once the group is complete.
 */
export function stageFor(position: number, length: number, stageCount: number): number {
	if (length <= 0 || position <= 0) return 0;
	return Math.min(stageCount, Math.ceil((stageCount * position) / length));
}

/** Share (0 to 1) of a group already typed. */
export function groupRatio(position: number, length: number): number {
	if (length <= 0) return 0;
	return Math.min(1, Math.max(0, position / length));
}
