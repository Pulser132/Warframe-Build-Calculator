#!/usr/bin/env node
/**
 * Build-time data transform (Stage 2).
 *
 * Reads the bundled `@wfcd/items` JSON and emits the curated internal dataset to
 * `src/data/generated/`:
 *
 *  - **weapons.json** — EVERY Primary + Secondary gun, mapped **generically**.
 *    Each weapon's `attacks[]` becomes one or more `FireMode`s (single-mode → one
 *    mode; genuine multi-mode → N; AoE → one mode with a direct + a radial
 *    component). Incarnon alt-forms are dropped (Stage 6). No weapon is
 *    special-cased: the mechanic fields (trigger, multishot/pellets, shot_type,
 *    charge_time, falloff, beam fire rate) are read straight off the record.
 *  - **mods.json / arcanes.json** — a CURATED set (mods are hand-authored: the
 *    dump only gives stat strings, so `src/data/mods/descriptors.ts` supplies the
 *    structured effects). Pinned by exact `uniqueName`.
 *
 * Data conventions resolved here (see docs/planning/weapons-coverage/Plan.md):
 *  - `@wfcd falloff.reduction` is the **remaining multiplier** at max distance
 *    (Vulkar 0.5, Vaykor 0.7333). We store `maxReduction = 1 − reduction` (the
 *    fraction removed), so a radial rim factor is `1 − maxReduction = reduction`.
 *  - Burst count/delay are NOT in the dump (they are mechanics) → supplied by the
 *    small `BURST_META` table; beam ramp start by `BEAM_RAMP`.
 *
 * Re-run with: `npm run build:data`
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'node_modules', '@wfcd', 'items', 'data', 'json');
const OUT_DIR = join(__dirname, '..', 'src', 'data', 'generated');

/**
 * `@wfcd damagePerShot` array order is **Impact, Puncture, Slash**, then the
 * elements. The authoritative per-attack `attacks[].damage` map and the wiki
 * agree on this order (Vaykor Hek index1 = 48.75 = **Puncture**, Soma Prime
 * index2 = 6 = **Slash**, Ax-52 index1 = 40 = **Puncture**). NOTE: the top-level
 * `damage` OBJECT and this array both transpose Slash↔Puncture relative to
 * `attacks[].damage` — see `swapSlashPuncture`. Only used as a fallback; the
 * per-attack `damage` map is preferred everywhere it exists.
 */
const DAMAGE_ORDER = [
  'impact', 'puncture', 'slash', 'heat', 'cold', 'electricity', 'toxin',
  'blast', 'radiation', 'gas', 'magnetic', 'viral', 'corrosive', 'void',
];
/** Damage types the engine carries (others, e.g. tau/drain, are dropped). */
const KNOWN_TYPES = new Set([...DAMAGE_ORDER, 'true']);

/**
 * Weapon kept first in weapons.json so the app default + Stage 1 tests are
 * stable. Everything else follows, sorted by name.
 */
const DEFAULT_WEAPON = 'Vulkar Wraith';

/** Burst mechanics (count, inter-burst delay) — not present in the dump. */
const BURST_META = {
  Hind: { count: 5, delay: 0.25 },
};
const DEFAULT_BURST = { count: 3, delay: 0.2 };

/** Beam damage-ramp starting fraction by weapon (default 0.2). */
const BEAM_RAMP = {
  Phage: 0.7,
  Embolist: 0.3,
};
const DEFAULT_BEAM_RAMP = 0.2;

