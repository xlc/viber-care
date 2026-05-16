import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AssetReference, StoryPack } from '../../../../src/content/schema'
import {
	ContentValidationError,
	validateStoryPacks,
} from '../../../../src/content/validation'

const MIN_AUDIO_BYTES = 4 * 1024
const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'../../../..',
)
const contentDir = path.join(repoRoot, 'content', 'story-packs')
const publicDir = path.join(repoRoot, 'public')
const generatedAssetsDir = path.join(publicDir, 'assets', 'generated')

type AssetUse = {
	asset: AssetReference
	label: string
	packId: string
}

const errors: string[] = []
const warnings: string[] = []

const packs = loadStoryPacks()
const assetUses = packs.flatMap(collectAssetUses)
const referencedFiles = new Set<string>()

for (const assetUse of assetUses) {
	validateAssetUse(assetUse, referencedFiles)
}

for (const pack of packs) {
	reportUnusedPackFiles(pack, referencedFiles)
}

if (warnings.length > 0) {
	console.warn('Story asset audit warnings:')
	for (const warning of warnings) {
		console.warn(`- ${warning}`)
	}
}

if (errors.length > 0) {
	console.error('Story asset audit failed:')
	for (const error of errors) {
		console.error(`- ${error}`)
	}
	process.exit(1)
}

console.log(
	`Story asset audit passed for ${packs.length} pack(s) and ${assetUses.length} referenced asset(s).`,
)

function loadStoryPacks(): StoryPack[] {
	const sourcePacks: unknown[] = []
	let storyPackFileCount = 0

	if (!existsSync(contentDir)) {
		errors.push('Missing content/story-packs directory.')
		return []
	}

	for (const fileName of readdirSync(contentDir).sort()) {
		if (!fileName.endsWith('.json')) {
			continue
		}

		storyPackFileCount += 1
		const filePath = path.join(contentDir, fileName)
		try {
			sourcePacks.push(JSON.parse(readFileSync(filePath, 'utf8')))
		} catch (error) {
			errors.push(
				`${path.relative(repoRoot, filePath)} is invalid JSON: ${
					error instanceof Error ? error.message : String(error)
				}`,
			)
		}
	}

	if (storyPackFileCount === 0) {
		errors.push('No story pack JSON files found in content/story-packs.')
		return []
	}
	if (sourcePacks.length === 0) {
		return []
	}

	try {
		return validateStoryPacks(sourcePacks)
	} catch (error) {
		if (error instanceof ContentValidationError) {
			errors.push(error.message)
			return []
		}
		throw error
	}
}

function collectAssetUses(pack: StoryPack): AssetUse[] {
	const assetUses: AssetUse[] = [
		{
			asset: pack.coverImage,
			label: `${pack.id}/cover`,
			packId: pack.id,
		},
	]

	for (const scene of pack.scenes) {
		assetUses.push({
			asset: scene.image,
			label: `${pack.id}/${scene.id}/image`,
			packId: pack.id,
		})

		for (const [language, asset] of Object.entries(scene.narration)) {
			assetUses.push({
				asset,
				label: `${pack.id}/${scene.id}/narration/${language}`,
				packId: pack.id,
			})
		}
	}

	for (const item of pack.items) {
		assetUses.push({
			asset: item.image,
			label: `${pack.id}/${item.id}/image`,
			packId: pack.id,
		})

		for (const [language, asset] of Object.entries(item.wordAudio)) {
			assetUses.push({
				asset,
				label: `${pack.id}/${item.id}/wordAudio/${language}`,
				packId: pack.id,
			})
		}
	}

	return assetUses
}

function validateAssetUse(
	{ asset, label, packId }: AssetUse,
	referencedFiles: Set<string>,
) {
	if (asset.path.includes('silence.wav')) {
		errors.push(`${label} references placeholder silence audio.`)
	}
	if (asset.path.includes('/story-seed/')) {
		errors.push(`${label} references removed story-seed assets.`)
	}
	if (asset.path.includes('legacy-word-garden-v2')) {
		errors.push(`${label} references the legacy archive.`)
	}
	if (!asset.path.startsWith(`/assets/generated/${packId}/`)) {
		errors.push(`${label} must live under /assets/generated/${packId}/.`)
	}

	const filePath = getPublicFilePath(asset.path)
	if (!filePath) {
		errors.push(`${label} has an invalid public asset path: ${asset.path}`)
		return
	}

	referencedFiles.add(filePath)

	if (!existsSync(filePath)) {
		errors.push(`${label} points to missing asset ${asset.path}.`)
		return
	}

	const stats = statSync(filePath)
	if (!stats.isFile()) {
		errors.push(`${label} points to a non-file asset ${asset.path}.`)
		return
	}

	if (asset.type === 'audio' || asset.type === 'sound') {
		validateAudioAsset(filePath, label, asset.path)
	}
}

function validateAudioAsset(
	filePath: string,
	label: string,
	publicPath: string,
) {
	const bytes = readFileSync(filePath)

	if (!publicPath.endsWith('.mp3')) {
		errors.push(`${label} must use an MP3 path: ${publicPath}.`)
	}
	if (bytes.length <= MIN_AUDIO_BYTES) {
		errors.push(`${label} points to tiny audio ${publicPath}.`)
	}
	if (!looksLikeMp3(bytes)) {
		errors.push(`${label} does not look like an MP3 file: ${publicPath}.`)
	}
}

function reportUnusedPackFiles(pack: StoryPack, referencedFiles: Set<string>) {
	const packAssetDir = path.join(generatedAssetsDir, pack.id)

	if (!existsSync(packAssetDir)) {
		errors.push(`Pack "${pack.id}" is missing its generated asset directory.`)
		return
	}

	for (const filePath of listFiles(packAssetDir)) {
		if (!referencedFiles.has(filePath)) {
			warnings.push(
				`Unused file in active pack directory: ${path.relative(
					repoRoot,
					filePath,
				)}`,
			)
		}
	}
}

function listFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const filePath = path.join(directory, entry.name)
		if (entry.isDirectory()) {
			return listFiles(filePath)
		}
		if (entry.isFile()) {
			return [filePath]
		}
		return []
	})
}

function getPublicFilePath(publicPath: string): string | null {
	if (!publicPath.startsWith('/assets/')) {
		return null
	}

	const filePath = path.resolve(publicDir, publicPath.slice(1))
	if (!filePath.startsWith(`${publicDir}${path.sep}`)) {
		return null
	}
	return filePath
}

function looksLikeMp3(bytes: Buffer): boolean {
	if (bytes.subarray(0, 3).toString('ascii') === 'ID3') {
		return true
	}

	for (let index = 0; index < bytes.length - 1; index += 1) {
		if (bytes[index] === 0xff && (bytes[index + 1] & 0xe0) === 0xe0) {
			return true
		}
	}

	return false
}
