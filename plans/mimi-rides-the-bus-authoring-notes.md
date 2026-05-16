# Mimi Rides the Bus Authoring Notes

## Asset Review

- Story images were generated with the built-in `imagegen` workflow, copied into `public/assets/generated/mimi-rides-the-bus/`, and optimized as static JPEG assets.
- The selected images are warm, friendly, uncluttered, and contain no intentional text, logos, ads, watermarks, scary imagery, or unsafe behavior.
- Item images are standalone, large, and visually distinct for Card Mode and scene tap targets.

## Audio Review

- Narration and item-word audio are committed static MP3 files under `public/assets/generated/mimi-rides-the-bus/audio/`.
- No active pack references placeholder silence audio.
- Audio was generated with OpenRouter using `openai/gpt-4o-mini-tts-2025-12-15`, voice `nova`, MP3 output, and slow toddler-friendly instructions.
- A local OS TTS fallback attempt produced zero-duration MP3s in this environment; those files were replaced before completion.

## Workflow Gaps For Milestone 4

- The workflow needs a small asset audit helper that checks active story packs for missing files and placeholder paths.
- The workflow needs an audio duration audit so a command that exits successfully cannot leave silent or invalid MP3 files.
- Image prompt review and final image selection are still manual; future packs would benefit from a reusable prompt and review template.
