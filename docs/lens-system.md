# Lens System

A composable fiscal transformation layer for Budget Galaxy. Lenses let
the user view public spending data through alternative denominators and
structural interpretations without modifying the underlying tree.

Built in session 2 (April 2026). First consumer: the Compare tab.
Future consumers: Budget Explorer, Galaxy view, Multiverse.

## Philosophy

- **Default is absolute.** Every session starts with zero lenses active.
  Budget Galaxy shows raw recorded values until the user explicitly
  opts into a transformation. Do not reverse this default.

- **Composable but curated.** Lenses can stack, but only within a
  compatibility matrix that we define explicitly. Free-for-all
  composition produces nonsense combinations (e.g., "per capita of
  year-on-year change" is valid math but often meaningless). We would
  rather prevent those in the UI than teach users to avoid them.

- **Pipeline order is fixed.** When multiple lenses apply, they run in
  category order: denominator → temporal → structural. The user does
  not control ordering. This makes `per_capita` + `real terms` mean
  the same thing every time and reproducible across sessions.

- **No data is a first-class state.** A lens that cannot compute for a
  given node returns `null`, and the renderer shows `—` with a tooltip
  explaining why. It does NOT fall back to the absolute value, does
  NOT substitute zero, and does NOT copy from the parent. A council
  without a population should look visibly empty under `per_capita`,
  not silently misleading.

## Categories

| Category     | Purpose                              | Composability      |
|--------------|--------------------------------------|--------------------|
| denominator  | divide value by something            | mutually exclusive |
| temporal     | transform over time                  | composable         |
| structural   | derive new metrics                   | mostly separate    |

Pipeline order when multiple lenses are active:
`denominator → temporal → structural`

## Compatibility matrix (session 2 snapshot)

Legend: ✔ implemented, ⋯ stubbed (reserved in registry, throws if used),
✕ mutually exclusive with column header.

|                      | per_capita | pct_of_root | pct_of_class | pct_of_parent | per_demand | real | yoy |
|----------------------|:----------:|:-----------:|:------------:|:-------------:|:----------:|:----:|:---:|
| per_capita ✔         | —          | ✕           | ✕            | ✕             | ✕          | ok   | ok  |
| pct_of_root ✔        | ✕          | —           | ✕            | ✕             | ✕          | ok   | ok  |
| pct_of_class ⋯       | ✕          | ✕           | —            | ✕             | ✕          | ok   | ok  |
| pct_of_parent ⋯      | ✕          | ✕           | ✕            | —             | ✕          | ok   | ok  |
| per_demand ⋯         | ✕          | ✕           | ✕            | ✕             | —          | ok   | ok  |
| real ⋯               | ok         | ok          | ok           | ok            | ok         | —    | ok  |
| yoy ⋯                | ok         | ok          | ok           | ok            | ok         | ok   | —   |
| procurement_share ⋯  | ok         | ok          | ok           | ok            | ok         | ok   | ok  |
| herfindahl ⋯         | ok         | ok          | ok           | ok            | ok         | ok   | ok  |

All five denominator lenses are mutually exclusive with each other.
The rest are composable unless explicitly listed in `incompatibleWith`.

## Implemented lenses (session 2)

### `per_capita`
Divides a node's value by its `population` field (ONS mid-2023 resident
estimates, all ages, both sexes — attached to 19 UK councils in
session 1). Returns `null` if the node has no `population` or if
population is zero or negative. Label: *"per capita"*. Category:
*denominator*. Incompatible with all other denominator lenses.

Typical result: a UK council value of ~£1,500 per resident. Kent
(1.61M population, £2.7B budget) shows approximately £1,683 per capita.

### `pct_of_root`
Divides a node's value by the country tree root value and multiplies
by 100. Returns `null` if context.root is missing or its value is
zero. Label: *"% of total budget"*. Category: *denominator*.
Incompatible with all other denominator lenses.

Key property: the root is **stable across navigation**. Whether the
user is viewing UK root, Kent, or Kent → Adult Social Care,
`context.root` always refers to the top-level UK tree. This means
`pct_of_root` always answers "what share of the country's total is
this node?", regardless of drill-down depth.

We deliberately chose `pct_of_root` over the ambiguous `pct_total`
that some tools use. "Percentage of parent" has three different
interpretations depending on context (parent node, parent class,
country total), and we preferred to scope the first implementation to
one unambiguous meaning.

## Stubbed lenses (registered, not implemented)

These exist in the registry so the UI and compatibility logic can
reference them, but their `apply()` functions throw immediately. Each
will be implemented in a future session once a real use case justifies
the work.

- **`pct_of_class`** — share of peer group (e.g., Kent as % of all
  Shire Counties). Different from `pct_of_root`, because the
  denominator depends on the council's class. Useful for benchmarking.

- **`pct_of_parent`** — share of immediate parent node. Different from
  both `pct_of_root` and `pct_of_class`. Useful when the user is
  drilling down and wants relative shares at each level.

