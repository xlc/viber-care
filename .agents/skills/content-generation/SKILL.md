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
- Write source content as committed JSON under `content/packs/*.json`.
- Write static image/audio files under `public/assets/` and reference them from
  the content pack.
- Generate level audio with
  `bun .agents/skills/content-generation/scripts/generate-openrouter-audio.ts`.
  It reads `OPENROUTER_API_KEY` from `.env`, writes static MP3 files under
  `public/assets/generated/<pack-id>/audio/`, and updates level `audio.path`
  values to canonical static paths.
- Use the `imagegen` skill for image generation. Do not substitute hand-coded
  SVGs, script-only placeholders, or deterministic drawing code when the task
  calls for generated image assets.
- Keep pack content bilingual for production-quality packs: English and
  Simplified Chinese L0/L1 text, audio text, find prompt, success phrase, and
  fallback text.

## Content Pack Checklist

1. Add or edit `content/packs/<pack-id>.json`.
2. Include pack metadata, languages, scenes, scene object placements, objects,
   interaction animation metadata, image paths, visual prompts, and audio paths.
3. Make every scene placement reference an object defined in the same pack.
4. Keep object language content in the pack, not in runtime engine code.
5. Generate or refresh static level audio:
   `bun .agents/skills/content-generation/scripts/generate-openrouter-audio.ts --generate --pack <pack-id>`.
6. Format content JSON after generation:
   `bunx biome format --write content/packs/<pack-id>.json`.
7. Audit static level audio:
   `bun .agents/skills/content-generation/scripts/generate-openrouter-audio.ts --audit --pack <pack-id>`.
8. Register new packs in `src/content/catalog.ts`.
9. Run `bun run validate:content`.
10. Run `bun run test`.
11. Run `bun run test:e2e`.
12. Run `bun run check:secrets`.
13. Run `bun run build`.

## Static Asset Guidance

- Object images should be clear at small sizes, friendly, toddler-safe, and free
  of text, logos, ads, watermarks, scary imagery, and unsafe behavior.
- Backgrounds should be calm, uncluttered, and should not hide placed objects.
- Audio should match the content pack text for the target language and level.
- Audio file names should use the canonical shape
  `/assets/generated/<pack-id>/audio/<object-id>-<language>-<level>.mp3`.
- For a full voice refresh, run the audio helper with `--generate --refresh`.
  Prune old audio only after the content references and `--audit` prove it is
  unreferenced.
- For a provider sanity check before bulk generation, run the audio helper with
  `--sample --pack <pack-id>`; it writes the sample to `/private/tmp/`.
- If using AI or API keys to create production assets, do that outside the app
  runtime and never commit secrets.
