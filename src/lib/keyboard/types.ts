/** Physical key identifier: a `KeyboardEvent.code` value such as `KeyQ` or `BracketLeft`. */
export type KeyCode = string;

export type LayoutPlatform = 'pc' | 'mac';
export type KeyboardGeometry = 'iso' | 'ansi';

/** `altgr` is AltGr on PC and Option on Mac. */
export type ModifierLevel = 'base' | 'shift' | 'altgr' | 'shiftAltgr';

export interface DeadKeyReference {
	/** Key of `LayoutDefinition.deadKeys`. */
	readonly dead: string;
}

export type KeyOutput = string | DeadKeyReference;
export type KeyLevels = Readonly<Partial<Record<ModifierLevel, KeyOutput>>>;

export interface DeadKeyDefinition {
	/** Character produced when the dead key is followed by Space. */
	readonly standalone: string;
	/** Base character to composed character, e.g. `e` to `ê`. */
	readonly compositions: Readonly<Record<string, string>>;
}

export interface LayoutSource {
	readonly name: string;
	readonly url: string;
	readonly license: string;
}

export interface LayoutDefinition {
	readonly schemaVersion: 1;
	/** `<language>-<country>-<variant>-<platform>`, e.g. `fr-fr-azerty-pc`. */
	readonly id: string;
	/** BCP 47 tag of the language the layout is designed for. */
	readonly locale: string;
	readonly platform: LayoutPlatform;
	readonly geometry: KeyboardGeometry;
	readonly sources: readonly LayoutSource[];
	readonly keys: Readonly<Record<KeyCode, KeyLevels>>;
	readonly deadKeys: Readonly<Record<string, DeadKeyDefinition>>;
}

export interface KeyPress {
	readonly code: KeyCode;
	readonly level: ModifierLevel;
}

/** Ordered key presses producing one character; two presses when a dead key is involved. */
export type KeySequence = readonly KeyPress[];

/** Every way a layout can produce each character (NFC). */
export type CharIndex = ReadonlyMap<string, readonly KeySequence[]>;

export type Hand = 'left' | 'right';
export type FingerName = 'pinky' | 'ring' | 'middle' | 'index' | 'thumb';
export type Finger = `${Hand}-${FingerName}`;

/** Finger assignment depends on the physical position of keys, not on the layout. */
export interface FingeringProfile {
	readonly schemaVersion: 1;
	readonly id: string;
	readonly geometry: KeyboardGeometry;
	readonly fingers: Readonly<Record<KeyCode, Finger>>;
	readonly homeKeys: Readonly<Partial<Record<Finger, KeyCode>>>;
}

export interface GeometryKey {
	readonly code: KeyCode;
	/** Width in key units; a letter key is 1. */
	readonly width: number;
}

export interface GeometryRow {
	/** Horizontal offset of the first key, in key units. */
	readonly offset: number;
	readonly keys: readonly GeometryKey[];
}

/** Physical shape of a keyboard, used to draw it. Rows from top (digits) to bottom (space). */
export interface KeyboardGeometryDefinition {
	readonly schemaVersion: 1;
	/** e.g. `iso-105`. */
	readonly id: string;
	readonly geometry: KeyboardGeometry;
	readonly rows: readonly GeometryRow[];
}

export type RawInputEventType =
	| 'keydown'
	| 'keyup'
	| 'beforeinput'
	| 'input'
	| 'compositionstart'
	| 'compositionupdate'
	| 'compositionend';

/** Plain-data copy of a DOM keyboard, input or composition event, so it can be recorded and replayed. */
export interface RawInputEvent {
	readonly type: RawInputEventType;
	/** Milliseconds on a monotonic clock. */
	readonly timestamp: number;
	readonly key?: string;
	readonly code?: string;
	readonly repeat?: boolean;
	readonly isComposing?: boolean;
	readonly shiftKey?: boolean;
	readonly ctrlKey?: boolean;
	readonly altKey?: boolean;
	readonly metaKey?: boolean;
	/** `getModifierState('AltGraph')`. */
	readonly altGraph?: boolean;
	/** `getModifierState('CapsLock')`; absent from traces recorded before it was captured. */
	readonly capsLock?: boolean;
	readonly inputType?: string;
	readonly data?: string | null;
}

export type KeystrokeKind = 'char' | 'backspace' | 'enter';

/** What the typing engine consumes: one intended keystroke, whatever the browser and OS did to deliver it. */
export interface NormalizedKeystroke {
	readonly kind: KeystrokeKind;
	/** Produced character (one NFC grapheme) when `kind` is `char`, otherwise `null`. */
	readonly char: string | null;
	/** Physical key that completed the keystroke, `null` when unknown. */
	readonly code: KeyCode | null;
	readonly timestamp: number;
	/** `true` when the character went through a dead key or a composition. */
	readonly composed: boolean;
}

export interface InputNormalizer {
	push(event: RawInputEvent): readonly NormalizedKeystroke[];
	reset(): void;
}

export interface TraceEnvironment {
	readonly browser: string;
	readonly browserVersion: string;
	readonly os: string;
	readonly osVersion: string;
	readonly userAgent: string;
	/** Free description of the hardware, e.g. `Logitech K120 AZERTY`. */
	readonly keyboard: string;
	/** ISO 8601 date. */
	readonly recordedAt: string;
}

export interface KeyboardTrace {
	readonly schemaVersion: 1;
	readonly layoutId: string;
	/** Text the tester was asked to type. */
	readonly expectedText: string;
	readonly environment: TraceEnvironment;
	/** `true` for hand-written traces that were not recorded on real hardware. */
	readonly synthetic: boolean;
	readonly events: readonly RawInputEvent[];
}
