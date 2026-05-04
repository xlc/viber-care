# AGENTS.md

## Project Goal

Word Garden is a complete static PWA game for toddlers to learn words and objects. It should feel like a gentle digital toy, not a quiz. The MVP is bilingual with English and Simplified Chinese, but the content architecture must remain ready for more supported language codes, levels, scenes, packs, image assets, and audio clips.

## Commands

Use Bun only.

```sh
bun install
bun run validate:content
bun run generate:assets
bun run build:catalog
bun run review:assets
bun run test
bun run test:e2e
bun run check:secrets
bun run build
bun run dev
```

Do not use npm, yarn, or pnpm unless there is no practical Bun path.

## Static Runtime Rule

The runtime must stay static-only.

- No backend.
- No Cloudflare Functions unless a future requirement makes them absolutely necessary.
- No runtime AI calls.
- No remote content loading.
- No client secrets.
- No client-exposed AI API key environment variables.
- Use `localStorage` only for settings.

API keys may only be used in secure asset generation workflows outside the client runtime.

## Content-Driven Architecture

Raw content lives in `content/packs/*.json` or `content/packs/*.yaml`.

The app runtime loads only:

```txt
public/catalog.generated.json
```

Core schemas live in `src/content/schema.ts`. Catalog validation and generation logic lives in `src/content/build-catalog.ts` and `scripts/generate-catalog.ts`.

Do not hard-code object language content in the engine. Object labels, prompts, success phrases, fallback text, romanization, audio text, visual prompts, and asset paths belong in content files.

## Toddler Design Safety Rules

- No failure states.
- No "wrong" sounds or wording.
- No timers or scoring pressure.
- No ads.
- No purchases.
- No analytics by default.
- No autoplay audio before user interaction.
- Keep tap targets large.
- Keep animation slow and gentle.
- Keep sound effects soft.
- Keep the mute button visible and keyboard-accessible.
- Keep parent settings behind the gear button.

## Adding a Content Pack

1. Create `content/packs/<pack-id>.json` or `.yaml`.
2. Add pack metadata, languages, one or more scenes, and objects.
3. Add scene object positions as percentages.
4. Add object image asset paths and visual generation prompts.
5. Add interaction animation metadata.
6. Add per-language content and per-level content.
7. For MVP-quality bilingual packs, include English and Simplified Chinese L0/L1 text, audio text, find prompt, success phrase, fallback text, and Simplified Chinese romanization.
8. Run `bun run validate:content`.
9. Run `bun run generate:assets`.
10. Run `bun run build:catalog`.
11. Review `public/catalog.generated.json` and generated assets.
12. Run `bun run review:assets` and inspect `public/assets/generated/review.html`.

## Regenerating Assets

Run:

```sh
bun run generate:assets
```

This creates placeholder SVG image assets and placeholder WAV audio from content metadata when no real generated assets are bundled. For real generated image or audio assets, generate them in a secure local or CI process outside the client build, place static files in `public/assets/`, update content paths if needed, and regenerate the catalog.

## Reviewing Assets

Before completion or deployment:

1. Confirm every object is friendly, clear, and toddler-safe.
2. Confirm the scene is calm and uncluttered.
3. Confirm no asset contains ads, purchases, scary imagery, unsafe behavior, or unwanted text.
4. Confirm audio text matches the target L0/L1 content.
5. Confirm the runtime catalog contains only static paths and content.
6. Run `bun run review:assets` and check all warnings before production release.

## Completion Checks

Run these before calling work complete:

```sh
bun run validate:content
bun run generate:assets
bun run build:catalog
bun run review:assets
bun run test
bun run test:e2e
bun run check:secrets
bun run build
```

If `dist` did not exist before `check:secrets`, run `bun run build` first and then rerun `bun run check:secrets`.
