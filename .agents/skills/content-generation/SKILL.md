---
name: content-generation
description: Use when adding or refreshing Word Garden story packs, bilingual story text, static images, or static audio assets.
---

# Word Garden Story Pack Generation

This is an authoring workflow only. The app runtime stays static and imports
committed story packs directly from `content/story-packs/*.json`.

## Rules

- Do not create runtime catalog JSON files under `public/`.
- Do not add package scripts for generating content, catalogs, manifests, or
  asset reviews.
- Do not create generated JSON manifests or generated review JSON files.
- Do not add runtime AI calls, remote content loading, backend code, client
  secrets, or client-exposed API keys.
- Write active story content as committed JSON under
  `content/story-packs/<pack-id>.json`.
- Keep legacy object-pack content under `content/legacy-word-garden-v2/` out of
  active runtime imports.
- Write static image/audio files under `public/assets/generated/<pack-id>/` and
  reference those `/assets/...` paths from the story pack.
- Use the `imagegen` skill for production image assets. Do not substitute
  hand-coded SVGs or deterministic drawing code when production generated art is
  requested.
- Use OpenRouter or other API-backed audio generation only outside the client
  runtime. Never commit secrets.
- Keep production story packs bilingual: English and Simplified Chinese story
  text, item labels, narration audio, and item word audio.

## Story Pack Checklist

1. Choose the learning goal and target age.
2. Write the plot plan before scenes.
3. Create `content/story-packs/<pack-id>.json`.
4. Include metadata, supported languages, cover image, plot plan, scenes, and
   items.
5. Include at least two scenes.
6. Keep each scene to one clear toddler-scale moment.
7. Give every scene English and Simplified Chinese text.
8. Give every scene English and Simplified Chinese narration audio paths.
9. Give every learnable item English and Simplified Chinese labels.
10. Give every learnable item English and Simplified Chinese word audio paths.
11. Place each item in the scenes declared by its `sceneIds`.
12. Put active assets under `public/assets/generated/<pack-id>/`.
13. Copy reused legacy assets into the active pack asset directory before
    referencing them.
14. Run `bun run check`.
15. Run `bun run test`.
16. Run `bun run test:e2e`.
17. Run `bun run build`.

## Static Asset Guidance

- Scene images should be calm, uncluttered, friendly, toddler-safe, and free of
  text, logos, ads, watermarks, scary imagery, and unsafe behavior.
- Item images should be clear at small sizes and easy to tap.
- Tappable scene items should be visually distinct from the background.
- If batching item art with imagegen, use source sheets only as temporary
  workspace material; commit the final split and optimized assets.
- Scene backgrounds may be generated one at a time when each scene needs a
  distinct composition.
- Resize and optimize production assets before committing. Keep backgrounds and
  item images small enough for a static mobile PWA.
- Audio should be clear, slow, warm, and matched exactly to the story-pack text.
- Audio files should use stable names such as:
  `/assets/generated/<pack-id>/audio/<scene-id>-en.mp3`,
  `/assets/generated/<pack-id>/audio/<scene-id>-zh-Hans.mp3`,
  `/assets/generated/<pack-id>/audio/<item-id>-en.mp3`, and
  `/assets/generated/<pack-id>/audio/<item-id>-zh-Hans.mp3`.

## Review Checklist

- The plot was created before scenes.
- The story has a clear beginning, middle, and ending.
- Every scene has English and Simplified Chinese text.
- Every scene has matching narration audio in both languages.
- Every tappable item has word audio in both languages.
- Every Card Mode item has English and Simplified Chinese labels.
- Every item appears in its declared scenes.
- Images match the story and are toddler-safe.
- Interactions are short, gentle, and repeatable.
- Runtime imports only committed active story packs and static asset paths.
- Legacy content is not imported by `src/content/catalog.ts`.
