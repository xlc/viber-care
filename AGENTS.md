# AGENTS.md

## Project Goal

Word Garden is a complete static PWA game for toddlers to learn words and objects. It should feel like a gentle digital toy, not a quiz. The product is bilingual with English and Simplified Chinese only, while the content architecture remains ready for more levels, scenes, packs, image assets, and audio clips.

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

Reusable item content lives in committed `content/items/*.json` files. Pack and
set layout lives in committed `content/packs/*.json` files.

The app runtime imports committed source content through `src/content/catalog.ts`.
Do not add a generated runtime JSON catalog, catalog generation script, or content
generation package script.

Core schemas live in `src/content/schema.ts`. Content validation logic lives in
`src/content/validation.ts`.

Do not hard-code item language content or placement rules in the engine.
Object labels, prompts, success phrases, fallback text, audio text, visual
prompts, asset paths, variants, scene regions, region tags, and spawn constraints
belong in content files.

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

1. Create `content/packs/<pack-id>.json`.
2. Add pack metadata, languages, sets, and at least two scenes.
3. Add scene background assets and `regions` as percentage rectangles tied to the background image.
4. Add scene spawn candidates with `itemId`, percentage anchors, `regionTags`, jitter, scale ranges, and visible object limits.
5. Add or reuse global item files under `content/items/`. Each item needs at least two static variants with metadata such as color, size, style, or tags when applicable.
6. Add interaction animation metadata to item files.
7. Add per-language content and per-level content to item files.
8. For production-quality bilingual packs, include English and Simplified Chinese L0-L5 text, audio text, find prompt, success phrase, and fallback text.
9. Run `bun run test`.
10. Run `bun run test:e2e`.
11. Run `bun run build`.

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

Future content generation must preserve the richer source shape: reusable
global items, pack sets that reference item ids, multiple scenes per pack, two
or more variants per item, region-tagged spawn candidates, and randomized
visible object counts so a scene can contain more candidates than it shows at
once.

## Reviewing Assets

Before completion or deployment:

1. Confirm every object is friendly, clear, and toddler-safe.
2. Confirm every object variant is visibly distinct enough to justify the variant.
3. Confirm each scene is calm, uncluttered, and has regions that match the background image.
4. Confirm each object can only spawn in appropriate regions, for example fish in water, sun in sky, and vehicles on road/rail/water/sky.
5. Confirm no asset contains ads, purchases, scary imagery, unsafe behavior, or unwanted text.
6. Confirm audio text matches the target content.
7. Confirm the runtime imports only committed static content and static paths.
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
