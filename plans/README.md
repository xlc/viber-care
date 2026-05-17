# Plans

Status: revalidated on 2026-05-17. No active implementation tasks remain in
`plans/`.

## Completed And Removed

The toddler story/card refactor plan, milestone plans, validation report, and
Mimi authoring notes were completed against the current implementation and
removed from active planning.

## Revalidation

- Active story content imports committed `content/story-packs/*.json` through
  `src/content/catalog.ts`.
- Legacy object-pack content remains archived under
  `content/legacy-word-garden-v2/` and is not imported by the runtime catalog.
- The app runtime uses separate Home, Story Mode, Card Mode, and Parent
  Settings components.
- `mimi-rides-the-bus` is the active story pack with six scenes, ten learnable
  items, committed images, and committed MP3 audio.
- The repo-local content-generation skill now documents story-pack authoring
  and includes the story asset audit helper.
- Release layout E2E coverage checks iPhone and iPad portrait and landscape
  viewports.

## Latest Checks

- `bun .agents/skills/content-generation/scripts/validate-story-assets.ts`:
  passed for 1 pack and 49 referenced assets.
- `bun run test`: passed, 17 tests.
- `bun run test:e2e`: passed, 24 tests.
- `bun run build`: passed.

## Remaining Tasks

No active implementation tasks remain. Production deploy was not run during this
planning cleanup; run `bun run deploy` only when a production release is
requested.
