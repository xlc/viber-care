# Milestone 4: Story Pack Authoring Workflow

## Goal

Update the repo-local content-generation workflow after the first complete story pack exposes the real authoring needs. The final workflow should create future story packs in the required order: goal, plot plan, scenes, items, bilingual text, image prompts, images, audio script, audio, assembly, review.

## Scope

- Rewrite `.agents/skills/content-generation/SKILL.md` around story packs.
- Use lessons from the first Mimi pack instead of designing the whole workflow speculatively.
- Keep content generation as an authoring workflow only.
- Keep generated images and audio committed as static assets.
- Define checklist outputs for each authoring step.
- Add a story-pack OpenRouter audio helper for narration and item audio if manual asset generation becomes too slow.
- Update or add helper scripts only if they validate or generate committed assets directly.

## Out Of Scope

- Runtime AI calls.
- Package scripts for generation.
- Generated runtime JSON catalogs or manifests.
- Broad provider abstraction for audio/image generation.
- Blocking Milestones 1 through 3 on a full generation-skill rewrite.

## Implementation Surface

Update:

- `.agents/skills/content-generation/SKILL.md`
- Content-generation helper scripts, only when they match active story packs.
- `AGENTS.md`, if any content-generation guidance still describes old object packs after Milestone 1.
- `src/content/validation.ts`
- `tests/unit/story-content-schema.test.ts`

Add, only if useful:

- `.agents/skills/content-generation/templates/story-pack-plan.md`
- `.agents/skills/content-generation/templates/audio-script.md`
- `.agents/skills/content-generation/scripts/validate-story-assets.ts`

Remove:

- Object-pack-only instructions that require L0-L5 item levels.
- Find/success prompt audio requirements that no longer exist in the product.

## Detailed Work Breakdown

### 1. Rewrite Skill Responsibilities

Replace object-pack workflow with these story-pack roles:

- Story planner.
- Scene writer.
- Vocabulary and card builder.
- Image prompt generator.
- Audio script generator.
- Audio generation helper.
- Story pack assembler.
- Story pack reviewer.

Each role should state inputs, outputs, and review checks.

This rewrite should be grounded in the first Mimi pack's actual source files, asset review notes, audio script, and assembly pain points.

### 2. Add Audio Helper

Removed object-pack helper assumptions:

- Reads `content/items/*.json`.
- Reads `content/packs/*.json`.
- Generates L0-L5 audio.
- Generates find/success prompt audio.
- Writes audio paths back to global item files.

New helper behavior, if added:

- Reads active story packs only.
- Generates scene narration audio.
- Generates item word audio.
- Generates optional item phrase or interaction audio.
- Writes audio paths back to story-pack JSON.
- Audits every story-pack audio reference for file existence.

### 3. Adapt Image Validation

Validation should check:

- Cover images.
- Scene images.
- Item card images.
- Optional transparent item cutouts if overlay placement uses them.
- File size limits appropriate to scene and item assets.
- No unreferenced active story assets.

### 4. Add Templates

Useful templates:

- `story-pack-plan.md` for plot plan, scene outline, vocabulary, interaction ideas.
- `audio-script.md` for narration and item lines before generation.
- `asset-review.md` only if it stays human-readable and not a generated runtime manifest.

### 5. Documentation Rules

The skill and `AGENTS.md` should agree on:

- Active content directory.
- Legacy archive directory.
- Static-only runtime.
- OpenRouter key naming.
- No package scripts for generation.
- No generated runtime catalog.
- Imagegen for story assets.

## Audio Baseline

Use these defaults for future story-pack audio generation unless audio review shows a concrete quality problem:

- Endpoint: `https://openrouter.ai/api/v1/audio/speech`
- Model: `openai/gpt-4o-mini-tts-2025-12-15`
- Voice: `nova`
- Format: MP3
- Speed: `0.9`
- Key source: `OPENROUTER_API_KEY` from `.env`
- Safety rule: refuse client-exposed `VITE_OPENROUTER_API_KEY`

## Authoring Steps To Encode

1. Choose story goal.
2. Generate plot plan.
3. Generate scene plan.
4. Generate item list.
5. Generate bilingual text.
6. Generate image prompts.
7. Generate images with the Codex image generation tool.
8. Generate audio script.
9. Generate audio with the OpenRouter audio model defaults.
10. Assemble the story pack.
11. Review Story Mode and Card Mode.

## Test Plan

- Unit-test schema validation around required audio/image paths.
- Run audio helper audit mode against the first story pack after Milestone 5.
- Run image asset validation against the first story pack after Milestone 5.
- Run `bun run test`, `bun run test:e2e`, and `bun run build` before accepting content.

## Acceptance Criteria

- The skill requires plot planning before scene or asset generation.
- The skill update reflects the first completed story-pack workflow, not an untested abstract process.
- The skill describes story planner, scene writer, vocabulary/card builder, image prompt generator, audio script generator, audio generation, story pack assembler, and story pack reviewer responsibilities.
- The workflow preserves the static runtime boundary.
- The workflow requires asset review for toddler safety and bilingual completeness.
- The workflow references the new story-pack schema, not the removed L0-L5 object model.
- The audio helper can generate and audit scene narration and item-word audio for story packs.
- `AGENTS.md` and the content-generation skill no longer disagree about active content shape.
- `bun run test` and `bun run build` pass after any schema/helper changes.
