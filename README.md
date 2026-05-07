# Word Garden

Word Garden is a static PWA game for toddlers to learn objects and words in gentle bilingual scenes. The MVP supports English and Simplified Chinese, Explore mode, Find mode, a Story-mode placeholder, garden, ocean, dinosaur, numbers, and English alphabet packs, content sets inside packs, and runtime fallbacks for advanced word detail.

## Commands

Use Bun for package management and scripts.

```sh
bun install
bun run validate:content
bun run test
bun run test:e2e
bun run check:secrets
bun run build
bun run dev
bun run deploy:pages
```

## Local Development

Start the app directly after installing dependencies:

```sh
bun run dev
```

The app imports committed source content through `src/content/catalog.ts`. There
is no generated runtime JSON catalog and no content generation package script.
Raw content stays in committed `content/packs/*.json` files.

## Content Packs

To add a content pack:

1. Add a JSON pack under `content/packs/`.
2. Follow the Zod schemas in `src/content/schema.ts`.
3. Include scene placements with percentage-based positions.
4. Include image asset paths and generation prompts for each object.
5. Add optional `subPacks` when a pack should expose smaller sets, with each set referencing one or more scene ids.
6. Include English and Simplified Chinese L0/L1 content for production-quality packs.
7. Run `bun run validate:content`.
8. Run `bun run test`.
9. Run `bun run test:e2e`.
10. Run `bun run check:secrets` and `bun run build`.

The engine does not need code changes for new objects, scenes, packs, content sets, learning levels, generated image paths, or generated audio target paths.

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
2. Confirm each object is friendly, clear, age-appropriate, and not scary or noisy.
3. Confirm audio text in the pack matches the intended spoken words.
4. Run `bun run check:secrets` after build output exists.
5. Run `bun run test`, `bun run test:e2e`, and `bun run build`.

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
3. GitHub Actions runs the content validation, unit tests, browser tests, static build, and client secret scan.
4. Pushes to `main` or `master` deploy `dist` to the `word-garden` Cloudflare Pages project.

Optional Wrangler deploy:

```sh
bun run deploy:pages
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
- Little story maps to L5.

Every committed content pack includes English and Simplified Chinese L0-L5 text
for each object. The parent UI uses word-detail names instead of raw level codes.
L0-L1 keep bundled audio targets where production audio exists; higher levels
use the runtime's soft speech synthesis until matching static audio clips are
added.
