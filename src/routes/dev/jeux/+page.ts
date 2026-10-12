import { defaultSettings } from '$lib/state/profile';
import { loadKeyboardAssets } from '../../jouer/assets';

export const load = async () => ({
	assets: await loadKeyboardAssets(defaultSettings('pc'))
});
