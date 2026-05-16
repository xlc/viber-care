# Toddler Story and Card Refactor

## Status

Active planning document. Implementation has not started.

## Goal

Refactor Word Garden into a static iPad/iPhone web app for toddlers to explore bilingual story packs through touch, sound, pictures, and simple repeatable interactions.

The product should become a calm interactive picture book with two modes:

- Story Mode: play through one story pack scene by scene.
- Card Mode: browse every learnable item from the selected story pack as large bilingual cards.

## Breaking Change Policy

This refactor should not preserve legacy behavior unless it directly supports the story and card product.

Remove or replace:

- Explore mode.
- Find mode.
- Puzzle mode references and puzzle-specific behavior, if present in the current branch.
- Math Play mode.
- L0-L5 word-detail controls.
- Pack sets as the primary toddler-facing selection model.
- Language-order presets such as English-only, Chinese-only, English-then-Chinese, and Chinese-then-English.
- Any old tests that assert removed modes or removed settings.

Keep:

- Static-only runtime.
- Committed JSON source content.
- Committed static images and audio.
- English and Simplified Chinese.
- `localStorage` for settings.
- Large touch targets, visible mute, parent settings behind a gear button, and no failure states.

Resolved planning decisions:

- Keep Milestone 1 as one large breaking milestone rather than splitting out a preflight milestone.
- Define the new content contract in TypeScript schema first; do not add a generic JSON fixture before implementation.
- Move existing vocabulary packs and item JSON out of the active runtime catalog instead of deleting them. Keep them committed as legacy source material for manual story-pack reuse when the words, images, or audio fit the new story.
- Active story packs live under `content/story-packs/`.
- Move old generated assets into the legacy archive unless they are intentionally copied back into an active story pack.
- Use the existing content-generation skill's OpenRouter defaults for story audio unless quality review proves a change is needed: `openai/gpt-4o-mini-tts-2025-12-15`, voice `nova`, MP3 output, speed `0.9`, and the current warm toddler/Mandarin voice instructions.
- Card Mode starts with one-card paging rather than a sparse grid.
- Require separate Home, Story Mode, Card Mode, and Parent Settings components rather than rebuilding everything inside `src/app.tsx`.
- Keep the full content-generation skill rewrite after the first story pack exposes concrete workflow needs.
- Treat iPad and iPhone portrait and landscape as first-class layouts for the first release.

## Target Product Shape

### Home Screen

The home screen lists story packs. Each pack shows:

- Cover image.
- English title.
- Chinese title.
- Short description.
- Main language selector.
- Story Mode button.
- Card Mode button.

The app remembers:

- Last selected pack.
- Main language.
- Mute setting.

### Story Mode

Story Mode renders the selected story as ordered scenes. Each scene shows:

- A large illustration.
- Short story text in the selected language.
- Tappable visible items.
- Previous scene button.
- Next scene button.
- Language toggle.
- Replay narration button.
- Return-to-pack-menu button.

The toddler can:

- Tap story text to replay narration.
- Tap items to hear the selected-language item word or short phrase.
- Tap optional interaction elements that trigger short, obvious, repeatable animations or sounds.

Story Mode has one main language at a time:

- English shows English text and plays English narration/item audio.
- Chinese shows Simplified Chinese text and plays Chinese narration/item audio.

### Card Mode

Card Mode shows every important vocabulary item from the selected story pack.

Each card shows:

- Item image.
- English word.
- Chinese word.

Tapping a card plays:

1. English word audio.
2. Chinese word audio.

Cards should be large, sparse, easy to scroll or page, and repeatable without score or failure states.

## Target Content Model

Replace the current object/level catalog with a story-first catalog.

### Story Pack

Each pack should include:

- `id`
- `version`
- `metadata`
- `plotPlan`
- `languages`
- `coverImage`
- `scenes`
- `items`

### Metadata

Metadata should include:

- English title.
- Chinese title.
- Age range.
- Main learning theme.
- Short description.
- Supported languages.
- Scene count.

### Plot Plan

Plot plan is required before scenes, images, items, or audio are generated.

It should include:

- Main character.
- Setting.
- Story goal.
- Beginning.
- Middle.
- Ending.
- Emotional tone.
- Learning goals.
- Key vocabulary items.
- Interaction ideas.

### Scene

Each scene should include:

- Stable scene id.
- Scene number.
- Scene purpose.
- English story text.
- Chinese story text.
- English narration audio.
- Chinese narration audio.
- Main scene image.
- Image description or prompt.
- Visible item placements.
- Optional interaction definition.

### Story Item

Each item should include:

- Stable item id.
- English word.
- Chinese word.
- English phrase, optional.
- Chinese phrase, optional.
- Image asset.
- Image description or prompt.
- Scene appearances.
- English word audio.
- Chinese word audio.
- Optional interaction audio.

## Implementation Surface

### Relevant Current Files

