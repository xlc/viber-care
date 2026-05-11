---
name: content-generation
description: Use when adding or refreshing Word Garden content packs, object copy, bilingual learning levels, static images, or audio assets.
---

# Word Garden Content Generation

This is an authoring workflow only. The app runtime stays static and imports
committed source content directly.

## Rules

- Do not create runtime catalog JSON files under `public/`.
- Do not add package scripts for generating content, catalogs, manifests, or
  asset reviews.
- Do not create generated JSON manifests or review JSON files.
- Do not add runtime AI calls, remote content loading, backend code, client
  secrets, or client-exposed API keys.
- Write reusable item source content as committed JSON under
  `content/items/*.json`.
- Write pack, set, scene, and placement source content as committed JSON under
  `content/packs/*.json`.
- Write static image/audio files under `public/assets/` and reference them from
  the item or pack content.
- Every production pack should have at least two scenes. Every object should
  have at least two static visual variants.
- Scene backgrounds must define percentage-based `regions`; scene spawn
  candidates must use `regionTags` so objects only appear in appropriate areas
  such as sky, water, grass, road, rail, or card fields.
- Use scene `visibleObjectCount` to show a randomized subset when a scene has
  more candidates than should be visible at once.
- Generate level audio and the functional find/success prompt audio with
  `bun .agents/skills/content-generation/scripts/generate-openrouter-audio.ts`.
  It reads `OPENROUTER_API_KEY` from `.env`, writes static MP3 files under
  `public/assets/`, and updates level and prompt audio path values on the
  referenced global item files.
- Use the `imagegen` skill for image generation. Do not substitute hand-coded
  SVGs, script-only placeholders, or deterministic drawing code when the task
  calls for generated image assets.
- Keep item content bilingual for production-quality packs: English and
  Simplified Chinese L0/L1 text, audio text, find prompt, success phrase, and
  fallback text.

## Content Pack Checklist

1. Add or edit `content/packs/<pack-id>.json`.
2. Include pack metadata, languages, sets, at least two scenes, and scene
   placements that reference global `itemId` values.
3. Define scene `regions` as background-relative percentage rectangles.
4. Add spawn candidates with `regionTags`, anchor positions, jitter, scale
   ranges, and `visibleObjectCount`.
5. Add or edit global item files under `content/items/` with two or more
   variants and static image assets. Keep variant image paths under
   `public/assets/`.
6. Make every scene spawn candidate reference an item included by at least one
   set in the pack.
7. Keep item language content in item files and placement rules in pack scenes,
   not in runtime engine code.
8. Generate or refresh static level and prompt audio:
   `bun .agents/skills/content-generation/scripts/generate-openrouter-audio.ts --generate --pack <pack-id>`.
9. Format content JSON after generation:
   `bunx biome format --write content/items content/packs/<pack-id>.json`.
10. Audit static level and prompt audio:
   `bun .agents/skills/content-generation/scripts/generate-openrouter-audio.ts --audit --pack <pack-id>`.
11. New committed item and pack JSON files are imported by `src/content/catalog.ts`.
12. Run `bun run validate:content`.
13. Run `bun run test`.
14. Run `bun run test:e2e`.
15. Run `bun run check:secrets`.
16. Run `bun run build`.

## Static Asset Guidance

- Item images should be clear at small sizes, friendly, toddler-safe, and free
  of text, logos, ads, watermarks, scary imagery, and unsafe behavior.
- Item variants should be visibly distinct through size, color, or gentle
  style differences while preserving the same object identity.
- Backgrounds should be calm, uncluttered, and should not hide placed objects.
- Region maps must match the actual background. Do not place fish outside water,
  sun outside sky, vehicles outside their travel area, or cards outside the
  intended card field.
- Audio should match the content pack text for the target language and level.
- Audio file names should use the canonical shapes
  `/assets/generated/<pack-id>/audio/<object-id>-<language>-<level>.mp3`,
  `/assets/generated/<pack-id>/audio/<object-id>-<language>-find.mp3`, and
  `/assets/generated/<pack-id>/audio/<object-id>-<language>-success.mp3`.
- For a full voice refresh, run the audio helper with `--generate --refresh`.
  Prune old audio only after the content references and `--audit` prove it is
  unreferenced.
- For a provider sanity check before bulk generation, run the audio helper with
  `--sample --pack <pack-id>`; it writes the sample to `/private/tmp/`.
- If using AI or API keys to create production assets, do that outside the app
  runtime and never commit secrets.
