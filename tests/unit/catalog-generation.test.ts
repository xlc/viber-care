import { describe, expect, it } from "vitest";
import gardenPack from "../../content/packs/garden.json";
import { buildRuntimeCatalog, validateContentPacks } from "../../src/content/build-catalog";
import { RuntimeCatalogSchema } from "../../src/content/schema";

describe("catalog generation", () => {
  it("builds a static runtime catalog from raw packs", () => {
    const packs = validateContentPacks([gardenPack]);
    const catalog = buildRuntimeCatalog(packs, "2026-05-04T00:00:00.000Z");
    const parsed = RuntimeCatalogSchema.parse(catalog);

    expect(parsed.schemaVersion).toBe("1");
    expect(parsed.defaultLanguageOrder).toEqual(["en", "zh-Hans"]);
    expect(parsed.supportedLanguages).toContain("ko");
    expect(parsed.learningLevels).toEqual(["L0", "L1", "L2", "L3", "L4", "L5"]);
    expect(parsed.packs[0]?.objects.map((object) => object.id)).toContain("duck");
  });
});
