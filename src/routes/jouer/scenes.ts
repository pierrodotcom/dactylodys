import { parseSceneSchedule, type SceneSchedule } from '$lib/engine/rewards/scenes';
import scenesData from '../../../content/common/scenes.json';

/** The surprise scenes of each game and when they are unlocked: data, never constants in the code. */
export const SCENE_SCHEDULE: SceneSchedule = parseSceneSchedule(scenesData);
