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

## Required Authoring Order

Do these steps in order. Do not generate scenes, item art, or audio before the
plot plan is reviewed.

1. Choose the learning goal, target age, and calm toddler experience goal.
2. Write the plot plan: character, setting, beginning, middle, ending, tone,
   learning goals, vocabulary targets, and interaction ideas.
3. Break the plot into scene plans. Each scene should have one clear moment, a
   small visible item set, and at most one simple repeatable interaction.
4. Build the shared vocabulary/card list from the scene plan.
5. Write bilingual text for titles, scene narration, item names, and optional
   item phrases. Keep Chinese natural rather than word-for-word.
6. Write image prompts for the cover, scenes, and item cards using one visual
   style guide.
7. Generate and review images with the `imagegen` skill.
8. Write the full audio script before generating audio.
9. Generate audio outside the runtime with OpenRouter or another secure local
   authoring flow.
10. Assemble `content/story-packs/<pack-id>.json` and static assets under
    `public/assets/generated/<pack-id>/`.
11. Review Story Mode, Card Mode, bilingual completeness, static paths, and
    toddler safety.

Use the templates in `templates/` for story planning, audio scripts, and human
asset review notes. They are source authoring documents, not runtime manifests.

## Role Responsibilities

### Story Planner

- Inputs: theme, age range, language level, learning goal, desired scene count.
- Outputs: title, character, setting, beginning, middle, ending, tone,
  vocabulary targets, and interaction ideas.
- Review checks: coherent toddler-scale plot, clear emotional arc, concrete
  vocabulary, no scenes written before the plot is accepted.

### Scene Writer

- Inputs: accepted plot plan, target scene count, vocabulary targets.
- Outputs: scene purpose, English text, Simplified Chinese text, visible items,
  image description, and optional interaction.
- Review checks: one or two short sentences per scene, no abstract setup, no
  crowded scenes, every interaction is short and repeatable.

### Vocabulary And Card Builder

- Inputs: plot plan and scene list.
- Outputs: item ids, English names, Simplified Chinese names, optional phrases,
  image descriptions, and scene appearances.
- Review checks: 5-10 items for short stories, concrete nouns/actions, every
  item appears in at least one scene and is useful in Card Mode.

### Image Prompt Generator

- Inputs: plot plan, scenes, items, and visual style guide.
- Outputs: cover prompt, scene prompts, item prompts.
- Review checks: consistent character and setting, toddler-safe tone, clear
  tappable objects, no baked-in text unless intentionally required.

### Audio Script Generator

- Inputs: final bilingual text and item list.
- Outputs: English scene narration, Simplified Chinese scene narration, English
  item words, Simplified Chinese item words, and optional interaction lines.
- Review checks: audio lines match committed text, pronunciation-sensitive
  Chinese is reviewed before generation, no long sentences.

### Audio Generation

- Inputs: reviewed audio script and voice direction.
- Outputs: committed MP3 files under
  `public/assets/generated/<pack-id>/audio/`.
- Review checks: no client secrets, no runtime AI calls, clear warm pacing,
  consistent volume, no placeholder silence files.

Default OpenRouter authoring settings:

- Endpoint: `https://openrouter.ai/api/v1/audio/speech`
- Model: `openai/gpt-4o-mini-tts-2025-12-15`
- Voice: `nova`
- Format: MP3
- Speed: `0.9`
- Key source: `OPENROUTER_API_KEY` from `.env`
- Safety rule: refuse client-exposed `VITE_OPENROUTER_API_KEY`

### Story Pack Assembler

- Inputs: metadata, plot plan, scenes, items, images, and audio.
- Outputs: one complete `content/story-packs/<pack-id>.json`.
- Review checks: every referenced asset exists, every required language is
  complete, every item appears in declared scenes, scene order is correct.

### Story Pack Reviewer

- Inputs: assembled pack and committed assets.
- Outputs: review notes and fixes before release.
- Review checks: story coherence, natural English and Chinese, toddler-safe
  images, clear tappable items, valid audio, no legacy runtime imports.

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

## Asset Audit

Run the local authoring audit before accepting a pack:

```sh
bun .agents/skills/content-generation/scripts/validate-story-assets.ts
```

The audit reads active story packs from `content/story-packs/*.json`, reuses the
runtime schema validation, checks referenced files under `public/assets/`,
rejects placeholder or legacy paths, checks MP3 signatures for audio, and
reports unused files inside each active pack asset directory.

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
- Run `bun .agents/skills/content-generation/scripts/validate-story-assets.ts`.
- Run `bun run check`.
- Run `bun run test`.
- Run `bun run test:e2e`.
- Run `bun run build`.
