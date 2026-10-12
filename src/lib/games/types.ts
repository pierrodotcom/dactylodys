import type { SoundPlayer } from '../audio';
import type { Exercise } from '../engine/progression/types';
import type { ErrorPolicy, SessionMetrics } from '../engine/types';
import type {
	CharIndex,
	FingeringProfile,
	KeyboardGeometryDefinition,
	LayoutDefinition
} from '../keyboard/types';

export interface GameSettings {
	readonly soundEnabled: boolean;
	readonly reducedMotion: boolean;
	readonly showKeyboard: boolean;
	readonly errorPolicy: ErrorPolicy;
}

export interface GameOutcome {
	/** Metrics combined over all the groups of the exercise. */
	readonly metrics: SessionMetrics;
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
	readonly onComplete: (outcome: GameOutcome) => void;
	readonly onQuit: () => void;
}

/** A mini-game as the play flow sees it. Its title and description live in the messages, keyed by `id`. */
export interface GameDefinition {
	readonly id: string;
	readonly load: () => Promise<{ default: import('svelte').Component<GameProps> }>;
}
