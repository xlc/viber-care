import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  buildRuntimeCatalog,
  validateContentPacks
} from "../src/content/build-catalog";
import type { AssetReference, ContentPack, RuntimeCatalog } from "../src/content/schema";

const rootDir = process.cwd();
const contentDir = join(rootDir, "content", "packs");
const publicDir = join(rootDir, "public");
const manifestPath = join(publicDir, "assets", "generated", "asset-manifest.json");

type AssetManifestEntry = {
  path: string;
  type: AssetReference["type"];
  source: "placeholder-svg" | "placeholder-audio";
  reviewRequired: boolean;
  warning?: string;
};

async function readContentPacks(): Promise<ContentPack[]> {
  const entries = await readdir(contentDir, { withFileTypes: true });
  const packFiles = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => [".json", ".yaml", ".yml"].includes(extname(name)))
    .sort();

  const rawPacks: unknown[] = [];
  for (const fileName of packFiles) {
    const filePath = join(contentDir, fileName);
    const raw = await readFile(filePath, "utf8");
    rawPacks.push(extname(fileName) === ".json" ? JSON.parse(raw) : parseYaml(raw));
  }

  return validateContentPacks(rawPacks);
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function objectSvg(asset: AssetReference, index: number): string {
  const label = escapeXml(asset.placeholder?.label ?? asset.alt ?? "object");
  const emoji = escapeXml(asset.placeholder?.emoji ?? "🌊");
  const hues = ["#7dd3fc", "#6ee7b7", "#f9a8d4", "#fde68a", "#a5b4fc", "#fdba74"];
  const accent = hues[index % hues.length] ?? "#7dd3fc";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="${label}">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#174052" flood-opacity="0.16"/>
    </filter>
  </defs>
  <circle cx="128" cy="128" r="104" fill="#fffdf8" opacity="0.95" filter="url(#shadow)"/>
  <circle cx="128" cy="128" r="80" fill="${accent}" opacity="0.24"/>
  <text x="128" y="136" text-anchor="middle" dominant-baseline="middle" font-size="104">${emoji}</text>
</svg>`;
}

function oceanBackgroundSvg(asset: AssetReference): string {
  const label = escapeXml(asset.alt ?? asset.placeholder?.label ?? "Ocean scene");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="water" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#7dd3fc"/>
      <stop offset="48%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0f766e"/>
    </linearGradient>
    <linearGradient id="sand" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#fde68a"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
  </defs>
  <rect width="1440" height="900" fill="url(#water)"/>
  <path d="M0 165 C170 120 270 210 430 166 C610 116 720 206 900 160 C1080 116 1230 175 1440 140 L1440 0 L0 0 Z" fill="#dff8ff" opacity="0.42"/>
  <path d="M0 655 C180 596 340 690 520 632 C700 574 900 676 1060 622 C1210 572 1300 612 1440 590 L1440 900 L0 900 Z" fill="url(#sand)"/>
  <path d="M0 345 C185 305 300 385 480 342 C675 294 790 376 970 334 C1160 288 1270 344 1440 312" fill="none" stroke="#e0f7ff" stroke-width="18" stroke-linecap="round" opacity="0.4"/>
  <path d="M80 760 C200 720 285 790 410 746 C545 700 650 770 775 732 C915 690 1055 760 1250 720" fill="none" stroke="#fff7d6" stroke-width="22" stroke-linecap="round" opacity="0.52"/>
  <circle cx="200" cy="260" r="22" fill="#e0f7ff" opacity="0.58"/>
  <circle cx="250" cy="215" r="12" fill="#e0f7ff" opacity="0.52"/>
  <circle cx="1040" cy="250" r="18" fill="#e0f7ff" opacity="0.5"/>
  <circle cx="1095" cy="205" r="10" fill="#e0f7ff" opacity="0.48"/>
  <path d="M112 710 C130 658 158 658 176 710 C158 694 130 694 112 710Z" fill="#34d399" opacity="0.8"/>
  <path d="M1220 716 C1240 654 1274 654 1294 716 C1274 696 1240 696 1220 716Z" fill="#34d399" opacity="0.78"/>
</svg>`;
}