- `src/app.tsx`
- `src/styles.css`
- `src/audio/speech.ts`
- `src/state/settings.ts`
- `src/content/schema.ts`
- `src/content/catalog.ts`
- `src/content/validation.ts`
- `src/learning/engine.ts`
- `src/game/find-mode.ts`
- `src/game/math-play-mode.ts`
- `src/game/scene-layout.ts`
- `AGENTS.md`
- `content/items/*.json`
- `content/packs/*.json`
- `tests/unit/*.test.ts`
- `tests/e2e/word-garden.spec.ts`
- `.agents/skills/content-generation/SKILL.md`

### Files To Add

- `src/story/types.ts`, if the story runtime needs UI-specific derived types separate from content schemas.
- `src/story/pack-selection.ts`, for selecting packs and normalizing persisted pack ids.
- `src/story/story-mode.ts`, for scene navigation and narration helpers.
- `src/story/card-mode.ts`, for card deck construction and bilingual playback order.
- `src/components/HomeScreen.tsx`.
- `src/components/StoryMode.tsx`.
- `src/components/CardMode.tsx`.
- `src/components/ParentSettings.tsx`.
- `content/story-packs/mimi-rides-the-bus.json`.
- `tests/unit/story-content-schema.test.ts`
- `tests/unit/story-mode.test.ts`
- `tests/unit/card-mode.test.ts`
- `tests/e2e/story-card-app.spec.ts`

### Files To Update

- `src/content/schema.ts`: replace the current L0-L5 object model with story pack, scene, item, asset, narration, and interaction schemas.
- `src/content/catalog.ts`: import story packs directly from committed source JSON and parse the new runtime catalog.
- `src/content/validation.ts`: validate story completeness, bilingual text/audio, asset references, scene order, item appearances, and interaction references.
- `src/state/settings.ts`: reduce persisted settings to selected pack, main language, muted state, and optional last mode/scene.
- `src/audio/speech.ts`: keep static audio playback but expose helpers for scene narration, item audio, and bilingual card sequences.
- `src/app.tsx`: replace the single legacy game surface with Home, Story Mode, Card Mode, and parent settings.
- `src/styles.css`: rebuild visual layout around calm storybook screens and large cards.
- `public/manifest.webmanifest`: update app naming/icons only if the product name changes.
- `AGENTS.md`: update repository guidance from object-pack/L0-L5 gameplay to the new story-pack architecture.
- `.agents/skills/content-generation/SKILL.md`: update after the first story pack exposes concrete generation workflow needs.

### Files To Remove

- `src/game/find-mode.ts`
- `src/game/math-play-mode.ts`
- `src/game/scene-layout.ts`, unless it is rewritten into a simpler story placement helper.
- `src/learning/engine.ts`, unless small audio presentation helpers are worth keeping under `src/story/`.
- Unit tests for removed modes.
- E2E assertions for removed mode controls, level controls, set switching, and math/find behavior.

### Content And Asset Cleanup

The current `content/items/*.json` and `content/packs/*.json` model is not a good fit for story packs. Move the existing source JSON outside the active import glob, for example under `content/legacy-word-garden-v2/source/`, and treat it as reusable source material rather than runtime content.

Existing assets may be reused only when they match the story style and pass the story-pack asset review. Move non-reused generated assets out of `public/` so they are not copied into `dist`; copy selected reused assets back into the new story pack asset directory intentionally.

Recommended legacy layout:

```txt
content/legacy-word-garden-v2/
  source/items/
  source/packs/
  assets/
  README.md
```

The legacy `README.md` should explain that this material is not runtime content and is available only for manual reuse during story-pack authoring.

Do not build a migration adapter from the old object-pack schema to the new story-pack schema. The active catalog should only import the new story-pack source.

## High-Level API Changes

Replace current settings:

```ts
type StoryAppSettings = {
	selectedPackId: string
	language: 'en' | 'zh-Hans'
	muted: boolean
	lastSceneId?: string
}
```

Introduce story catalog types:

```ts
type StoryCatalog = {
	schemaVersion: 'story-pack-v1'
	supportedLanguages: Array<'en' | 'zh-Hans'>
	packs: StoryPack[]
}

type StoryPack = {
	id: string
	version: string
	metadata: StoryPackMetadata
	plotPlan: PlotPlan
	coverImage: AssetReference
	scenes: StoryScene[]
	items: StoryItem[]
}
```

Introduce runtime helpers:

```ts
getPack(catalog, packId)
getScene(pack, sceneId)
getNextScene(pack, sceneId)
getPreviousScene(pack, sceneId)
getSceneItems(pack, scene)
buildCardDeck(pack)
getSceneNarration(scene, language)
getItemAudio(item, language)
getCardAudioSequence(item)
```

## Milestone Order

1. Static Story App Shell.
2. Story Mode Foundation.
3. Card Mode Foundation.
4. Mimi Rides the Bus Pack.
5. Story Pack Authoring Workflow.
6. Polish, QA, and Release.

## Verification Gates

Each implementation milestone should run:

```sh
bun run test
bun run test:e2e
bun run build
```

Content-generation milestones should also run the repo-local asset/audio checks that apply to the new story-pack schema.

## Open Questions

None currently blocking the first milestone.