- **`per_demand`** — divide by a demand proxy (student count for
  education, patient count for health, etc.). Requires demand data
  to be attached to nodes. Not a single denominator — each service
  has its own proxy.

- **`real`** — inflation-adjust to a reference year. Requires CPI
  series per country and a `context.targetYear` field. Category
  *temporal*.

- **`yoy`** — year-on-year change (absolute or %). Requires
  `context.previousTree` so the lens can look up the same node in the
  previous year. Category *temporal*.

- **`procurement_share`** — share of a node's spending that flows to
  external suppliers (vs internal payroll and transfers). Requires
  supplier data on the node. Category *structural*.

- **`herfindahl`** — Herfindahl-Hirschman index of supplier
  concentration. Also requires supplier data. Category *structural*.

## How to add a new lens

1. Add an entry to `window.LENS_REGISTRY` keyed by the lens id (use
   snake_case). Required fields:
   - `id` (string, matches key)
   - `label` (short user-facing name, lowercase preferred)
   - `category` (one of `denominator`, `temporal`, `structural`)
   - `incompatibleWith` (array of lens ids that conflict)
   - `apply(value, node, context)` — return the transformed value or
     `null` for "no data"
   - `isAvailable(node)` — return `true` if the lens can apply to this
     node. Used to disable the lens button in the UI when navigating
     to nodes where it is inapplicable.

2. If your lens needs data that doesn't exist on nodes yet, first
   write a `scripts/inject_*.js` script that attaches the data to the
   tree. Follow the pattern from `inject_population.js`: idempotent,
   with a `_<something>_meta` block at tree root for provenance.

3. If your lens needs a new field in `context`, add it to the shape
   returned by `makeLensContext()`. Reserve the field with `null` for
   lenses that don't use it — every caller will then populate only
   what it needs, and future lenses can use the pre-reserved field
   without a breaking change.

4. Update the compatibility matrix in this document.

5. Test manually in browser console on a few known nodes before
   committing:
   ```js
   toggleLens('your_new_lens');
   applyLenses(node.value, node, makeLensContext(rootNode));
   ```

## Compare tab consumption pattern

The Compare tab is the first consumer of the lens system. It
demonstrates the intended integration pattern:

1. Call `makeLensContext(root)` at the top of each render to get a
   fresh context object with reserved fields present but null.
2. Pass the context to `applyLenses(value, node, context)` for every
   value you want to render.
3. Check the result: if `value === null` or `formatHint === 'no_data'`,
   render `—` with a tooltip explaining why. Otherwise render the
   transformed value using `fmtLensValue(result, currency)`.
4. Set `window._onLensStateChange` to a re-render function so the
   view updates when the user toggles a lens.

The Compare tab deliberately uses its own formatter (`fmtLensValue`)
rather than modifying existing formatters (`fmtEur`, `mvFmtVal`,
`fmtAmount`). This keeps the lens system isolated to Compare tab for
now. Future sessions will migrate other views one at a time, each
review-gated to prevent regressions.

## Active lens state

`window.activeLenses` is a `Set` of lens ids. Starts empty. Modified
only via `toggleLens(lensId)`. Not persisted in localStorage —
deliberately reset on page load for phase 1. Once we have usage data
from the hit tracker showing which combinations are actually used,
we can decide whether to persist them in the URL (shareable view) or
in localStorage (user preference).

## Replace-on-conflict behavior

When the user activates a lens that is incompatible with one or more
currently active lenses, the new lens **replaces** the conflicting
ones rather than being blocked. This is a UX choice — blocking the
new lens would require the user to manually deactivate the old one
first (two clicks), while replacement is a single click.

However, the replacement is **not silent**. Whenever it happens,
a transient notice appears in the `.lens-conflict-notice` container:
*"per capita replaced % of total budget (mutually exclusive)"*.
The notice auto-dismisses after 3 seconds. The user learns the
compatibility rule by observing it rather than reading documentation.

## Known rough edges

- Lens panel only shows implemented lenses (not stubs). Stubs exist in
  the registry for future use but are filtered out at render time.
  When a stub is implemented, it should automatically appear.

- The `per_capita` lens is available on all nodes that have a
  `population` field, regardless of whether per capita is meaningful
  for that node. For a service-level node like "Kent CC → Adult Social
  Care" the population field is currently inherited only at the
  council level, so drilling down into a service child will fall back
  to the "no data" state. This is arguably the correct behavior
  (services don't have their own population), but future polish could
  use the parent council's population with a clear indicator.

- The Compare tab renders only the top 10 children of any node. This
  is fine for most cases but hides long tails (e.g., when looking at
  central government with 60 departments). A "show all" toggle is a
  future polish item.

- There is currently no "export comparison" feature. Future work.

## Scope note

This is phase 1 of the lens system. The architecture is deliberately
over-engineered relative to what per_capita and pct_of_root strictly
need, because the scaffolding for future lenses is cheaper now than
retrofitting later. If the system is never extended with more lenses,
we will have spent ~200 lines of JavaScript on a minor gain. If it
*is* extended, each new lens will be ~30 lines in the registry plus
a compatibility matrix update.
