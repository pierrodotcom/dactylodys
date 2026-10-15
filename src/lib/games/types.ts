import type { SoundPlayer } from '../audio';
import type { GhostRun, PacePoint } from '../engine/ghost/types';
import type { Exercise, GuideMode } from '../engine/progression/types';
import type { ErrorPolicy, SessionMetrics } from '../engine/types';
import type {
	CharIndex,
	FingeringProfile,
	KeyboardGeometryDefinition,
	LayoutDefinition
} from '../keyboard/types';

/** What the hand drawn on the keyboard shows during the exercise, decided by the lesson. */
export interface GameGuide {
	readonly mode: GuideMode;
	/** The characters the lesson brings, shown in the `new-keys` mode. */
	readonly freshChars: readonly string[];
}

export interface GameSettings {
	readonly soundEnabled: boolean;
	readonly reducedMotion: boolean;
	readonly showKeyboard: boolean;
	readonly errorPolicy: ErrorPolicy;
	readonly guide: GameGuide;
}

export interface GameOutcome {
	/** Metrics combined over all the groups of the exercise. */
	readonly metrics: SessionMetrics;
	/** How far the exercise was at the end of each group, filled in by the shell shared by the games. */
	readonly pace: readonly PacePoint[];
}

/**
 * Props of every mini-game component. A mini-game holds no pedagogy: it types the
 * exercise it is given and reports what happened.
 */
export interface GameProps {
	readonly exercise: Exercise;
	readonly layout: LayoutDefinition;
	readonly charIndex: CharIndex;
	readonly geometry: KeyboardGeometryDefinition;
	readonly fingering: FingeringProfile;
	readonly settings: GameSettings;
	/** Shared by the whole play route and already bound to the sound setting of the profile. */
	readonly sounds: SoundPlayer;
	/** An earlier play of the same lesson to race against; a game is free to ignore it. */
	readonly ghost?: GhostRun;
	readonly onComplete: (outcome: GameOutcome) => void;
	readonly onQuit: () => void;
}

/** A mini-game as the play flow sees it. Its title and description live in the messages, keyed by `id`. */
export interface GameDefinition {
	readonly id: string;
	readonly load: () => Promise<{ default: import('svelte').Component<GameProps> }>;
}
