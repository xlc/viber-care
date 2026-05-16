# Milestone 2: Story Mode Foundation

## Goal

Implement the core Story Mode experience for ordered scenes, narration, tappable story text, tappable items, and simple scene navigation.

## Scope

- Render one selected scene at a time.
- Show scene image, scene text, and scene items.
- Play selected-language narration from committed audio when story text or replay is tapped.
- Play selected-language item audio when an item is tapped.
- Support previous scene, next scene, language toggle, replay, and return to menu.
- Add one simple repeatable interaction definition and renderer path.
- Support portrait and landscape scene layouts without hidden gesture dependencies.

## Out Of Scope

- Card Mode polish.
- Full pack generation.
- Multiple interaction families beyond the first simple set.
- Card deck generation.
- Final story content polish.

## Implementation Surface

Update:

- `src/app.tsx`
- `src/styles.css`
- `src/audio/speech.ts`
- `src/content/schema.ts`
- `src/content/validation.ts`
- `tests/e2e/word-garden.spec.ts`

Add:

- `src/story/story-mode.ts`
- `src/story/interactions.ts`, if interaction state needs to stay out of the component.
- `tests/unit/story-mode.test.ts`

Remove:

- Any remaining scene placement or prompt helpers that only support the old Explore/Find/Puzzle model.

## Detailed Work Breakdown

### 1. Scene Navigation Model

Helpers:

- `getSceneById(pack, sceneId)`
- `getSceneIndex(pack, sceneId)`
- `getNextSceneId(pack, sceneId)`
- `getPreviousSceneId(pack, sceneId)`
- `getInitialSceneId(pack, savedSceneId)`

Behavior:

- First scene previous button stays visible but disabled.
- Last scene next button stays visible and can return to the pack menu or stay disabled, based on final UI choice.
- Changing pack resets to that pack's first scene.
- Changing language keeps the current scene.

### 2. Scene Audio Model

Helpers:

- `getSceneNarration(scene, language)`
- `getSceneText(scene, language)`
- `getSceneItemAudio(item, language)`

Playback:

- Use committed audio first.
- Do not use runtime TTS for missing audio.
- If audio is missing in development, validation should fail before runtime.
- Stop current audio before replaying a new narration or item sound.

### 3. Scene Layout

Preferred layout:

- Illustration dominates the viewport.
- Story text remains tappable and readable.
- Navigation controls are fixed enough to be predictable but not intrusive.
- Item tap targets are at least 44 CSS pixels and larger where practical.

Placement options:

- Position item hit areas from scene data if item coordinates are provided.
- Use below-image item buttons only as a fallback for the first implementation if overlay accuracy is not ready.

### 4. Interaction Model

Initial interaction types:

- `move`
- `bounce`
- `float`
- `glow`
- `sound`

Rules:

- One optional interaction per scene for the first story pack.
- Interactions are local UI state.
- Interactions reset cleanly when changing scene.
- Interactions can be repeated immediately.
- No success/failure language.

### 5. Tests

Unit tests:

- Scene navigation boundaries.
- Saved scene fallback.
- Language-specific text/audio lookup.
- Missing item references rejected by validation.

E2E tests:

- Enter Story Mode from Home.
- Tap scene text and verify one audio play.
- Tap replay and verify one audio play.
- Toggle language and verify visible text changes.
- Tap an item and verify selected-language audio.
- Trigger one interaction twice.
- Verify no autoplay before the first tap.

## Tasks

1. Execute the detailed work breakdown above in order.
2. Keep interaction rendering small and data-driven.
3. Delete old prompt/toast behavior that exists only for Find, Puzzle, or Math Play.

## Acceptance Criteria

- Story Mode works in English.
- Story Mode works in Simplified Chinese.
- Scene text tap replays the current scene narration.
- Replay button replays the current scene narration.
- Item taps play the item audio for the current language.
- Previous and next buttons move through scenes without hidden gestures.
- First/last scene navigation remains visible and safe.
- One optional interaction can be repeated.
- Portrait and landscape scene layouts remain usable.
- `bun run test`, `bun run test:e2e`, and `bun run build` pass.
