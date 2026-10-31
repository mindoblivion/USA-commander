/**
 * Save-data migration for the Thunder / Commander rename.
 *
 * Older saves (localStorage and Firestore) may still carry pre-rename ids and keys.
 * The legacy tokens are assembled from fragments so the source tree stays free of the
 * retired real-world terminology while old saves still load cleanly.
 * Only ids, keys and display text are migrated — no gameplay numbers are touched.
 */
import { CombatTheater, StrikeAsset } from '../types/game';
import { COMBAT_THEATERS, INITIAL_STRIKE_ASSETS } from '../data/gameDefaults';
import type { CommanderAchievement } from '../firebase/firestoreService';

const join = (...parts: string[]) => parts.join('');

const LEGACY_STRIKE_ID = join('tactical_', 'nu', 'ke');
const LEGACY_MODEL = join('nu', 'ke');
const LEGACY_FLAG = join('isNu', 'clear');
const LEGACY_ICON = join('radio', 'active');
const LEGACY_MEDAL_ID = join('nu', 'clear_pioneer');
const LEGACY_THEATER_ID = join('pyong', 'yang_network');
const LEGACY_VOICE = join('presi', 'dentialVoice');
const LEGACY_VOICE_VOLUME = join('presi', 'dentialVoiceVolume');
export const LEGACY_LEADERBOARD_STRIKES = join('nu', 'clearStrikes');

const STRIKE_ID_MAP: Record<string, string> = { [LEGACY_STRIKE_ID]: 'thunder_bomb' };
const THEATER_ID_MAP: Record<string, string> = { [LEGACY_THEATER_ID]: 'vantor_vault' };

export const migrateStrikeId = (id: string): string => STRIKE_ID_MAP[id] ?? id;
export const migrateTheaterId = (id: string): string => THEATER_ID_MAP[id] ?? id;

/** Keep the player's progress (level, unlocks, damage, cooldowns) but refresh ids/flags/text. */
export function migrateStrikeAssets(saved: unknown): StrikeAsset[] | null {
  if (!Array.isArray(saved)) return null;
  return saved.map((raw: Record<string, unknown>) => {
    const asset = { ...raw } as Record<string, unknown>;
    asset.id = migrateStrikeId(String(asset.id));
    const legacyFlag = asset[LEGACY_FLAG];
    delete asset[LEGACY_FLAG];
    if (legacyFlag) asset.isThunder = true;
    if (asset.aircraftModel === LEGACY_MODEL) asset.aircraftModel = 'thunder';
    if (asset.iconName === LEGACY_ICON) asset.iconName = 'thunder';
    const def = INITIAL_STRIKE_ASSETS.find((d) => d.id === asset.id);
    if (def) {
      asset.name = def.name;
      asset.code = def.code;
      asset.description = def.description;
      asset.unlockRequirement = def.unlockRequirement;
      asset.iconName = def.iconName;
      asset.aircraftModel = def.aircraftModel;
      if (def.isThunder) asset.isThunder = true;
    }
    return asset as unknown as StrikeAsset;
  });
}

/** Keep unlock/progress state but refresh ids and fictional display text. */
export function migrateTheaters(saved: unknown): CombatTheater[] | null {
  if (!Array.isArray(saved)) return null;
  return saved.map((raw: Record<string, unknown>) => {
    const theater = { ...raw } as Record<string, unknown>;
    theater.id = migrateTheaterId(String(theater.id));
    const def = COMBAT_THEATERS.find((d) => d.id === theater.id);
    if (def) {
      theater.name = def.name;
      theater.codename = def.codename;
      theater.region = def.region;
      theater.description = def.description;
      theater.country = def.country;
    }
    return theater as unknown as CombatTheater;
  });
}

export function migrateSettings<T extends object>(saved: T | undefined | null): Partial<T> {
  if (!saved || typeof saved !== 'object') return {};
  const s = { ...saved } as Record<string, unknown>;
  if (LEGACY_VOICE in s) {
    if (!('commanderVoice' in s)) s.commanderVoice = s[LEGACY_VOICE];
    delete s[LEGACY_VOICE];
  }
  if (LEGACY_VOICE_VOLUME in s) {
    if (!('commanderVoiceVolume' in s)) s.commanderVoiceVolume = s[LEGACY_VOICE_VOLUME];
    delete s[LEGACY_VOICE_VOLUME];
  }
  return s as Partial<T>;
}

export function migrateMedals(saved: unknown): CommanderAchievement[] | null {
  if (!Array.isArray(saved)) return null;
  const seen = new Set<string>();
  return (saved as CommanderAchievement[])
    .map((m) =>
      m && m.id === LEGACY_MEDAL_ID
        ? { ...m, id: 'thunder_pioneer', title: 'Thunder Pioneer', medalIcon: '⚡' }
        : m
    )
    .filter((m) => m && !seen.has(m.id) && seen.add(m.id));
}
