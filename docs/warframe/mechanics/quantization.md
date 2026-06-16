# Warframe Damage Quantization Algorithm

**Source:** https://wiki.warframe.com/w/Damage/Calculation

---

## The Exact Quantization Formula

> "Rather than the damage being applied smoothly, physical and elemental damages round to the nearest multiple of 1/32nd of their attack's base damage, before being multiplied further."

**Mathematical formula:**
```
Quantized Damage Type Value = Round(Total Damage Type Value ÷ Scale) × Scale

Where: Scale = Unmodded Base Damage ÷ 32
```

**Key points:**
- The **Scale** is derived from the weapon's **unmodded total base damage** (physical components only, before any elemental mods are applied).
- Each damage type (Impact, Puncture, Slash, and each elemental) is **independently** rounded to the nearest multiple of the Scale.
- This quantization step occurs **after** elemental and physical mods are factored in, but **before** critical multipliers or other post-base damage modifications.
- Quantization changed from 1/16 to 1/32 in Update 40.0 (2025-10-15).

---

## Worked Example from Wiki

**Weapon:** Base 30 Impact, 30 Puncture, 40 Slash (total = 100)

1. Scale = 100 ÷ 32 = **3.125**
2. Impact: Round(30 ÷ 3.125) × 3.125 = Round(9.6) × 3.125 = 10 × 3.125 = **31.25**
3. Puncture: Round(30 ÷ 3.125) × 3.125 = Round(9.6) × 3.125 = 10 × 3.125 = **31.25**
4. Slash: Round(40 ÷ 3.125) × 3.125 = Round(12.8) × 3.125 = 13 × 3.125 = **40.625**
5. **Final total (unarmored): 31.25 + 31.25 + 40.625 = 103.125** (displays as 103)

---

## Computed Example: Vulkar Wraith with Stormbringer

**Weapon:** Vulkar Wraith unmodded base: Impact 245.7, Puncture 27.3, Slash 0 (total = 273)

**Mods:** Stormbringer +90% Electricity only

**Setup:**
- Unquantized total: 245.7 (Impact) + 27.3 (Puncture) + 245.7 (Electricity from 0.90 × 273)
- Unquantized continuous total: **518.7 damage**

**Quantization step:**
- Scale = 273 ÷ 32 = **8.53125**

**Per-type quantized values:**
- Impact: Round(245.7 ÷ 8.53125) × 8.53125 = Round(28.8) × 8.53125 = 29 × 8.53125 = **247.40625**
- Puncture: Round(27.3 ÷ 8.53125) × 8.53125 = Round(3.20) × 8.53125 = 3 × 8.53125 = **25.59375**
- Electricity: Round(245.7 ÷ 8.53125) × 8.53125 = Round(28.8) × 8.53125 = 29 × 8.53125 = **247.40625**

**Quantized total:** 247.40625 + 25.59375 + 247.40625 = **520.40625**

**In-game display (rounded to nearest integer):** **520** ✓

This matches the wiki's stated in-game displayed value exactly. The quantization rule is **Scale = Unmodded Total Base ÷ 32**, applied per damage type after elemental mods are factored in.
