# Audio Script Template

## Voice Direction

- Voice:
- Speed:
- Tone:
- Notes:

Use a warm, slow, toddler-friendly voice. Generate separate MP3 files for each
line and keep filenames stable.

## Scene Narration

| Scene id | English line | Simplified Chinese line | English file | Chinese file |
| --- | --- | --- | --- | --- |
|  |  |  | `/assets/generated/<pack-id>/audio/<scene-id>-en.mp3` | `/assets/generated/<pack-id>/audio/<scene-id>-zh-Hans.mp3` |

Review gate:

- Every line exactly matches or intentionally mirrors the displayed story text.
- Chinese is natural Simplified Chinese.
- Sentences are short and easy to repeat.

## Item Word Audio

| Item id | English word | Simplified Chinese word | English file | Chinese file |
| --- | --- | --- | --- | --- |
|  |  |  | `/assets/generated/<pack-id>/audio/<item-id>-en.mp3` | `/assets/generated/<pack-id>/audio/<item-id>-zh-Hans.mp3` |

Review gate:

- Every Card Mode item has both files.
- Names match the story-pack JSON.
- Pronunciation-sensitive words are reviewed before generation.

## Optional Interaction Audio

| Interaction id | Line or sound | File |
| --- | --- | --- |
|  |  |  |

Review gate:

- Interaction audio is soft, short, and repeatable.
- No sound is harsh, startling, or framed as failure.

## Final Audio Checks

- No file is `/silence.wav`.
- No file is copied from a placeholder pack.
- MP3 files play with clear pacing and consistent volume.
- Run `bun .agents/skills/content-generation/scripts/validate-story-assets.ts`.
