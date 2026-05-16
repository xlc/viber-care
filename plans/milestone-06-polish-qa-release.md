# Milestone 6: Polish, QA, and Release

## Goal

Polish the story and card app after the first complete pack works end to end, then run the release gate.

## Scope

- Improve transitions and interaction feel.
- Improve mobile layout on iPhone and iPad in portrait and landscape.
- Tighten accessibility for buttons, focus, language, and mute.
- Review content quality and asset safety.
- Deploy only after completion checks pass.
- Capture any remaining release-blocking issues as follow-up plan items before deploy.

## Out Of Scope

- More story packs, unless the first pack is already accepted.
- Parent-facing pack management beyond what the first release needs.
- Progress memory beyond last selected pack/language/mode/scene.
- New story packs.

## Implementation Surface

Update:

- `src/app.tsx`
- `src/styles.css`
- `src/audio/speech.ts`
- `tests/e2e/story-card-app.spec.ts`
- `public/manifest.webmanifest`
- `public/icons/*`, only if branding changes.

Add, if useful:

- Focused responsive E2E tests for iPhone and iPad viewports.
- Focused responsive E2E tests for portrait and landscape orientation.
- A short release checklist under `docs/` if the user wants release docs.

## Detailed Work Breakdown

### 1. Responsive QA Matrix

Required viewports:

- iPhone portrait.
- iPhone landscape.
- iPad portrait.
- iPad landscape.
- Desktop sanity check.

For each viewport:

- Home screen pack cards fit.
- Story image is visible and not cropped confusingly.
- Story text does not overlap controls.
- Navigation buttons remain large.
- Card labels fit.
- Parent settings fit without hidden essential controls.

### 2. Audio QA

Check:

- No autoplay before user interaction.
- Mute suppresses scene, item, and card audio.
- Replay restarts narration predictably.
- Card Mode plays English then Chinese.
- Rapid repeated taps do not create long overlapping audio queues.

### 3. Interaction QA

Check:

- Interaction animations are slow and gentle.
- Tapping the same interactive item repeatedly works.
- Scene changes reset interaction state.
- No interaction creates a failure state or stressful feedback.

### 4. Accessibility QA

Check:

- Buttons have accessible names.
- Mute and parent settings are keyboard-accessible.
- Language toggle has clear state.
- Focus outlines remain visible.
- Images have useful alt text where exposed to assistive tech.

### 5. Static Runtime QA

Check:

- Runtime network calls do not hit AI endpoints.
- No `VITE_*` client AI key exists.
- No Cloudflare Functions are added.
- No generated runtime catalog appears under `public/`.
- No unused legacy asset directories remain under `public/`.

### 6. Release Prep

Before deploy:

- Run completion gate.
- Review build output size.
- Confirm `dist` contains only intended active assets.
- Confirm release URL after deploy.

## Tasks

1. Execute the detailed work breakdown above.
2. Fix release blockers directly.
3. Record non-blocking polish as future plan items only after the first story pack is accepted.
4. Deploy only after the completion gate passes.

## Completion Gate

```sh
bun run test
bun run test:e2e
bun run build
```

For production release:

```sh
bun run deploy
```

## Acceptance Criteria

- The app feels like a calm interactive picture book, not a quiz.
- Portrait and landscape layouts are both first-class on iPad and iPhone.
- Story Mode is complete for the first pack.
- Card Mode is complete for the first pack.
- Toddler safety rules are preserved.
- The static runtime rule is preserved.
- `dist` does not include moved legacy assets.
- Completion checks pass.
- Production deploy succeeds when release is requested.
