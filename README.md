# Word Garden

Word Garden is a static PWA game for toddlers to learn objects and words in a gentle bilingual garden scene. The MVP supports English and Simplified Chinese, Explore mode, Find mode, a Story-mode placeholder, one garden pack, 10 objects, and runtime fallbacks for L2-L5.

## Commands

Use Bun for package management and scripts.

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

## Local Development

Generate assets and the runtime catalog before opening the app if they have not been generated yet:

```sh
bun run generate:assets
bun run build:catalog
bun run dev
```

The app loads only `/catalog.generated.json` at runtime. Raw content stays in `content/packs/*.json` or `content/packs/*.yaml`.

## Content Packs

To add a content pack:

1. Add a JSON or YAML pack under `content/packs/`.
2. Follow the Zod schemas in `src/content/schema.ts`.
3. Include scene placements with percentage-based positions.
4. Include image asset paths and generation prompts for each object.
5. Include English and Simplified Chinese L0/L1 content for MVP-quality packs.
6. Run `bun run validate:content`.
7. Run `bun run generate:assets`.
8. Run `bun run build:catalog` and review `public/catalog.generated.json`.
9. Run `bun run review:assets` and review `public/assets/generated/review.html`.

The engine does not need code changes for new objects, scenes, packs, language codes already supported by the schema, learning levels, generated image paths, or generated audio target paths.

## Assets

This repository currently uses generated SVG and WAV placeholder assets when no asset-generation API key is available. Placeholder assets are produced from content metadata by:

```sh
bun run generate:assets
```

For production art, generate and review image/audio assets locally or in a secure CI job, place the static files under `public/assets/`, update the pack asset paths if needed, then commit the bundled assets and regenerated catalog. The current asset script generates local placeholders only, so the normal static runtime does not need any secret or network access.

Review assets before deployment:

1. Check the visual files under `public/assets/generated/` or replacement production paths.
2. Confirm each object is friendly, clear, age-appropriate, and not scary or noisy.
3. Confirm audio text in the pack matches the intended spoken words.
4. Run `bun run check:secrets` after build output exists.
5. Run `bun run review:assets` and open `public/assets/generated/review.html`.

## Cloudflare Pages

Deployment target: Cloudflare Pages static hosting.

- Build command: `bun run build`
- Build output directory: `dist`
- Runtime: static-only
- Backend: none
- Cloudflare Functions: none

Environment variables:

- `BUN_VERSION`: optional
Recommended production flow:

1. Generate and review assets locally or in a secure CI job.
2. Commit bundled generated assets.
3. Cloudflare Pages runs `bun run build` and deploys `dist`.

Optional Wrangler deploy:

```sh
bunx wrangler pages deploy dist
```

`public/_headers` gives long cache headers to static assets and `no-store` to `catalog.generated.json`. `public/_redirects` supports static app routing.

## Runtime Safety

- No ads.
- No purchases.
- No analytics by default.
- No runtime AI calls.
- No client secrets.
- No autoplay audio before user interaction.
- Settings are stored only in `localStorage`.
- The app does not load remote content.

## Learning Levels

- L0: single word
- L1: word plus sound/action phrase
- L2: short phrase
- L3: simple sentence
- L4: question/answer
- L5: mini story or guided sequence

The garden pack has real L0 and L1 text/audio targets for English and Simplified Chinese. L2-L5 are supported by schema and runtime fallback behavior.