/** Curated mods, pinned by full `uniqueName` (trailing segment is NOT unique). */
const MOD_UNIQUE_NAMES = [
  // ── Rifle (Stage 1 slice) ──
  '/Lotus/Upgrades/Mods/Rifle/WeaponDamageAmountMod', // Serration
  '/Lotus/Upgrades/Mods/Rifle/WeaponFireIterationsMod', // Split Chamber
  '/Lotus/Upgrades/Mods/Rifle/WeaponCritChanceMod', // Point Strike
  '/Lotus/Upgrades/Mods/Rifle/WeaponCritDamageMod', // Vital Sense
  '/Lotus/Upgrades/Mods/Rifle/WeaponStunChanceMod', // Rifle Aptitude
  '/Lotus/Upgrades/Mods/Rifle/WeaponToxinDamageMod', // Infected Clip
  '/Lotus/Upgrades/Mods/Rifle/WeaponElectricityDamageMod', // Stormbringer
  '/Lotus/Upgrades/Mods/Rifle/WeaponFireRateMod', // Speed Trigger
  '/Lotus/Upgrades/Mods/Rifle/WeaponFactionDamageGrineer', // Bane of Grineer
  '/Lotus/Upgrades/Mods/Aura/PlayerRifleDamageAuraMod', // Rifle Amp (aura)
  '/Lotus/Upgrades/Mods/Rifle/WeaponBeamDistanceMod', // Sinister Reach (exilus)
  // ── Secondary (pistol) ──
  '/Lotus/Upgrades/Mods/Pistol/WeaponDamageAmountMod', // Hornet Strike
  '/Lotus/Upgrades/Mods/Pistol/WeaponFireIterationsMod', // Barrel Diffusion
  '/Lotus/Upgrades/Mods/Pistol/DualStat/GrinderMod', // Lethal Torrent
  '/Lotus/Upgrades/Mods/Pistol/WeaponCritChanceMod', // Pistol Gambit
  '/Lotus/Upgrades/Mods/Pistol/WeaponElectricityDamageMod', // Convulsion
  '/Lotus/Upgrades/Mods/Pistol/WeaponToxinDamageMod', // Pathogen Rounds
  '/Lotus/Upgrades/Mods/Pistol/WeaponStunChanceMod', // Sure Shot
  '/Lotus/Upgrades/Mods/Pistol/WeaponFireRateMod', // Gunslinger
  // ── Shotgun ──
  '/Lotus/Upgrades/Mods/Shotgun/WeaponDamageAmountMod', // Point Blank
  '/Lotus/Upgrades/Mods/Shotgun/WeaponFireIterationsMod', // Hell's Chamber
  '/Lotus/Upgrades/Mods/Shotgun/WeaponCritChanceMod', // Blunderbuss
  '/Lotus/Upgrades/Mods/Shotgun/WeaponElectricityDamageMod', // Charged Shell
  '/Lotus/Upgrades/Mods/Shotgun/WeaponToxinDamageMod', // Contagious Spread
  '/Lotus/Upgrades/Mods/Shotgun/WeaponStunChanceMod', // Shotgun Savvy
  // ── Melee (Stage 3) ──
  '/Lotus/Upgrades/Mods/Melee/Expert/WeaponMeleeDamageModExpert', // Primed Pressure Point
  '/Lotus/Upgrades/Mods/Melee/Beginner/WeaponMeleeDamageModBeginner', // Pressure Point
  '/Lotus/Upgrades/Mods/Melee/Beginner/WeaponCritDamageModBeginner', // Organ Shatter
  '/Lotus/Upgrades/Mods/Melee/Beginner/WeaponCritChanceModBeginner', // True Steel
  '/Lotus/Upgrades/Mods/Melee/Beginner/WeaponStunChanceModBeginner', // Melee Prowess
  '/Lotus/Upgrades/Mods/Melee/Beginner/WeaponToxinDamageModBeginner', // Fever Strike
  '/Lotus/Upgrades/Mods/Melee/Beginner/WeaponFireDamageModBeginner', // Molten Impact
  '/Lotus/Upgrades/Mods/Melee/Beginner/WeaponFreezeDamageModBeginner', // North Wind
  '/Lotus/Upgrades/Mods/Melee/Beginner/WeaponElectricityDamageModBeginner', // Shocking Touch
  '/Lotus/Upgrades/Mods/Melee/Beginner/WeaponFireRateModBeginner', // Fury
  '/Lotus/Upgrades/Mods/Melee/DualStat/CorruptedDamageSpeedMod', // Spoiled Strike
  '/Lotus/Upgrades/Mods/Melee/Expert/WeaponMeleeRangeIncModExpert', // Primed Reach
  '/Lotus/Upgrades/Mods/Melee/Event/ComboCritChanceMod', // Blood Rush
  '/Lotus/Upgrades/Mods/Melee/Event/ComboStatusChanceMod', // Weeping Wounds
  '/Lotus/Upgrades/Mods/Melee/WeaponDamageIfVictimProcActive', // Condition Overload
  // ── Stances ──
  '/Lotus/Weapons/Tenno/Melee/MeleeTrees/TonfaCmbOneMeleeTree', // Gemini Cross (Tonfas)
  '/Lotus/Weapons/Tenno/Melee/MeleeTrees/TonfaCmbTwoMeleeTree', // Sovereign Outcast (Tonfas)
  '/Lotus/Weapons/Tenno/Melee/MeleeTrees/AxeCmbThreeMeleeTree', // Tempo Royale (Heavy Blade)
  '/Lotus/Weapons/Tenno/Melee/MeleeTrees/AxeCmbTwoMeleeTree', // Cleaving Whirlwind (Heavy Blade)
  // ── Warframe ability-attribute mods (Stage 4) ──
  '/Lotus/Upgrades/Mods/Warframe/AvatarAbilityStrengthMod', // Intensify
  '/Lotus/Upgrades/Mods/Warframe/DualStat/CorruptedPowerStrengthPowerDurationWarframe', // Transient Fortitude
  '/Lotus/Upgrades/Mods/Warframe/DualStat/CorruptedPowerEfficiencyWarframe', // Blind Rage
  '/Lotus/Upgrades/Mods/Warframe/DualStat/CorruptedRangePowerWarframe', // Overextended
  '/Lotus/Upgrades/Mods/Warframe/AvatarAbilityEfficiencyMod', // Streamline
  '/Lotus/Upgrades/Mods/Warframe/DualStat/CorruptedEfficiencyDurationWarframe', // Fleeting Expertise
  '/Lotus/Upgrades/Mods/Warframe/DualStat/CorruptedDurationRangeWarframe', // Narrow Minded
  '/Lotus/Upgrades/Mods/Warframe/AvatarAbilityRangeMod', // Stretch
  '/Lotus/Upgrades/Mods/Warframe/AvatarAbilityDurationMod', // Continuity
  '/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModPower', // Power Drift (exilus)
  '/Lotus/Upgrades/Mods/OrokinChallenge/OrokinChallengeModCunning', // Cunning Drift (exilus)
  // ── Umbral set ──
  '/Lotus/Upgrades/Mods/Sets/Umbra/WarframeUmbraModC', // Umbral Intensify
  '/Lotus/Upgrades/Mods/Sets/Umbra/WarframeUmbraModA', // Umbral Vitality
  '/Lotus/Upgrades/Mods/Sets/Umbra/WarframeUmbraModB', // Umbral Fiber
  // ── Survivability ──
  '/Lotus/Upgrades/Mods/Warframe/AvatarHealthMaxMod', // Vitality
  '/Lotus/Upgrades/Mods/Warframe/AvatarArmourMod', // Steel Fiber
  '/Lotus/Upgrades/Mods/Warframe/AvatarShieldMaxMod', // Redirection
  // ── Aura ──
  '/Lotus/Upgrades/Mods/Aura/EnemyArmorReductionAuraMod', // Corrosive Projection
];

