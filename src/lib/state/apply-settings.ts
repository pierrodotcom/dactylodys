import type { Settings } from './types';

/** The subset of `Element` that `applySettings` needs, so it can be tested without a DOM. */
export interface SettingsRoot {
	setAttribute(name: string, value: string): void;
	removeAttribute(name: string): void;
}

const FOLLOW_SYSTEM = 'system';
const THEME_ATTRIBUTE = 'data-theme';
const MOTION_ATTRIBUTE = 'data-motion';
const TEXT_SCALE_ATTRIBUTE = 'data-text-scale';
const TEXT_SPACING_ATTRIBUTE = 'data-text-spacing';

function setAttributeOrRemove(root: SettingsRoot, name: string, value: string | null) {
	if (value === null) root.removeAttribute(name);
	else root.setAttribute(name, value);
}

function unlessSystem(value: string): string | null {
	return value === FOLLOW_SYSTEM ? null : value;
}

export function applySettings(settings: Settings, root: SettingsRoot): void {
	setAttributeOrRemove(root, THEME_ATTRIBUTE, unlessSystem(settings.theme));
	setAttributeOrRemove(root, MOTION_ATTRIBUTE, unlessSystem(settings.motion));
	root.setAttribute(TEXT_SCALE_ATTRIBUTE, settings.textScale);
	root.setAttribute(TEXT_SPACING_ATTRIBUTE, settings.textSpacing);
}
