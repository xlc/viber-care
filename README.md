# Word Garden

Word Garden is a static PWA game for toddlers to learn objects and words in gentle bilingual scenes. The MVP supports English and Simplified Chinese, Explore mode, Find mode, Puzzle mode, garden, ocean, dinosaur, numbers, English alphabet, and transportation packs, content sets inside packs, multi-scene navigation, object variants, region-aware randomized placement, and runtime fallbacks for advanced word detail.

## Commands

Use Bun for package management and scripts.

```sh
bun install
bun run test
bun run test:e2e
bun run build
bun run dev
bun run deploy
```

## Local Development

Start the app directly after installing dependencies:

```sh
bun run dev
```

The app imports committed source content through `src/content/catalog.ts`. There
is no generated runtime JSON catalog and no content generation package script.
Reusable item content stays in committed `content/items/*.json` files. Pack,
set, scene, and placement content stays in committed `content/packs/*.json`
files.

## Content Packs

To add a content pack:

1. Add a JSON pack under `content/packs/`.
2. Follow the Zod schemas in `src/content/schema.ts`.
3. Include at least two scenes per pack, each with a calm background asset.
4. Define scene `regions` as percentage rectangles tied to the background image, such as `sky`, `water`, `grass`, `road`, or `card-field`.
5. Add scene spawn candidates with `itemId`, `regionTags`, anchor positions, jitter, scale ranges, and per-scene visible object limits.
6. Add or reuse global item files under `content/items/`. Each item should include bilingual learning content, interaction metadata, and at least two static visual variants with color, size, style, or tag metadata when applicable.
7. Add `sets` when a pack should expose smaller groups, with each set referencing item ids and one or more scene ids.
8. Include English and Simplified Chinese L0-L5 content for production-quality packs.
9. Run `bun run test`.
10. Run `bun run test:e2e`.
11. Run `bun run build`.

The engine does not need code changes for new items, variants, scenes, packs, content sets, learning levels, generated image paths, or generated audio target paths.

## Assets

This repository bundles committed static raster images for content packs and
static audio targets. Content and asset generation is handled by the local
authoring skill:

```txt
.agents/skills/content-generation/SKILL.md
```

For production art, generate and review image/audio assets locally or in a secure
CI job, place the static files under `public/assets/`, update the pack asset
paths if needed, then commit the bundled assets. Content image references should
stay under `public/assets/generated/imagegen/`. The static runtime does not need
any secret or network access.

Review assets before deployment:

1. Check the visual files under `public/assets/generated/` or replacement production paths.
2. Confirm each object variant is friendly, clear, age-appropriate, and not scary or noisy.
3. Confirm each scene background is calm and has usable regions for its spawn tags.
4. Confirm objects can only spawn in appropriate regions, for example fish in water, sun in sky, and vehicles on road/rail/water/sky.
5. Confirm audio text in the pack matches the intended spoken words.
6. Run `bun run test`, `bun run test:e2e`, and `bun run build`.

## Cloudflare Pages

Deployment target: Cloudflare Pages static hosting.

- Build command: `bun run build`
- Build output directory: `dist`
- Runtime: static-only
- Backend: none
- Cloudflare Functions: none
- Wrangler config: `wrangler.jsonc`

Environment variables:

- `BUN_VERSION`: optional
- GitHub Actions secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`

The Cloudflare API token only needs account-level Cloudflare Pages edit access.
Create or use a Cloudflare Pages project named `word-garden`; set its production branch to the branch you deploy from.

Recommended production flow:

1. Generate and review assets locally, in the content-generation skill, or in a secure CI job.
2. Commit bundled generated assets.
3. GitHub Actions runs the unit tests, browser tests, and static build.
4. Pushes to `main` or `master` deploy `dist` to the `word-garden` Cloudflare Pages project.

Optional Wrangler deploy:

```sh
bun run deploy
```

`public/_headers` gives long cache headers to static assets. `public/_redirects` supports static app routing.

## Runtime Safety

- No ads.
- No purchases.
- No analytics by default.
- No runtime AI calls.
- No client secrets.
- No autoplay audio before user interaction.
- Settings are stored only in `localStorage`.
- The app does not load remote content.

## Word Detail

- Single word maps to L0.
- Tiny phrase maps to L1.
- Short label maps to L2.
- Simple sentence maps to L3.
- Question maps to L4.
- Little scene maps to L5.

Every committed item includes English and Simplified Chinese L0-L5 text and
static audio references. The parent UI uses word-detail names instead of raw
level codes.