/** Curated arcanes, by exact name. */
const ARCANES = ['Primary Merciless', 'Primary Deadhead', 'Molt Augmented'];

/** Warframes kept first (reference frame) so the app default is stable. */
const DEFAULT_WARFRAME = 'Rhino Prime';

function loadCategory(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function maxRankStats(item) {
  const ls = item.levelStats ?? [];
  return ls.length ? (ls[ls.length - 1].stats ?? []) : [];
}

// ── Fire-mode mapping ────────────────────────────────────────────────────────

function normalizeTrigger(raw) {
  const t = String(raw ?? '').toLowerCase();
  if (t.includes('held') || t.includes('continuous') || t.includes('beam')) return 'held';
  if (t.includes('burst')) return 'burst';
  if (t.includes('charge')) return 'charge';
  if (t.includes('semi')) return 'semi';
  return 'auto';
}

function mapDelivery(shotType) {
  const s = String(shotType ?? '').toLowerCase();
  if (s.includes('aoe') || s.includes('area')) return 'aoe';
  if (s.includes('projectile')) return 'projectile';
  return 'hitscan';
}

function isAoeAttack(a) {
  return mapDelivery(a.shot_type) === 'aoe';
}

function weaponClassOf(w) {
  const type = String(w.type ?? '').toLowerCase();
  if (type.includes('shotgun')) return 'shotgun';
  if (type.includes('sniper')) return 'sniper';
  if (type.includes('bow')) return 'bow';
  if (type.includes('launcher')) return 'launcher';
  if (type.includes('pistol')) return 'pistol';
  if (normalizeTrigger(w.trigger) === 'held') return 'beam';
  return w.category === 'Secondary' ? 'pistol' : 'rifle';
}

/** Clean a `{type: value}` damage object to known nonzero types. */
function cleanDamage(dmg) {
  const out = {};
  for (const [type, value] of Object.entries(dmg ?? {})) {
    if (type === 'total') continue;
    if (KNOWN_TYPES.has(type) && value > 0) out[type] = value;
  }
  return out;
}

/** Damage from `damagePerShot[]` (fallback when an attack has no `damage` map). */
function damageFromPerShot(arr) {
  const out = {};
  for (let i = 0; i < DAMAGE_ORDER.length; i++) {
    const v = (arr ?? [])[i] ?? 0;
    if (v > 0) out[DAMAGE_ORDER[i]] = v;
  }
  return out;
}

/**
 * Transpose Slash↔Puncture in a cleaned damage map. The `@wfcd` top-level
 * `damage` OBJECT swaps these two relative to the authoritative
 * `attacks[].damage` map and the wiki (verified: Ax-52 object slash:40 → really
 * Puncture; Vaykor Hek object slash:48.75 → really Puncture; Soma Prime object
 * puncture:6 → really Slash; Enkaus object slash:8 → really Puncture). Apply
 * ONLY to the top-level object, never to `attacks[].damage` (already correct).
 */
function swapSlashPuncture(map) {
  const { slash, puncture, ...rest } = map;
  if (slash !== undefined) rest.puncture = slash;
  if (puncture !== undefined) rest.slash = puncture;
  return rest;
}

/** Authoritative top-level damage: cleaned `w.damage`, slash/puncture un-swapped. */
function topLevelDamage(w) {
  return swapSlashPuncture(cleanDamage(w.damage));
}

function sumValues(map) {
  let t = 0;
  for (const v of Object.values(map)) t += v;
  return Number(t.toFixed(5));
}

function convertFalloff(f) {
  if (!f) return undefined;
  // `@wfcd reduction` = remaining multiplier at `end`; store the fraction removed.
  return {
    start: f.start ?? 0,
    end: f.end ?? 0,
    maxReduction: Number((1 - (f.reduction ?? 1)).toFixed(5)),
  };
}

function componentFrom(attack, role, fallbackDamage) {
  // `@wfcd` damage (the `damage` object, `damagePerShot[]`, and `attacks[].damage`)
  // is already **per-pellet** — the in-game per-shot total is this × multishot, which
  // the pipeline applies. Do NOT divide by the pellet count here (verified: Vaykor Hek
  // 75/pellet × 7 = 525, Phantasma 15/pellet × 6 = 90, matching the Arsenal).
  const dmg = Object.keys(attack.damage ?? {}).length ? cleanDamage(attack.damage) : { ...(fallbackDamage ?? {}) };
  const component = {
    name: role === 'radial' ? 'Radial' : role === 'direct' ? 'Direct' : 'Normal',
    role,
    delivery: mapDelivery(attack.shot_type),
    damage: dmg,
    totalBaseDamage: sumValues(dmg),
  };
  // Only radial components apply falloff to damage this stage (projectile
  // distance falloff is Stage 5 metadata).
  if (role === 'radial') {
    const fo = convertFalloff(attack.falloff);
    if (fo) component.falloff = fo;
  }
  return component;
}

/** Build one FireMode from a "lead" attack + its components. */
function modeFrom(w, lead, components, name, fireRate) {
  const trigger = normalizeTrigger(lead.__trigger ?? w.trigger);
  const mode = {
    name,
    trigger,
    criticalChance: lead.crit_chance != null ? lead.crit_chance / 100 : (w.criticalChance ?? 0),
    criticalMultiplier: lead.crit_mult ?? w.criticalMultiplier ?? 1,
    statusChance: lead.status_chance != null ? lead.status_chance / 100 : (w.procChance ?? 0),
    fireRate: fireRate ?? lead.speed ?? w.fireRate ?? 1,
    baseMultishot: w.multishot ?? 1,
    components,
  };
  if (trigger === 'charge') {
    mode.chargeTime = lead.charge_time ?? (w.fireRate > 0 ? 1 / w.fireRate : 1);
    mode.bow = weaponClassOf(w) === 'bow';
  }
  if (trigger === 'burst') {
    mode.burst = BURST_META[w.name] ?? DEFAULT_BURST;
  }
  if (trigger === 'held') {
    mode.beam = {
      rampStartPct: BEAM_RAMP[w.name] ?? DEFAULT_BEAM_RAMP,
      rampSeconds: 0.6,
      ammoPerTick: 0.5,
    };
  }
  return mode;
}

/**
 * Map a weapon's `attacks[]` into fire modes. Heuristics (generic, documented):
 *  - drop Incarnon alt-forms (name contains "incarnon");
 *  - if any attack is AoE → ONE mode with a direct + a radial component;
 *  - if a charge weapon has multiple charge-level attacks → ONE mode (full charge);
 *  - otherwise each attack is a selectable fire mode.
 * The primary mode uses the weapon-level fire rate (matches the Arsenal value,
 * which for burst weapons is the in-burst rate); alt modes use the attack speed.
 */
function buildFireModes(w) {
  let attacks = (w.attacks ?? []).filter((a) => !/incarnon/i.test(a.name ?? ''));

  // No usable attacks → synthesize one mode from top-level stats.
  if (attacks.length === 0) {
    const dmg = topLevelDamage(w);
    const total = Object.keys(dmg).length ? dmg : damageFromPerShot(w.damagePerShot);
    const damage = { ...total };
    return [
      modeFrom(
        w,
        {},
        [{ name: 'Normal', role: 'normal', delivery: 'hitscan', damage, totalBaseDamage: sumValues(damage) }],
        'Normal Attack',
        w.fireRate,
      ),
    ];
  }

  const fallback = Object.keys(cleanDamage(w.damage)).length
    ? topLevelDamage(w)
    : damageFromPerShot(w.damagePerShot);

  // AoE present → group attacks into fire modes. Each direct (non-AoE) attack
  // starts a new mode; the AoE that immediately follows attaches as that mode's
  // radial component. A leading AoE with no preceding direct becomes a radial-
  // only mode. This keeps a weapon's primary fire and its small explosion (e.g.
  // Trumna's "Auto" + "Auto AoE") separate from a distinct alt-fire and its blast
  // (e.g. "Grenade Impact" + "Grenade Bounce AoE"), instead of collapsing every
  // attack into one mode and dropping the extra AoE.
  if (attacks.some(isAoeAttack)) {
    const groups = [];
    for (const a of attacks) {
      const last = groups[groups.length - 1];
      if (isAoeAttack(a)) {
        if (last && !last.radial) last.radial = a;
        else groups.push({ lead: a, radial: a });
      } else {
        groups.push({ lead: a, direct: a });
      }
    }
    return groups.map((g, i) => {
      const components = [];
      if (g.direct) components.push(componentFrom(g.direct, 'direct', fallback));
      if (g.radial) components.push(componentFrom(g.radial, 'radial', fallback));
      const lead = { ...g.lead };
      if (groups.length > 1) {
        if (/semi/i.test(g.lead.name ?? '')) lead.__trigger = 'Semi';
        else if (/auto/i.test(g.lead.name ?? '')) lead.__trigger = 'Auto';
        else if (/burst/i.test(g.lead.name ?? '')) lead.__trigger = 'Burst';
        else if (/charge/i.test(g.lead.name ?? '')) lead.__trigger = 'Charge';
      }
      const name = groups.length === 1 ? 'Normal Attack' : (g.lead.name ?? `Mode ${i + 1}`);
      const fr = i === 0 ? (w.fireRate || g.lead.speed) : (g.lead.speed ?? w.fireRate);
      return modeFrom(w, lead, components, name, fr);
    });
  }

  // Charge weapon with multiple charge tiers → collapse to the full charge.
  if (normalizeTrigger(w.trigger) === 'charge' && attacks.length > 1) {
    const full = attacks.reduce((a, b) => ((b.charge_time ?? 0) > (a.charge_time ?? 0) ? b : a));
    return [modeFrom(w, full, [componentFrom(full, 'normal', fallback)], 'Normal Attack')];
  }

  // Single-attack weapon → one mode built from the authoritative per-attack
  // `attacks[].damage` map (which matches the wiki for slash/puncture; the
  // top-level `damage` object transposes them — see `swapSlashPuncture`).
  // `componentFrom` already prefers `attack.damage` and only uses `fallback`
  // (the un-swapped top-level damage) when the attack carries no damage map.
  if (attacks.length === 1) {
    const a = attacks[0];
    return [modeFrom(w, a, [componentFrom(a, 'normal', fallback)], 'Normal Attack', w.fireRate || a.speed)];
  }

  // Genuine multi-mode: each attack → one selectable mode (per-mode damage only
  // lives in the attacks array, so we read it there).
  return attacks.map((a, i) => {
    // Infer an alt mode's trigger from its name when it differs from the weapon's.
    const lead = { ...a };
    if (/semi/i.test(a.name ?? '')) lead.__trigger = 'Semi';
    else if (/auto/i.test(a.name ?? '')) lead.__trigger = 'Auto';
    else if (/burst/i.test(a.name ?? '')) lead.__trigger = 'Burst';
    else if (/charge/i.test(a.name ?? '')) lead.__trigger = 'Charge';
    const name = a.name ?? `Mode ${i + 1}`;
    // Primary mode uses the weapon-level fire rate (Arsenal value / in-burst rate).
    const fr = i === 0 ? (w.fireRate || a.speed) : (a.speed ?? w.fireRate);
    return modeFrom(w, lead, [componentFrom(a, 'normal', fallback)], name, fr);
  });
}

// ── Melee mapping (Stage 3) ──────────────────────────────────────────────────

/**
 * `@wfcd` melee path segments don't cleanly encode the in-game weapon class
 * (e.g. Gram Prime sits under `/Swords/` but is a Heavy Blade). Derive the class
 * from the uniqueName path with a small override table for known quirks. The
 * class only gates **stance** compatibility (every other melee mod is `Melee`).
 */
const MELEE_CLASS_OVERRIDES = {
  'Gram Prime': 'heavy-blade',
  Gram: 'heavy-blade',
};
const MELEE_PATH_CLASS = [
  [/Tonfa/i, 'tonfa'],
  [/Nikana/i, 'nikana'],
  [/GreatSword|HeavyBlade|HeavySword|HeavyScythe/i, 'heavy-blade'],
  [/Polearm/i, 'polearm'],
  [/Staff|Tipedo/i, 'staff'],
  [/Hammer|Fragor/i, 'hammer'],
  [/Scythe/i, 'scythe'],
  [/DualDagger|DualSword|DualKama|DualShortSword|DualKeen/i, 'dual-swords'],
  [/Dagger/i, 'dagger'],
  [/Whip/i, 'whip'],
  [/Fist|Knuckle|Kogake|Sparring|KickAndPunch|Tekko/i, 'fist'],
  [/Claw/i, 'claws'],
  [/Glaive|Boomerang/i, 'glaive'],
  [/Warfan|Warabi/i, 'warfan'],
  [/Nunchaku|Ninkondi/i, 'nunchaku'],
  [/Gunblade|GunBlade/i, 'gunblade'],
  [/Machet|Cleaver/i, 'machete'],
  [/Rapier/i, 'rapier'],
  [/Axe/i, 'heavy-blade'],
  [/Sword|Cronus|Dervish|Phoenix/i, 'sword'],
];

function meleeWeaponClass(w) {
  if (MELEE_CLASS_OVERRIDES[w.name]) return MELEE_CLASS_OVERRIDES[w.name];
  const path = w.uniqueName ?? '';
  for (const [re, cls] of MELEE_PATH_CLASS) if (re.test(path)) return cls;
  return 'melee';
}

/** Distribute a scalar `total` across the proportions of a `{type: value}` map. */
function distribute(total, baseMap) {
  const baseTotal = sumValues(baseMap);
  if (baseTotal <= 0 || !total) return {};
  const out = {};
  for (const [t, v] of Object.entries(baseMap)) {
    const d = total * (v / baseTotal);
    if (d > 0) out[t] = Number(d.toFixed(5));
  }
  return out;
}

function meleeComponent(name, role, damage, opts = {}) {
  const c = {
    name,
    role,
    delivery: role === 'radial' ? 'aoe' : 'hitscan',
    damage,
    totalBaseDamage: sumValues(damage),
  };
  if (opts.falloff) c.falloff = opts.falloff;
  if (opts.forcedProcs) c.forcedProcs = opts.forcedProcs;
  return c;
}

/**
 * Build a melee weapon's fire modes from `attacks[]` + the top-level slam/heavy
 * fields. `attacks[].damage` is authoritative (no Slash↔Puncture swap). Modes:
 *  - **Normal Attack** (`melee`): the Normal attack, attack speed = `fireRate`.
 *  - **Heavy Attack** (`heavy`, combo-scaled): `heavyAttackDamage` IPS-distributed;
 *    burst rate `1/windUp`; `heavyMultiplier = heavyAttackDamage / normalTotal`.
 *  - **Slam Attack** (`slam`): direct (`slamAttack`, IPS) + radial (from the
 *    `attacks[]` Slam entry, falloff) with a forced **Lifted** proc.
 *  - **Heavy Slam Attack** (`slam`, combo-scaled): direct (`heavySlamAttack`, IPS)
 *    + radial (`attacks[]` Heavy Slam entry) with forced Lifted.
 */
function buildMeleeFireModes(w) {
  const attacks = (w.attacks ?? []).filter((a) => !/incarnon/i.test(a.name ?? ''));
  const normalA = attacks.find((a) => /normal/i.test(a.name ?? '')) ?? attacks[0] ?? {};
  const slamA = attacks.find(
    (a) => /slam/i.test(a.name ?? '') && !/heavy/i.test(a.name ?? ''),
  );
  const heavySlamA = attacks.find((a) => /heavy\s*slam/i.test(a.name ?? ''));

  const normalDmg = Object.keys(normalA.damage ?? {}).length
    ? cleanDamage(normalA.damage)
    : topLevelDamage(w);
  const normalTotal = sumValues(normalDmg);
  const cc = normalA.crit_chance != null ? normalA.crit_chance / 100 : (w.criticalChance ?? 0);
  const cm = normalA.crit_mult ?? w.criticalMultiplier ?? 1;
  const sc = normalA.status_chance != null ? normalA.status_chance / 100 : (w.procChance ?? 0);
  const speed = w.fireRate || normalA.speed || 1;
  const windUp = w.windUp ?? 0;
  const heavyRate = windUp > 0 ? Number((1 / windUp).toFixed(5)) : speed;

  const modes = [];

  // Normal Attack.
  modes.push({
    name: 'Normal Attack',
    trigger: 'melee',
    criticalChance: cc,
    criticalMultiplier: cm,
    statusChance: sc,
    fireRate: speed,
    baseMultishot: 1,
    components: [meleeComponent('Normal', 'normal', normalDmg)],
  });

  // Heavy Attack.
  const heavyTotal = w.heavyAttackDamage ?? 0;
  if (heavyTotal > 0) {
    modes.push({
      name: 'Heavy Attack',
      trigger: 'heavy',
      comboScaled: true,
      criticalChance: cc,
      criticalMultiplier: cm,
      statusChance: sc,
      fireRate: heavyRate,
      baseMultishot: 1,
      windUp,
      heavyMultiplier: normalTotal > 0 ? Number((heavyTotal / normalTotal).toFixed(5)) : 1,
      comboCost: 1,
      heavyEfficiency: 0,
      components: [meleeComponent('Heavy', 'normal', distribute(heavyTotal, normalDmg))],
    });
  }

  // Slam Attack (direct + radial + forced Lifted).
  if ((w.slamAttack ?? 0) > 0 || (w.slamRadialDamage ?? 0) > 0) {
    const comps = [];
    if ((w.slamAttack ?? 0) > 0)
      comps.push(meleeComponent('Slam', 'direct', distribute(w.slamAttack, normalDmg)));
    if ((w.slamRadialDamage ?? 0) > 0) {
      const radialDmg =
        slamA && Object.keys(slamA.damage ?? {}).length
          ? cleanDamage(slamA.damage)
          : { impact: w.slamRadialDamage };
      const fo =
        slamA && slamA.falloff
          ? convertFalloff(slamA.falloff)
          : { start: 0, end: w.slamRadius ?? 8, maxReduction: 0.5 };
      comps.push(meleeComponent('Slam Radial', 'radial', radialDmg, { falloff: fo, forcedProcs: ['lifted'] }));
    }
    modes.push({
      name: 'Slam Attack',
      trigger: 'slam',
      criticalChance: cc,
      criticalMultiplier: cm,
      statusChance: slamA?.status_chance != null ? slamA.status_chance / 100 : sc,
      fireRate: speed,
      baseMultishot: 1,
      components: comps,
    });
  }

  // Heavy Slam Attack (direct + radial + forced Lifted; combo-scaled).
  if ((w.heavySlamAttack ?? 0) > 0 || (w.heavySlamRadialDamage ?? 0) > 0) {
    const comps = [];
    if ((w.heavySlamAttack ?? 0) > 0)
      comps.push(meleeComponent('Heavy Slam', 'direct', distribute(w.heavySlamAttack, normalDmg)));
    if ((w.heavySlamRadialDamage ?? 0) > 0) {
      const radialDmg =
        heavySlamA && Object.keys(heavySlamA.damage ?? {}).length
          ? cleanDamage(heavySlamA.damage)
          : { blast: w.heavySlamRadialDamage };
      const fo =
        heavySlamA && heavySlamA.falloff
          ? convertFalloff(heavySlamA.falloff)
          : { start: 0, end: w.heavySlamRadius ?? 9, maxReduction: 0.3 };
      comps.push(
        meleeComponent('Heavy Slam Radial', 'radial', radialDmg, { falloff: fo, forcedProcs: ['lifted'] }),
      );
    }
    modes.push({
      name: 'Heavy Slam Attack',
      trigger: 'slam',
      comboScaled: true,
      criticalChance: cc,
      criticalMultiplier: cm,
      statusChance: heavySlamA?.status_chance != null ? heavySlamA.status_chance / 100 : sc,
      fireRate: heavyRate,
      baseMultishot: 1,
      components: comps,
    });
  }

  return modes;
}

function normalizeMelee(w) {
  const fireModes = buildMeleeFireModes(w);
  const primary = fireModes[0];
  const head = primary.components[0];
  return {
    id: slugify(w.name),
    uniqueName: w.uniqueName,
    name: w.name,
    category: 'Melee',
    weaponClass: meleeWeaponClass(w),
    trigger: 'Melee',
    damage: head.damage,
    totalBaseDamage: Number((w.totalDamage ?? sumValues(head.damage)).toFixed(5)),
    criticalChance: primary.criticalChance,
    criticalMultiplier: primary.criticalMultiplier,
    statusChance: primary.statusChance,
    fireRate: primary.fireRate,
    magazine: 0,
    reload: 0,
    multishot: 1,
    masteryReq: w.masteryReq ?? 0,
    disposition: w.omegaAttenuation ?? w.disposition ?? 0,
    exilusPolarity: w.exilusPolarity ?? null,
    polarities: w.polarities ?? [],
    range: w.range ?? 0,
    followThrough: w.followThrough ?? 1,
    comboDuration: w.comboDuration ?? 5,
    stancePolarity: w.stancePolarity ?? null,
    fireModes,
  };
}

/** Whether a raw record is a real, moddable melee weapon we can map. */
function isUsableMelee(w) {
  if (w.category !== 'Melee') return false;
  if ((w.productCategory ?? 'Melee') !== 'Melee') return false; // excludes arch-melee
  if (!w.name || !w.uniqueName) return false;
  if (/incarnon/i.test(w.name)) return false;
  if ((w.totalDamage ?? 0) <= 0) return false;
  return Array.isArray(w.attacks) && w.attacks.length > 0;
}

function normalizeWeapon(w) {
  const fireModes = buildFireModes(w);
  const primary = fireModes[0];
  const head = primary.components[0];
  return {
    id: slugify(w.name),
    uniqueName: w.uniqueName,
    name: w.name,
    category: w.category,
    weaponClass: weaponClassOf(w),
    trigger: w.trigger ?? 'Auto',
    damage: head.damage,
    totalBaseDamage: Number((w.totalDamage ?? sumValues(head.damage)).toFixed(5)),
    criticalChance: primary.criticalChance,
    criticalMultiplier: primary.criticalMultiplier,
    statusChance: primary.statusChance,
    fireRate: primary.fireRate,
    magazine: w.magazineSize ?? 0,
    reload: w.reloadTime ?? 0,
    multishot: w.multishot ?? 1,
    masteryReq: w.masteryReq ?? 0,
    disposition: w.disposition ?? 0,
    exilusPolarity: w.exilusPolarity ?? null,
    polarities: w.polarities ?? [],
    fireModes,
  };
}

// ── Warframe mapping (Stage 4) ───────────────────────────────────────────────

/**
 * Normalize a `@wfcd` Warframe record into curated `WarframeData`: base stats,
 * the ability roster (names/descriptions only — numeric scaling comes from the
 * offline ability scraper, ADR 0001), and slot polarities. `@wfcd` does not
 * populate `auraPolarity`/`exilusPolarity` for every frame, so they default to
 * `null` (→ `none` in the engine) when absent (Plan: verify per frame).
 */
function normalizeWarframe(w) {
  return {
    id: slugify(w.name),
    uniqueName: w.uniqueName,
    name: w.name,
    health: w.health ?? 0,
    shield: w.shield ?? 0,
    armor: w.armor ?? 0,
    energy: w.power ?? 0,
    sprintSpeed: w.sprintSpeed ?? 1,
    masteryReq: w.masteryReq ?? 0,
    passiveDescription: (w.passiveDescription ?? '').trim(),
    abilities: (w.abilities ?? []).map((a) => ({
      id: slugify(a.name),
      name: a.name,
      description: (a.description ?? '').trim(),
    })),
    auraPolarity: w.auraPolarity ?? null,
    exilusPolarity: w.exilusPolarity ?? null,
    polarities: w.polarities ?? [],
  };
}

/** Whether a raw record is a real, moddable Warframe we can map. */
function isUsableWarframe(w) {
  if (w.productCategory !== 'Suits') return false; // excludes archwing/necramech etc.
  if (!w.name || !w.uniqueName) return false;
  if ((w.health ?? 0) <= 0) return false;
  return true;
}

function normalizeMod(m) {
  return {
    id: slugify(m.name),
    uniqueName: m.uniqueName,
    name: m.name,
    polarity: m.polarity ?? 'none',
    baseDrain: m.baseDrain ?? 0,
    maxRank: m.fusionLimit ?? 0,
    rarity: m.rarity ?? 'Common',
    compat: m.compatName ?? '',
    description: (m.description ?? '').trim(),
    rawMaxStats: maxRankStats(m),
  };
}

function normalizeArcane(a) {
  const ls = a.levelStats ?? [];
  return {
    id: slugify(a.name),
    uniqueName: a.uniqueName,
    name: a.name,
    rarity: a.rarity ?? 'Rare',
    maxRank: a.fusionLimit ?? (ls.length ? ls.length - 1 : 0),
    description: (a.description ?? '').trim(),
    rawMaxStats: maxRankStats(a),
  };
}

/** Whether a raw record is a real, moddable gun we can map. */
function isUsableGun(w) {
  if (w.category !== 'Primary' && w.category !== 'Secondary') return false;
  if (!w.name || !w.uniqueName) return false;
  if ((w.totalDamage ?? 0) <= 0) return false;
  const hasAttacks = Array.isArray(w.attacks) && w.attacks.length > 0;
  const hasPerShot = Array.isArray(w.damagePerShot) && w.damagePerShot.some((v) => v > 0);
  const hasDamageMap = w.damage && Object.keys(cleanDamage(w.damage)).length > 0;
  return hasAttacks || hasPerShot || hasDamageMap;
}

/**
 * Rank for picking among multiple records sharing a name/slug. Some weapons have
 * an enemy/clone variant alongside the real player weapon (e.g. the Doppelganger
 * Grimoire — physical-damage placeholder, no `attacks[]`, not wiki-listed —
 * shares the "Grimoire" name with the real pure-Electricity player weapon). The
 * real weapon carries the per-attack damage maps the pipeline maps from and is
 * flagged `wikiAvailable`; prefer it generically rather than special-casing the
 * name. Higher score wins; `totalDamage` breaks ties.
 */
function gunQuality(w) {
  let score = 0;
  if (Array.isArray(w.attacks) && w.attacks.length > 0) score += 4;
  if (w.wikiAvailable === true) score += 2;
  return score;
}

function main() {
  const primary = loadCategory('Primary');
  const secondary = loadCategory('Secondary');
  const melee = loadCategory('Melee');
  const warframes = loadCategory('Warframes');
  const mods = loadCategory('Mods');
  const arcanes = loadCategory('Arcanes');

  // ── Weapons: every usable Primary + Secondary gun, mapped generically. ──
  // Pick the best record per slug FIRST (a name can map to both the real player
  // weapon and an enemy/clone variant — see `gunQuality`), then normalize.
  const best = new Map();
  for (const w of [...primary, ...secondary]) {
    if (!isUsableGun(w)) continue;
    const id = slugify(w.name);
    const prev = best.get(id);
    if (
      !prev ||
      gunQuality(w) > gunQuality(prev) ||
      (gunQuality(w) === gunQuality(prev) && (w.totalDamage ?? 0) > (prev.totalDamage ?? 0))
    ) {
      best.set(id, w);
    }
  }
  const weaponsOut = [];
  let skipped = 0;
  for (const w of best.values()) {
    try {
      weaponsOut.push(normalizeWeapon(w));
    } catch (e) {
      skipped++;
      console.warn(`build-data: skipped ${w.name}: ${e.message}`);
    }
  }

  // ── Melee: every usable melee weapon, mapped generically. ──
  const meleeBest = new Map();
  for (const w of melee) {
    if (!isUsableMelee(w)) continue;
    const id = slugify(w.name);
    const prev = meleeBest.get(id);
    if (!prev || (w.totalDamage ?? 0) > (prev.totalDamage ?? 0)) meleeBest.set(id, w);
  }
  let meleeCount = 0;
  for (const w of meleeBest.values()) {
    try {
      weaponsOut.push(normalizeMelee(w));
      meleeCount++;
    } catch (e) {
      skipped++;
      console.warn(`build-data: skipped ${w.name}: ${e.message}`);
    }
  }
  // Stable order: default weapon first, then by name.
  weaponsOut.sort((a, b) => {
    if (a.name === DEFAULT_WEAPON) return -1;
    if (b.name === DEFAULT_WEAPON) return 1;
    return a.name.localeCompare(b.name);
  });

  // ── Warframes: every usable frame, mapped generically (reference frame first). ──
  const frameBest = new Map();
  for (const w of warframes) {
    if (!isUsableWarframe(w)) continue;
    const id = slugify(w.name);
    const prev = frameBest.get(id);
    if (!prev || (w.health ?? 0) > (prev.health ?? 0)) frameBest.set(id, w);
  }
  const warframesOut = [];
  for (const w of frameBest.values()) {
    try {
      warframesOut.push(normalizeWarframe(w));
    } catch (e) {
      skipped++;
      console.warn(`build-data: skipped frame ${w.name}: ${e.message}`);
    }
  }
  warframesOut.sort((a, b) => {
    if (a.name === DEFAULT_WARFRAME) return -1;
    if (b.name === DEFAULT_WARFRAME) return 1;
    return a.name.localeCompare(b.name);
  });
  if (!warframesOut.some((w) => w.name === DEFAULT_WARFRAME)) {
    throw new Error(`Reference Warframe failed to map: ${DEFAULT_WARFRAME}`);
  }

  const modsOut = MOD_UNIQUE_NAMES.map((u) => {
    const m = mods.find((x) => x.uniqueName === u);
    if (!m) throw new Error(`Curated mod not found in @wfcd (uniqueName): ${u}`);
    return normalizeMod(m);
  });

  const arcanesOut = ARCANES.map((name) => {
    const a = arcanes.find((x) => x.name === name);
    if (!a) throw new Error(`Curated arcane not found in @wfcd: ${name}`);
    return normalizeArcane(a);
  });

  // Sanity: every reference weapon must have mapped.
  const REFERENCES = [
    'Vulkar Wraith', 'Lex Prime', 'Soma Prime', 'Hind', 'Lanka',
    'Glaxion Vandal', 'Vaykor Hek', 'Tonkor', 'Stradavar Prime',
    'Kronen Prime', 'Gram Prime',
  ];
  for (const name of REFERENCES) {
    if (!weaponsOut.some((w) => w.name === name)) {
      throw new Error(`Reference weapon failed to map: ${name}`);
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const write = (file, data) =>
    writeFileSync(join(OUT_DIR, file), JSON.stringify(data, null, 2) + '\n');

  write('weapons.json', weaponsOut);
  write('warframes.json', warframesOut);
  write('mods.json', modsOut);
  write('arcanes.json', arcanesOut);

  console.log(
    `build-data: wrote ${weaponsOut.length} weapon(s) (${meleeCount} melee, ${skipped} skipped), ` +
      `${warframesOut.length} warframe(s), ` +
      `${modsOut.length} mod(s), ${arcanesOut.length} arcane(s) to src/data/generated/`,
  );
}

main();
