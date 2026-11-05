import { isLessonUnlocked } from '$lib/engine/progression/progress';
import type { ProgressionDefinition, WorldDefinition } from '$lib/engine/progression/types';
import type { Profile } from '$lib/state/types';

/** The worlds the adult may open ahead: those whose first lesson the child cannot play yet. */
export function worldsToOpen(
	progression: ProgressionDefinition,
	profile: Profile
): readonly WorldDefinition[] {
	return progression.worlds.filter((world) => {
		const first = world.lessons[0];
		return (
			first !== undefined &&
			!isLessonUnlocked(progression, profile.progress, first.id, profile.openedWorldIds)
		);
	});
}

/** The worlds of the progression the adult opened ahead, in the order they were opened. */
export function openedWorlds(
	progression: ProgressionDefinition,
	profile: Profile
): readonly WorldDefinition[] {
	return profile.openedWorldIds.flatMap((id) => {
		const world = progression.worlds.find((candidate) => candidate.id === id);
		return world ? [world] : [];
	});
}
