# CLI Deferred Consistency Warts

## Status: NOT STARTED

Three CLI consistency warts surfaced during an inconsistency sweep of `fob lines`, `fob processes`, `fob stations`. They are not user-facing bugs (commands work; tests would pass) but each represents a smell that could turn into a real bug later, especially around dependency representation.

Deferred from the same sweep that produced commits `8895c8d` (topo-sort unification) and the follow-up bug-fix commit covering: JSON ordering in `lines show`, the `collectIdsForBin` regex, and the hardcoded `fob stations` hint in `processes show`.

---

## Problem Statement

### Wart 1 — Dependency representation round-trips lossily through pull/push

`fob processes pull` strips dependency objects to `short_code` strings before writing to local JSON (`src/cli/processes/pull.js:50`). `fob processes push` then re-converts those strings back to ids when sending to the orchestrator (`src/cli/processes/push.js:52`).

- If a dependency was originally id-only (a station with no `short_code`), pull may write a fallback string that push then fails to resolve.
- The on-disk format diverges from the orchestrator's wire format — devs editing `.orchestrator/stations/*.json` see one shape; the server sees another.
- Need to read both files end-to-end to confirm the failure mode is real vs theoretical.

### Wart 2 — `m.data.short_code || m.data.id` inlined everywhere

`src/utils/line-state.js` already exports `codeOf(s)` for this purpose. Inline copies exist in at least:
- `src/cli/lines/show.js:35`
- `src/cli/processes/show.js:26` (uses the same pattern on `d.short_code || d.id` for deps)
- Probably more — grep `short_code || .*id` to enumerate.

Risk: if the accessor ever needs to change (e.g. prefer `id` over `short_code` for a specific case, or add a fallback), every inline copy must be updated independently.

### Wart 3 — Dependency string-vs-object normalization is duplicated

The canonical form for a dependency reference is:

```js
typeof d === 'string' ? d : d.short_code || d.id
```

This lives in `src/utils/line-state.js` (inside `topoSortStations` and `computeTerminal`). It is duplicated in:
- `src/cli/lines/show.js:38` — DEPENDS ON column renderer
- `src/cli/processes/show.js:26` — Dependencies field renderer (this one only handles the object case; would crash on a string dep)

Same risk as Wart 2, with the added concern that `processes/show.js` is incomplete and could blow up if the orchestrator ever returns a bare-string dep.

---

## Proposed Solution

### Phase 1: Audit pull/push dependency handling ❌
- [ ] Read `src/cli/processes/pull.js` end-to-end; document the exact transform applied to `dependencies`.
- [ ] Read `src/cli/processes/push.js` end-to-end; document the reverse transform.
- [ ] Construct a round-trip test: a station with id-only deps, no short_code; pull → push; assert orchestrator state unchanged.
- [ ] If broken: store deps locally in a form that round-trips losslessly (likely keep the original object shape).

### Phase 2: Extract `depRef(d)` helper ❌
- [ ] Add `export function depRef(d)` to `src/utils/line-state.js` (or a new `src/utils/station-defs.js`).
- [ ] Replace inline normalizations in:
  - [ ] `src/cli/lines/show.js:38`
  - [ ] `src/cli/processes/show.js:26`
  - [ ] `src/utils/line-state.js` (topoSortStations, computeTerminal)
- [ ] Search for any other consumers.

### Phase 3: Replace inline `codeOf` ❌
- [ ] Replace `m.data.short_code || m.data.id` with `codeOf(m)` in:
  - [ ] `src/cli/lines/show.js:35`
  - [ ] Any other matches from `grep "short_code || .*id"`.

---

## Related Files

- `src/utils/line-state.js` — Home of `codeOf`, future home of `depRef`.
- `src/cli/processes/pull.js` — Lossy half of the dep round-trip.
- `src/cli/processes/push.js` — Other half of the dep round-trip.
- `src/cli/lines/show.js` — Inline `codeOf` + inline dep normalization.
- `src/cli/processes/show.js` — Incomplete dep normalization (object-only).
