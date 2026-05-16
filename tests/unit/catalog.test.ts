import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { catalog } from '../../src/content/catalog'
import {
	type AssetReference,
	REQUIRED_STORY_LANGUAGES,
	StoryCatalogSchema,
} from '../../src/content/schema'

describe('story runtime catalog', () => {
	it('imports only committed story packs and static assets', () => {
		const parsed = StoryCatalogSchema.parse(catalog)

		expect(parsed.schemaVersion).toBe('story-pack-v1')
		expect(parsed.supportedLanguages).toEqual([...REQUIRED_STORY_LANGUAGES])
		expect(parsed.packs.map((pack) => pack.id).sort()).toEqual(
			getSourceStoryPackIds(),
		)

		for (const pack of parsed.packs) {
			expectStaticAsset(pack.coverImage, `${pack.id}/cover`)
			expect(pack.scenes.length).toBeGreaterThanOrEqual(2)

			const itemIds = new Set(pack.items.map((item) => item.id))
			for (const scene of pack.scenes) {
				expectStaticAsset(scene.image, `${pack.id}/${scene.id}`)
				for (const language of REQUIRED_STORY_LANGUAGES) {
					expect(scene.text[language]).toBeTruthy()
					expectStaticAsset(
						scene.narration[language],
						`${pack.id}/${scene.id}/${language}`,
					)
				}
				for (const sceneItem of scene.items) {
					expect(itemIds.has(sceneItem.itemId)).toBe(true)
				}
			}

			for (const item of pack.items) {
				expectStaticAsset(item.image, `${pack.id}/${item.id}`)
				for (const language of REQUIRED_STORY_LANGUAGES) {
					expect(item.name[language]).toBeTruthy()
					expectStaticAsset(
						item.wordAudio[language],
						`${pack.id}/${item.id}/${language}`,
					)
				}
			}
		}
	})

	it('does not import legacy content as active story packs', () => {
		expect(catalog.packs.map((pack) => pack.id)).toEqual(['story-seed'])
		expect(existsSync(path.join(process.cwd(), 'content', 'items'))).toBe(false)
		expect(existsSync(path.join(process.cwd(), 'content', 'packs'))).toBe(false)
	})
})

function expectStaticAsset(asset: AssetReference | undefined, label: string) {
	if (!asset) {
		throw new Error(`${label} is missing a static asset`)
	}

	expect(
		asset.path.startsWith('/assets/'),
		`${label} must use a public /assets/ path`,
	).toBe(true)
	expect(
		existsSync(path.join(process.cwd(), 'public', asset.path.slice(1))),
		`${label} points to missing asset ${asset.path}`,
	).toBe(true)
}

function getSourceStoryPackIds() {
	const packsDir = path.join(process.cwd(), 'content', 'story-packs')

	return readdirSync(packsDir)
		.filter((fileName) => fileName.endsWith('.json'))
		.map((fileName) => {
			const filePath = path.join(packsDir, fileName)
			const pack = JSON.parse(readFileSync(filePath, 'utf8')) as {
				id?: unknown
			}
			if (typeof pack.id !== 'string' || pack.id.length === 0) {
				throw new Error(`${fileName} is missing a story pack id`)
			}
			return pack.id
		})
		.sort()
}
