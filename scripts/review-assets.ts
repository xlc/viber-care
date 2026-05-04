import { readFile, stat, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { RuntimeCatalogSchema, type AssetReference, type RuntimeCatalog } from "../src/content/schema";

const rootDir = process.cwd();
const publicDir = join(rootDir, "public");
const catalogPath = join(publicDir, "catalog.generated.json");
const manifestPath = join(publicDir, "assets", "generated", "asset-manifest.json");
const reviewJsonPath = join(publicDir, "assets", "generated", "review.json");
const reviewHtmlPath = join(publicDir, "assets", "generated", "review.html");

type ManifestEntry = {
  path: string;
  type: AssetReference["type"];
  source: string;
  reviewRequired: boolean;
  warning?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function collectPackAssets(pack: RuntimeCatalog["packs"][number]): AssetReference[] {
  const assets: AssetReference[] = [];
  for (const scene of pack.scenes) {
    if (scene.background.asset) {
      assets.push(scene.background.asset);
    }
    if (scene.music?.asset) {
      assets.push(scene.music.asset);
    }
  }
  for (const object of pack.objects) {
    assets.push(object.image);
    if (object.interaction.soundEffect) {
      assets.push(object.interaction.soundEffect);
    }
    for (const languageContent of Object.values(object.content)) {
      for (const levelContent of Object.values(languageContent.levels)) {
        if (levelContent.audio) {
          assets.push(levelContent.audio);
        }
      }
    }
  }

  return assets.filter(
    (asset, index, allAssets) => allAssets.findIndex((candidate) => candidate.path === asset.path) === index
  );
}

async function exists(publicPath: string): Promise<boolean> {
  try {
    await stat(join(publicDir, publicPath.slice(1)));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const catalog = RuntimeCatalogSchema.parse(JSON.parse(await readFile(catalogPath, "utf8")));
  const manifest = JSON.parse(await readFile(manifestPath, "utf8").catch(() => "{\"entries\":[]}")) as {
    entries: ManifestEntry[];
  };
  const manifestByPath = new Map(manifest.entries.map((entry) => [entry.path, entry]));

  const reviewPacks = [];
  for (const pack of catalog.packs) {
    const assets = await Promise.all(
      collectPackAssets(pack).map(async (asset) => {
        const manifestEntry = manifestByPath.get(asset.path);
        const present = await exists(asset.path);
        const warnings = [
          present ? null : "Missing generated asset file.",
          manifestEntry?.warning,
          asset.type === "sound" ? "Procedural or generated SFX should be reviewed for softness." : null
        ].filter((warning): warning is string => Boolean(warning));

        return {
          path: asset.path,
          type: asset.type,
          source: manifestEntry?.source ?? "unknown",
          present,
          reviewRequired: Boolean(manifestEntry?.reviewRequired || warnings.length > 0),
          warnings
        };
      })
    );

    reviewPacks.push({
      id: pack.id,
      title: pack.title.en ?? pack.id,
      sceneIds: pack.scenes.map((scene) => scene.id),
      objectIds: pack.objects.map((object) => object.id),
      assets
    });
  }

  const review = {
    generatedAt: new Date().toISOString(),
    packs: reviewPacks,
    warningCount: reviewPacks.reduce(
      (count, pack) => count + pack.assets.reduce((inner, asset) => inner + asset.warnings.length, 0),
      0
    )
  };

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Word Garden Asset Review</title>
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; color: #17323a; background: #eef9fb; }
      main { max-width: 1160px; margin: 0 auto; padding: 24px; }
      h1, h2, h3, p { margin: 0; }
      h1 { font-size: 2rem; margin-bottom: 10px; }
      section { margin-top: 22px; padding: 18px; background: #fffdf8; border: 1px solid rgba(23,50,58,.12); border-radius: 8px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; margin-top: 16px; }
      .asset { display: grid; gap: 8px; padding: 12px; border: 1px solid rgba(23,50,58,.12); border-radius: 8px; background: white; }
      img { width: 100%; aspect-ratio: 1; object-fit: contain; background: #e0f7ff; border-radius: 8px; }
      code { overflow-wrap: anywhere; font-size: .78rem; }
      audio { width: 100%; }
      .warning { color: #8a4b00; font-weight: 700; font-size: .86rem; }
      .meta { color: #54707a; font-size: .9rem; }
    </style>
  </head>
  <body>
    <main>
      <h1>Word Garden Asset Review</h1>
      <p class="meta">${review.warningCount} review warning(s). Generated ${escapeHtml(review.generatedAt)}.</p>
      ${review.packs
        .map(
          (pack) => `<section>
        <h2>${escapeHtml(pack.title)} <span class="meta">(${escapeHtml(pack.id)})</span></h2>
        <p class="meta">Scenes: ${pack.sceneIds.map(escapeHtml).join(", ")}. Objects: ${pack.objectIds
          .map(escapeHtml)
          .join(", ")}.</p>
        <div class="grid">
          ${pack.assets
            .map((asset) => {
              const preview =
                asset.type === "image" || asset.type === "background"
                  ? `<img src="${escapeHtml(asset.path)}" alt="" />`
                  : `<audio controls src="${escapeHtml(asset.path)}"></audio>`;
              return `<article class="asset">
              ${preview}
              <code>${escapeHtml(asset.path)}</code>
              <p class="meta">${escapeHtml(asset.type)} · ${escapeHtml(asset.source)} · ${
                asset.present ? "present" : "missing"
              }</p>
              ${asset.warnings.map((warning) => `<p class="warning">${escapeHtml(warning)}</p>`).join("")}
            </article>`;
            })
            .join("")}
        </div>
      </section>`
        )
        .join("")}
    </main>
  </body>
</html>`;

  await mkdir(dirname(reviewJsonPath), { recursive: true });
  await writeFile(reviewJsonPath, `${JSON.stringify(review, null, 2)}\n`, "utf8");
  await writeFile(reviewHtmlPath, html, "utf8");
  console.log(`Wrote ${reviewHtmlPath}`);
  console.log(`Review warnings: ${review.warningCount}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
