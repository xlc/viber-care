# Milestone 1: Static Story App Shell

## Goal

Create the new static app foundation with a story-pack home screen, language selection, Story Mode entry, Card Mode entry, reduced settings, and no legacy mode compatibility.

## Scope

- Replace the old mode model with `story` and `cards`.
- Replace old settings with selected pack, main language, mute state, and optional last mode/scene.
- Add a story-pack catalog schema and validation path.
- Add a temporary seed story pack with enough static placeholder assets to exercise the app shell only.
- Remove UI access to Explore, Find, Puzzle, Math Play, level controls, language-order presets, and set switching.
- Move existing vocabulary pack/item JSON out of the active catalog so it can be reused manually without runtime compatibility.
- Move non-reused legacy generated assets out of `public/` so the static build ships only active story assets.
- Update repository guidance that still describes the old object-pack/L0-L5 architecture.
- Keep this as one breaking milestone rather than splitting preflight work into a separate milestone.
- Define the new content contract in TypeScript schema first; do not require a generic JSON fixture before implementation.
- Split the new UI into dedicated Home, Story Mode, Card Mode, and Parent Settings components.

## Out Of Scope

- Final story interactions.
- Final generated image assets.
- Final OpenRouter audio generation.
- Full Mimi story content.
- Content-generation skill rewrite beyond the guidance needed to keep repo docs consistent.
- Generic `example-story` JSON fixture.

## Breaking Changes

- Existing localStorage settings may be discarded by changing the storage key.
- Existing pack and item JSON should be moved outside the active catalog, not migrated in place.
- Existing generated assets should be moved outside `public/` unless they are intentionally reused by the seed story pack.
- Existing mode tests should be deleted or rewritten rather than preserved.

## Implementation Surface

Update:

- `src/content/schema.ts`
- `src/content/catalog.ts`
- `src/content/validation.ts`
- `src/state/settings.ts`
- `src/app.tsx`
- `src/styles.css`
- `AGENTS.md`
- `tests/unit/settings.test.ts`
- `tests/unit/catalog.test.ts`
- `tests/e2e/word-garden.spec.ts`

Add:

- `src/components/HomeScreen.tsx`
- `src/components/StoryMode.tsx`
- `src/components/CardMode.tsx`
- `src/components/ParentSettings.tsx`
- `src/story/pack-selection.ts`
- `content/legacy-word-garden-v2/`, or a similarly named committed legacy source directory outside the active import glob.
- `content/story-packs/`.
- `public/assets/generated/story-seed/`, only for minimal shell assets.
- `tests/unit/story-content-schema.test.ts`

Remove:

- Legacy mode-specific tests that no longer represent product behavior.
- Active imports from `content/items/*.json` and old object-pack `content/packs/*.json`.
- Old public asset references from runtime content.

## Detailed Work Breakdown

### 1. Create Final Active Content Directory

Chosen directory:

- `content/story-packs/*.json` for active story pack source.
- `content/legacy-word-garden-v2/` for old source and reusable old assets.

Validation requirement:

- `src/content/catalog.ts` must import only active story pack files.
- No active runtime import should glob `content/legacy-word-garden-v2/**`.
- Active story packs must not live in the old object-pack `content/packs/` directory.

### 2. Define New Schema

Minimum schema types:

- `AssetReference`
- `LocalizedText`
- `LocalizedAudio`
- `StoryPackMetadata`
- `PlotPlan`
- `StoryScene`
- `StorySceneItem`
- `StoryItem`
- `StoryInteraction`
- `StoryPack`
- `StoryCatalog`

Schema constraints:

- English and Simplified Chinese are required.
- Each pack has at least two scenes.
- Each scene has narration audio for both languages.
- Each item has word audio for both languages.
- Each item appears in at least one declared scene.
- Each scene image and item image path starts with `/assets/`.

### 3. Replace Settings

New storage key:

- `word-garden.story-settings.v1`

Fields:

- `selectedPackId`
- `language`
- `muted`
- `lastSceneId`

Invalid legacy settings should fall back to defaults. Do not write a migration for old `mode`, `activeLevel`, `selectedSetId`, or language-order presets.

### 4. Replace App Shell

Screens:

- Home screen.
- Story Mode screen.
- Card Mode screen.
- Parent settings modal.

Required component boundaries:

- `src/app.tsx` owns top-level state, catalog loading, and screen selection.
- `HomeScreen` renders pack selection, language choice, and Story/Card entry buttons.
- `StoryMode` renders the selected scene, narration replay, item taps, and scene navigation.
- `CardMode` renders the one-card paging surface.
- `ParentSettings` renders mute and parent-only settings.

Do not keep all JSX in `src/app.tsx` while rebuilding the shell.

Navigation:

- Home to Story Mode.
- Home to Card Mode.
- Story/Card back to home.
- Language toggle visible on Home and Story Mode.

### 5. Archive Legacy Content

Move source JSON:

- `content/items/*.json` to `content/legacy-word-garden-v2/source/items/`.
- Old object-pack JSON to `content/legacy-word-garden-v2/source/packs/`.

Move non-reused assets:

- Old generated assets under `public/assets/generated/*` to `content/legacy-word-garden-v2/assets/`.
- Copy only selected seed-story assets back under `public/assets/generated/<story-id>/`.

Keep a legacy README that documents the archive is not imported by runtime code.

### 6. Rewrite Tests

Unit tests:

- Settings sanitization for the new storage shape.
- Catalog parsing for story packs.
- Validation errors for missing bilingual text/audio/assets.

E2E tests:

- Home screen loads.
- Pack selection persists.
- Story/Card buttons route correctly.
- Mute remains visible.
- No AI endpoint calls are made at runtime.
- Old mode controls do not exist.
- Home, Story Mode, Card Mode, and Parent Settings render through their dedicated surfaces.

## Tasks

1. Execute the detailed work breakdown above in order.
2. Keep each step buildable; do not wait until all old code is removed before restoring tests.
3. Prefer deleting obsolete branches/components over compatibility wrappers.
4. Keep the seed pack intentionally small so it proves the shell without pretending to be final content.

## Acceptance Criteria

- The app starts on a story-pack home screen.
- A pack can be selected.
- Main language can be toggled between English and Simplified Chinese.
- Story Mode and Card Mode can be opened from the selected pack.
- Removed legacy modes are not visible or test-addressable.
- Old vocabulary packs are not imported by the runtime catalog.
- Legacy content remains available for manual reuse.
- Runtime remains static-only.
- `AGENTS.md` no longer contradicts the new active content architecture.
- `bun run test`, `bun run test:e2e`, and `bun run build` pass.
