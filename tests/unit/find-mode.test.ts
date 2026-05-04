import { describe, expect, it } from "vitest";
import gardenPack from "../../content/packs/garden.json";
import { buildRuntimeCatalog, validateContentPacks } from "../../src/content/build-catalog";
import { createFindRound, handleFindTap } from "../../src/game/find-mode";
import { getPack } from "../../src/learning/engine";

const catalog = buildRuntimeCatalog(validateContentPacks([gardenPack]), "2026-05-04T00:00:00.000Z");
const objects = getPack(catalog).objects;

describe("Find mode target behavior", () => {
  it("celebrates the target tap", () => {
    const round = createFindRound(objects);
    const result = handleFindTap(round, round.targetObjectId);

    expect(result.isTarget).toBe(true);
    expect(result.shouldRepeatPrompt).toBe(false);
  });

  it("identifies another object positively and repeats the prompt", () => {
    const round = { targetObjectId: "duck" };
    const result = handleFindTap(round, "dog");

    expect(result.isTarget).toBe(false);
    expect(result.identifiedObjectId).toBe("dog");
    expect(result.shouldRepeatPrompt).toBe(true);
  });
});
