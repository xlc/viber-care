# Milestone 3: Card Mode Foundation

## Goal

Rebuild Card Mode around story-pack vocabulary instead of the old level-based object deck.

## Scope

- Build a card deck from the selected story pack's item list.
- Show large cards with item image, English word, and Chinese word.
- Play English then Chinese audio when a card is tapped.
- Support repeated tapping.
- Support simple paging or toddler-friendly scrolling.
- Keep Card Mode independent from the selected Story Mode language.

## Out Of Scope

- Progress tracking.
- Quizzes, scoring, timers, or failure states.
- Fine-grained vocabulary levels.
- Old pack-wide language-order settings.

## Implementation Surface

Update:

- `src/app.tsx`
- `src/styles.css`
- `src/audio/speech.ts`
- `src/content/validation.ts`
- `tests/e2e/word-garden.spec.ts`

Add:

- `src/story/card-mode.ts`
- `tests/unit/card-mode.test.ts`

Remove:

- Old card behavior that depends on `activeLevel` or language-order presets.

## Detailed Work Breakdown

### 1. Deck Construction

Helper:

- `buildCardDeck(pack)`

Rules:

- Include every `StoryItem` marked learnable.
- Preserve the pack-defined item order.
- Exclude purely decorative scene items unless they are marked learnable.
- Fail validation if a card item is missing image, English word, Chinese word, English audio, or Chinese audio.

### 2. Card Audio

Helper:

- `getCardAudioSequence(item)`

Rules:

- Always English first.
- Always Simplified Chinese second.
- Ignore Story Mode's current language.
- Respect mute.
- Stop or replace in-flight card audio when the toddler taps another card.

### 3. Layout

Preferred first version:

- One large active card with previous/next buttons.
- No sparse grid in the first implementation.
- Optional horizontal swipe can be added only if button navigation remains primary and visible.
- Stable card aspect ratio.
- Image area never collapses when audio state changes.
- Text labels fit in both portrait and landscape.

### 4. Tests

Unit tests:

- Deck includes all learnable items.
- Deck order is stable.
- Card audio sequence is English then Chinese.
- Decorative items are excluded when configured.

E2E tests:

- Enter Card Mode from Home.
- Card shows image, English word, and Chinese word.
- Next/previous changes cards without layout jump.
- Tapping card plays two audio files in order.
- Mute prevents card audio.
- Portrait and landscape viewports keep labels readable.

## Tasks

1. Execute the detailed work breakdown above in order.
2. Keep the first implementation sparse rather than dense.
3. Remove old card assumptions tied to L0-L5 levels.

## Acceptance Criteria

- Card Mode shows all learnable items from the selected story pack.
- Every card shows an image, English word, and Chinese word.
- Tapping a card plays English audio first and Chinese audio second.
- Card tapping respects mute.
- Cards stay large and uncluttered on mobile.
- Cards work in portrait and landscape.
- `bun run test`, `bun run test:e2e`, and `bun run build` pass.
