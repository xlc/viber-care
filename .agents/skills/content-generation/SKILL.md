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
- Keep pack content bilingual for MVP-quality packs: English and Simplified
  Chinese L0/L1 text, audio text, find prompt, success phrase, fallback text,
  and Simplified Chinese romanization.

## Content Pack Checklist

1. Add or edit `content/packs/<pack-id>.json`.
2. Include pack metadata, languages, scenes, scene object placements, objects,
   interaction animation metadata, image paths, visual prompts, and audio paths.
3. Make every scene placement reference an object defined in the same pack.
4. Keep object language content in the pack, not in runtime engine code.
5. Register new packs in `src/content/catalog.ts`.
6. Run `bun run validate:content`.
7. Run `bun run test`.
8. Run `bun run test:e2e`.
9. Run `bun run check:secrets`.
10. Run `bun run build`.

## Static Asset Guidance

- Object images should be clear at small sizes, friendly, toddler-safe, and free
  of text, logos, ads, watermarks, scary imagery, and unsafe behavior.
- Backgrounds should be calm, uncluttered, and should not hide placed objects.
- Audio should match the content pack text for the target language and level.
- If using AI or API keys to create production assets, do that outside the app
  runtime and never commit secrets.
