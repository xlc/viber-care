# Milestone 5: Mimi Rides the Bus Pack

## Goal

Create the first complete polished story pack: "Mimi Rides the Bus" / "米米坐公共汽车".

## Scope

- Produce one coherent bilingual story pack.
- Include cover image, scene images, item images, narration audio, item audio, and optional interaction audio.
- Use Story Mode and Card Mode to test the final content.
- Keep all assets static and committed.
- Capture authoring friction and helper needs so Milestone 4 can update the content-generation skill afterward.

## Story Direction

Theme:

- A toddler takes a bus to the park.

Learning goals:

- Common transport words.
- Simple park words.
- Basic action words.
- English and Chinese listening.

Recommended scenes:

1. Mimi sees the bus stop.
2. The bus arrives.
3. Mimi taps her card and sits down.
4. The bus moves past trees and houses.
5. Mimi gets off at the park.
6. Mimi plays and says goodbye to the bus.

Scene detail target:

1. Bus stop: Mimi waits with a small card and sees the sign.
2. Bus arrives: the bus stops slowly and the door opens.
3. Tap and sit: Mimi taps the card and sits by the window.
4. Looking out: the bus passes trees and houses.
5. Park stop: Mimi gets off near the park gate.
6. Goodbye bus: Mimi plays with a ball and waves goodbye.

Recommended items:

- Bus / 公共汽车
- Bus stop / 公共汽车站
- Card / 卡
- Seat / 座位
- Window / 窗户
- Tree / 树
- House / 房子
- Park / 公园
- Ball / 球
- Bird / 鸟

Recommended interactions:

- Tap the bus to make it move.
- Tap the card to hear a beep.
- Tap the bird to make it fly.
- Tap the ball to bounce.

Interaction limit:

- Use at most one interaction per scene.
- Keep each animation under two seconds.
- Make every interaction repeatable.

## Implementation Surface

Add:

- `content/story-packs/mimi-rides-the-bus.json`.
- `public/assets/generated/mimi-rides-the-bus/cover.*`
- `public/assets/generated/mimi-rides-the-bus/scenes/*`
- `public/assets/generated/mimi-rides-the-bus/items/*`
- `public/assets/generated/mimi-rides-the-bus/audio/*`
- Story planning and audio-script working notes only if they are useful for review and committed as source docs, not generated runtime manifests.
- Authoring notes for follow-up content-generation skill updates, if they capture concrete gaps discovered while building this pack.

Update:

- `src/content/catalog.ts`, only if new content directory imports are needed.
- `tests/unit/catalog.test.ts`
- `tests/e2e/story-card-app.spec.ts`

## Detailed Work Breakdown

### 1. Plot Plan

Create a reviewed plot plan with:

- Main character: Mimi.
- Setting: home area, bus, road, park.
- Goal: ride the bus to the park.
- Beginning, middle, ending.
- Emotional tone: calm, curious, secure.
- Vocabulary targets.
- Interaction ideas.
- Visual style guide.

### 2. Scene Writing

Scene text rules:

- One or two simple sentences per scene.
- English should sound natural and toddler-friendly.
- Chinese should be natural Simplified Chinese, not literal awkward translation.
- Repetition is allowed when it supports listening.

### 3. Vocabulary

Initial card deck:

- 8 to 10 learnable items.
- Favor concrete visible nouns.
- Avoid adding too many transport variants that look similar.
- Mark any decorative scene-only items as non-card items.

### 4. Legacy Reuse Review

Candidate old assets:

- `bus`
- `tree`
- `ball`
- `bird`

Reuse only if:

- Style matches the new Mimi pack.
- Object is clear at card size.
- Asset has no unwanted text.
- Audio text matches the new story line.

If reused, copy into `public/assets/generated/mimi-rides-the-bus/` rather than referencing legacy archive paths.

### 5. Image Generation

Visual style guide:

- Warm children's book illustration.
- Soft colors.
- Clear silhouettes.
- Consistent Mimi character design.
- No text on signs, tickets, or backgrounds unless explicitly approved.
- Calm scenes with limited clutter.

Scene images:

- Generate each scene background separately.
- Keep important tappable items large and visually separated.
- Resize and optimize before commit.

Item images:

- Generate reusable item cards/cutouts as needed.
- Use batch sheets for multiple item variants when practical.

### 6. Audio Generation

Audio script groups:

- Scene narration English.
- Scene narration Chinese.
- Item word English.
- Item word Chinese.
- Optional interaction sounds or phrases.

Review:

- Pronunciation.
- Pacing.
- Volume consistency.
- No extra words or music.

### 7. Pack Assembly

Assemble one story pack with:

- Metadata.
- Plot plan.
- Scenes.
- Items.
- Asset references.
- Audio references.
- Interaction definitions.

Run validation before UI testing.

### 8. Manual Story/Card QA

Check:

- Every scene loads.
- Scene audio matches text.
- Item audio matches tapped item.
- Card deck includes every learnable item.
- Card audio is English then Chinese.
- Language toggle changes Story Mode text/audio.
- Portrait and landscape remain readable.

### 9. Capture Workflow Lessons

Record concrete notes for Milestone 4:

- Which story planning fields were actually useful.
- Which image prompt conventions worked.
- Which OpenRouter helper changes were required.
- Which asset validation checks caught real issues.
- Which manual review steps should become skill instructions.

## Tasks

1. Execute the detailed work breakdown above in order.
2. Do not generate scenes before the plot plan is accepted.
3. Do not generate audio before the final audio script is reviewed.
4. Do not ship reused assets unless they pass the same review as new assets.
5. Leave content-generation skill improvements as notes for Milestone 4 unless a helper change is immediately required to generate this pack safely.

## Asset Review Checklist

- Images use a warm children's book illustration style.
- Objects are clear at toddler viewing size.
- Scene backgrounds are calm and uncluttered.
- No text is baked into images unless intentionally required.
- No ads, purchases, scary imagery, unsafe behavior, logos, or watermarks.
- Audio is slow, clear, warm, and language-correct.
- English and Chinese audio match the displayed content.
- Reused legacy assets feel visually consistent with newly generated story assets.

## Acceptance Criteria

- The pack has a clear beginning, middle, and ending.
- Every scene has English and Chinese text.
- Every scene has English and Chinese narration audio.
- Every tappable item has English and Chinese audio.
- Card Mode includes every important item.
- Story Mode works in either English or Chinese.
- Card Mode always displays and plays both languages.
- Legacy reuse decisions are documented in the pack review notes or commit message.
- Concrete content-generation workflow lessons are captured for Milestone 4.
- `bun run test`, `bun run test:e2e`, and `bun run build` pass.
