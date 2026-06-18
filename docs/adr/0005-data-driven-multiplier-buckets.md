# Data-driven multiplicative buff buckets; typed additive core

## Status

accepted (Stage 5 — Combat State & Target).

## Decision

The **additive core** damage buckets (base, elemental, physical, crit chance,
crit damage, status chance, fire rate, multishot) stay a **typed `Bucket` union**
with fixed-shape `BucketSums` fields. The **conditional/multiplicative buff
buckets** stop being the hardcoded `MULTIPLIER_BUCKETS = ['faction','directDamage']`
and become a **declared `Record<string, number>` map** of named multiplier buckets
(`MultiplierBucketDef`: id, label, multiply-in order). Each `buff`-kind registry
entry names the multiplier bucket it feeds: **same id ⇒ members add within the
bucket; different id ⇒ an independent multiplier.** `gather` folds buff
contributions into the map; `conditionalMultiplierStage` multiplies the map in
declared order.

A genuinely new multiplier category (the validation case is **Eclipse**, separate
from the faction/Roar bucket) is then **a bucket declaration + a buff entry — no
engine-type change**.

## Why

Goal.md requires "new buffs addable as a registry entry only," and Warframe keeps
adding *independent multiplicative* buff categories. Under the fully-typed model,
each new category meant editing the `Bucket` union, `BucketSums`, the `gather`
switch, and the bucket metadata — not "a registry entry only." The additive core,
by contrast, is a stable, finite, well-understood set with no such churn and the
error-prone summing math we most want the compiler to guard. So the split puts the
runtime-flexibility exactly where expansion happens (the multiplier layer) and
keeps static safety where it pays (the additive core).

## Considered options

- **Keep the full fixed `Bucket` union** — rejected: a new independent multiplier
  is a rare but real typed code change across four sites, contradicting the
  "registry entry only" goal for the part of the model that actually grows.
- **Make *all* buckets data-driven** — rejected: throws away exhaustiveness on the
  additive summing math (the highest-risk, most-tested code) for no benefit, since
  the additive set doesn't expand.

## Consequences

- Exhaustiveness on the multiplier buckets becomes a runtime concern (a map), not a
  compile-time one; the pipeline iterates a declared order instead of two named
  fields.
- `BucketSums` replaces `faction`/`directDamage` with `multipliers: Record<string,
  number>`; call sites read the map.
- Buff stacking semantics are now expressed purely by **which bucket id** an entry
  declares — the single lever for "adds with X" vs "multiplies independently".
