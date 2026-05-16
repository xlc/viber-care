# Asset Review Template

## Pack

- Pack id:
- Reviewer:
- Date:

## Image Review

| Asset | Pass | Notes |
| --- | --- | --- |
| Cover image |  |  |
| Scene images |  |  |
| Item card images |  |  |
| Tappable item clarity |  |  |

Image checks:

- Friendly, calm, and toddler-safe.
- No ads, purchases, logos, watermarks, scary imagery, unsafe behavior, or
  unwanted text.
- Scene composition is not crowded.
- Important objects are easy to see on iPhone and iPad.
- Reused legacy assets were copied into the active pack directory after review.

## Audio Review

| Asset group | Pass | Notes |
| --- | --- | --- |
| English narration |  |  |
| Chinese narration |  |  |
| English item words |  |  |
| Chinese item words |  |  |
| Interaction audio |  |  |

Audio checks:

- Warm, clear, slow, and not overly dramatic.
- English and Chinese match the story-pack text.
- Chinese pronunciation is acceptable.
- Volume is consistent across the pack.
- No placeholder silence or invalid MP3 files.

## Runtime Boundary Review

- Story pack lives under `content/story-packs/`.
- Active assets live under `public/assets/generated/<pack-id>/`.
- Runtime imports only committed active story packs.
- Legacy content is not imported by `src/content/catalog.ts`.
- No generated runtime catalog or manifest was added.
- No client-exposed AI API key or runtime AI call was added.

## Verification

- `bun .agents/skills/content-generation/scripts/validate-story-assets.ts`
- `bun run check`
- `bun run test`
- `bun run test:e2e`
- `bun run build`
