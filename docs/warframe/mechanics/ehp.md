# Effective Health (EHP) — Damage Reduction & Survivability

**Source:** Stage 4 Plan (decision 8: generic EHP aggregate); wiki Damage/Armor mechanics (to be verified)

## Armor → damage reduction formula

Armor provides a **damage reduction multiplier**:
- **Damage reduction % = `armor / (armor + 300)`**
- **Damage multiplier received = `1 / (1 + armor/300)` = `300 / (armor + 300)`**
- Example: 100 armor → `100 / (100 + 300) = 0.25 = 25% reduction`

## Health effective-health (via armor)

Armor increases the effective hitpoints of a Warframe:
- **Effective Health = `health × (1 + armor / 300)`**
- Example: 270 health + 290 armor → `270 × (1 + 290/300) = 270 × 1.9667 ≈ 531 EHP`

## Shield

Shields are a separate health pool:
- **Shield capacity** modified by Shield mods (Redirection: +100% at max rank)
- Shields regenerate after a delay when not taking damage (behavior not in Stage 4)
- **Generic EHP treatment:** shields add directly to health-EHP; total = `health EHP + shield`

## Generic total EHP (no damage type)

Combines health and armor into a single survivability number:
- **Total EHP = `health × (1 + armor / 300) + shield`**
- This is **generic** — applies equally regardless of incoming damage type
- Damage-type-specific EHP (e.g., resistance to Corrosive vs Radiation) deferred to Stage 5

## Components shown in UI

Per Stage 4 plan (decision 8):
- Armor → damage-reduction %
- Health EHP (health × (1 + armor/300))
- Shield
- Generic total (health-EHP + shield)

---

**Status:** Formula cached; numeric examples pending Rhino Prime reference build (Stage 4).
