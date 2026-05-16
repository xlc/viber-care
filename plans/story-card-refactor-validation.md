# Story Card Refactor Plan Validation

## Status

Validated during the planning pass. Implementation has now started, so the
"repo facts checked" section below records the pre-refactor baseline rather than
the current source of truth.

## Validation Summary

The refactor plan is internally consistent with the user's requested product direction and the static runtime boundary, but it intentionally conflicts with parts of the current repository guidance and implementation. Those conflicts are acceptable only because the user requested a major breaking refactor. The plan now makes those breakpoints explicit.

Resolved decisions:

- Milestone 1 remains a single large breaking milestone.
- The story-pack contract starts in TypeScript schema, not a generic JSON fixture.
- Active story packs live under `content/story-packs/`.
- Old generated assets move into `content/legacy-word-garden-v2/assets/` unless selected assets are copied back into an active story pack.
- Card Mode uses one-card paging for the first implementation.
- Home, Story Mode, Card Mode, and Parent Settings must be separate components.
- The content-generation skill rewrite happens after the first story pack reveals concrete workflow needs.

## Pre-Refactor Repo Facts Checked

- `package.json` uses Bun scripts for test, E2E, build, deploy, and dev.
- `src/content/catalog.ts` imported `content/items/*.json` and `content/packs/*.json`.
- `src/content/schema.ts` modeled reusable object concepts, L0-L5 levels, pack sets, scene regions, and placements.
- `src/state/settings.ts` persisted Explore, Find, Cards, Math Play, language-order presets, active level, selected pack, selected set, math focus, and muted state.
- `src/app.tsx` owned a large combined app surface for the old modes.
- `.agents/skills/content-generation/SKILL.md` described object-pack generation, L0-L5 content, find/success audio, and global item files.
- `.agents/skills/content-generation/scripts/generate-openrouter-audio.ts` used OpenRouter audio with `openai/gpt-4o-mini-tts-2025-12-15`, voice `nova`, MP3 output, speed `0.9`, and `OPENROUTER_API_KEY`.

## Static Runtime Validation

The plan preserves:

- No backend.
- No Cloudflare Functions.
- No runtime AI calls.
- No remote content loading.
- No client secrets.
- No client-exposed AI API key environment variables.
- `localStorage` only for settings.
- Committed source content and committed static assets.

Validation result: pass.

## Content Architecture Validation

The plan intentionally replaces the current object-pack architecture with a story-pack architecture.

Required implementation changes:

- Update `AGENTS.md` so it no longer says reusable item content must live in active `content/items/*.json` files for the runtime.
- Update `.agents/skills/content-generation/SKILL.md` so it no longer requires L0-L5 item content or find/success prompt audio.
- Update `src/content/catalog.ts` so legacy archived content is not imported.
- Keep old source JSON and candidate assets in a legacy archive for manual reuse.
- Move non-reused legacy assets out of `public/` so Vite does not ship them.

Validation result: pass. The implementation updates `AGENTS.md`, `src/content/catalog.ts`, and the repo-local content-generation skill to the active story-pack shape.

## Product Scope Validation

The plan preserves the requested modes:

- Story Mode.
- Card Mode.

The plan removes unneeded legacy modes:

- Explore.
- Find.
- Puzzle.
- Math Play.

The plan preserves bilingual behavior:

- Story Mode has one main language at a time.
- Card Mode always displays and plays English and Chinese.

Validation result: pass.

## Milestone Dependency Validation

Milestone order is valid:

1. Static shell and story schema.
2. Story Mode runtime.
3. Card Mode runtime.
4. First complete story pack.
5. Story-pack authoring workflow.
6. Polish, QA, and release.

Reasoning:

- Milestone 1 must land before Story/Card behavior because the old settings/content model is incompatible.
- Milestone 2 and 3 can be implemented after the shell; they touch related UI but have separable helper/test surfaces.
- Milestone 5 can create the first pack with the current authoring skill plus direct edits, while capturing concrete workflow gaps.
- Milestone 4 then updates the content-generation skill using the first pack's real workflow instead of speculative instructions.
- Milestone 6 depends on one complete pack to QA.

Validation result: pass.

## Risk Register

### Risk 1: AGENTS.md Contradiction

Pre-refactor `AGENTS.md` documented the old content architecture. If not updated, future agents may reintroduce old object-pack assumptions.

Mitigation:

- Milestone 1 updates `AGENTS.md` for runtime content shape.
- Milestone 4 updates authoring workflow details.

### Risk 2: Public Asset Bloat

Old generated assets under `public/` would still be copied into `dist` even if no story pack references them.

Mitigation:

- Move non-reused legacy assets out of `public/`.
- Copy only selected reused assets into the new story pack asset directory.
- Milestone 6 checks `dist` for stale legacy asset directories.

### Risk 3: App Rewrite Blast Radius

`src/app.tsx` currently owns much of the old behavior, so replacing modes may create a large patch.

Mitigation:

- Add small `src/story/*` helpers first.
- Keep shell, Story Mode, and Card Mode tests focused.
- Delete obsolete mode code rather than trying to adapt it.

### Risk 4: Audio Helper Rewrite

The removed OpenRouter helper wrote back to global item files and L0-L5 fields.

Mitigation:

- Keep model, voice, key handling, concurrency, and audit concepts.
- Replace only the entry discovery and JSON writeback shape.
- Add audit coverage for story narration and item word audio.

### Risk 5: Reused Asset Style Mismatch

Old assets may not match the new Mimi story style.

Mitigation:

- Treat reuse as optional.
- Copy reused assets into the new story pack only after visual review.
- Generate replacements when consistency is questionable.

## Validation Questions For The User

None currently blocking implementation.
