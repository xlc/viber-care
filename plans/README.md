# Plans

Active implementation plans for the Word Garden toddler story and card refactor.

## Active Plan

- [Toddler Story and Card Refactor](./toddler-story-card-refactor.md)
- [Plan Validation](./story-card-refactor-validation.md)

## Milestones

1. [Milestone 1: Static Story App Shell](./milestone-01-static-story-app-shell.md)
2. [Milestone 2: Story Mode Foundation](./milestone-02-story-mode-foundation.md)
3. [Milestone 3: Card Mode Foundation](./milestone-03-card-mode-foundation.md)
4. [Milestone 5: Mimi Rides the Bus Pack](./milestone-05-mimi-rides-the-bus-pack.md)
5. [Milestone 4: Story Pack Authoring Workflow](./milestone-04-story-pack-authoring-workflow.md)
6. [Milestone 6: Polish, QA, and Release](./milestone-06-polish-qa-release.md)

## Implementation Notes

- [Mimi Rides the Bus Authoring Notes](./mimi-rides-the-bus-authoring-notes.md)

## Planning Rules

- Treat the refactor as intentionally breaking.
- Keep the runtime static-only.
- Keep English and Simplified Chinese as the only supported product languages.
- Keep generated content and assets committed under `content/` and `public/assets/`.
- Do not preserve Explore, Find, Puzzle, Math Play, or L0-L5 learning-level behavior unless a milestone explicitly reintroduces it.
- Move existing vocabulary pack JSON out of the active catalog and reuse prior content/assets manually when they fit the new story pack.
- Move non-reused legacy generated assets out of `public/` so they are not shipped in the static build.
- Support both portrait and landscape layouts for iPad and iPhone.
