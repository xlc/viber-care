# AGENTS.md

## Project Goal

Word Garden is a complete static PWA for toddlers to explore simple bilingual stories through touch, sound, and pictures. It should feel like a calm interactive picture book, not a quiz. The product is bilingual with English and Simplified Chinese only, while the content architecture remains ready for more story packs, scenes, image assets, and audio clips.

## Commands

Use Bun only.

```sh
bun install
bun run test
bun run test:e2e
bun run build
bun run deploy
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

Active story packs live in committed `content/story-packs/*.json` files.
Legacy object-pack content and reusable old assets live under
`content/legacy-word-garden-v2/` and must not be imported by runtime code.

The app runtime imports committed source content through `src/content/catalog.ts`.
Do not add a generated runtime JSON catalog, catalog generation script, or content
generation package script.

Core schemas live in `src/content/schema.ts`. Content validation logic lives in
`src/content/validation.ts`.

Do not hard-code story text, item labels, audio text, asset paths, scene order,
or interaction definitions in the engine. Story titles, descriptions, plot
plans, scene text, item names, audio references, image references, and simple
interaction definitions belong in story pack files.

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

## Adding a Story Pack

1. Create `content/story-packs/<pack-id>.json`.
2. Add pack metadata, supported languages, cover image, plot plan, scenes, and items.
3. Include at least two scenes.
4. Give every scene English and Simplified Chinese text and narration audio.
5. Give every learnable item English and Simplified Chinese labels and word audio.
6. Reference only committed static assets under `public/assets/`.
7. Reuse legacy assets only after review, and copy selected assets into the active story pack asset directory.
8. Run `bun run test`.
9. Run `bun run test:e2e`.
10. Run `bun run build`.

## Generating Content And Assets

Use the local content-generation skill:

```txt
.agents/skills/content-generation/SKILL.md
```

Generation is an authoring workflow, not a runtime or package-script workflow.
Generate or edit content and static assets directly, place static files in
`public/assets/`, update content paths if needed, and commit the bundled source
content/assets. Do not create generated JSON catalogs or generated content
manifests.

The content-generation skill may lag the runtime during the story-card refactor.
When it does, follow the active story-pack schema and record concrete workflow
gaps for the later skill update. Generation must remain an authoring workflow
outside the client runtime.

## Reviewing Assets

Before completion or deployment:

1. Confirm every story image and item image is friendly, clear, and toddler-safe.
2. Confirm each scene is calm and uncluttered.
3. Confirm tappable or card items are visually clear.
4. Confirm no asset contains ads, purchases, scary imagery, unsafe behavior, logos, watermarks, or unwanted text.
5. Confirm audio text matches the target content.
6. Confirm the runtime imports only committed active story content and static paths.
7. Confirm legacy content is not imported into the active catalog.
8. Run the completion checks before production release.

## Completion Checks

Run these before calling work complete:

```sh
bun run test
bun run test:e2e
bun run build
```

For production release, run `bun run deploy` after completion checks pass. The
deploy script builds the static app and uploads `dist` to the configured
Cloudflare Pages project.