function gardenBackgroundSvg(asset: AssetReference): string {
  const label = escapeXml(asset.alt ?? asset.placeholder?.label ?? "Garden scene");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#8bd3dd"/>
      <stop offset="72%" stop-color="#c8f2e4"/>
      <stop offset="100%" stop-color="#f8f4a6"/>
    </linearGradient>
    <linearGradient id="grass" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#8ee071"/>
      <stop offset="100%" stop-color="#34a853"/>
    </linearGradient>
  </defs>
  <rect width="1440" height="900" fill="url(#sky)"/>
  <circle cx="1200" cy="130" r="76" fill="#ffd166"/>
  <circle cx="1200" cy="130" r="116" fill="#ffd166" opacity="0.2"/>
  <path d="M0 470 C210 380 392 450 560 385 C760 310 940 430 1140 360 C1260 320 1350 340 1440 310 L1440 900 L0 900 Z" fill="#70cf6b"/>
  <path d="M0 570 C190 510 380 590 560 525 C780 446 990 572 1440 475 L1440 900 L0 900 Z" fill="url(#grass)"/>
  <ellipse cx="690" cy="720" rx="230" ry="86" fill="#6ec6ff" opacity="0.78"/>
  <ellipse cx="690" cy="710" rx="190" ry="54" fill="#9ee7ff" opacity="0.72"/>
  <path d="M70 685 C240 635 315 740 500 690 C620 660 720 680 820 720 C940 768 1100 690 1360 735 L1440 900 L0 900 Z" fill="#2f9f5d" opacity="0.45"/>
</svg>`;
}

function backgroundSvg(asset: AssetReference): string {
  const prompt = `${asset.generationPrompt ?? ""} ${asset.alt ?? ""}`.toLowerCase();
  return prompt.includes("ocean") || prompt.includes("sea")
    ? oceanBackgroundSvg(asset)
    : gardenBackgroundSvg(asset);
}

function createWavTone(frequency = 523.25, durationSeconds = 0.38): Buffer {
  const sampleRate = 24_000;
  const samples = Math.floor(sampleRate * durationSeconds);
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < samples; index += 1) {
    const progress = index / samples;
    const fade = Math.sin(Math.PI * progress);
    const sample = Math.sin((2 * Math.PI * frequency * index) / sampleRate) * fade * 0.08;
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + index * 2);
  }

  return buffer;
}

function collectAssets(catalog: RuntimeCatalog): AssetReference[] {
  const assets: AssetReference[] = [];
  for (const pack of catalog.packs) {
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
  }

  return assets.filter(
    (asset, index, allAssets) => allAssets.findIndex((candidate) => candidate.path === asset.path) === index
  );
}

async function writeAsset(asset: AssetReference, index: number): Promise<AssetManifestEntry | null> {
  if (!asset.path.startsWith("/assets/generated/")) {
    return null;
  }

  const outputPath = join(publicDir, asset.path.slice(1));
  await mkdir(dirname(outputPath), { recursive: true });

  if (asset.type === "image" || asset.type === "background") {
    await writeFile(outputPath, asset.type === "background" ? backgroundSvg(asset) : objectSvg(asset, index), "utf8");
    return {
      path: asset.path,
      type: asset.type,
      source: "placeholder-svg",
      reviewRequired: true,
      warning: "Placeholder SVG generated from content metadata; review or replace with final art."
    };
  }

  if (asset.type === "audio" || asset.type === "sound" || asset.type === "music") {
    await writeFile(outputPath, createWavTone(420 + (index % 9) * 32));
    return {
      path: asset.path,
      type: asset.type,
      source: "placeholder-audio",
      reviewRequired: true,
      warning: "Placeholder audio generated because real TTS was unavailable."
    };
  }

  return null;
}

async function main() {
  const packs = await readContentPacks();
  const catalog = buildRuntimeCatalog(packs);
  const assets = collectAssets(catalog);
  const entries = await Promise.all(assets.map((asset, index) => writeAsset(asset, index)));
  const manifest = {
    generatedAt: new Date().toISOString(),
    entries: entries.filter((entry): entry is AssetManifestEntry => Boolean(entry))
  };

  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(
    `Generated ${manifest.entries.length} asset(s) under ${join(publicDir, "assets", "generated")}.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
