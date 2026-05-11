import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { catalog } from '../../src/content/catalog'
import {
	type AssetReference,
	LEARNING_LEVELS,
	REQUIRED_MVP_LANGUAGES,
	RuntimeCatalogSchema,
} from '../../src/content/schema'

describe('runtime catalog', () => {
	it('validates committed static content', () => {
		const parsed = RuntimeCatalogSchema.parse(catalog)

		expect(parsed.schemaVersion).toBe('2')
		expect(parsed.defaultLanguageOrder).toEqual([...REQUIRED_MVP_LANGUAGES])
		expect(parsed.supportedLanguages).toEqual([...REQUIRED_MVP_LANGUAGES])
		expect(parsed.learningLevels).toEqual([...LEARNING_LEVELS])
		expect(parsed.items.map((item) => item.id).sort()).toEqual(
			getSourceItemIds(),
		)
		expect(parsed.packs.map((pack) => pack.id).sort()).toEqual(
			getSourcePackIds(),
		)

		for (const item of parsed.items) {
			expect(
				item.variants.length,
				`${item.id} variants`,
			).toBeGreaterThanOrEqual(2)
			for (const variant of item.variants) {
				expectStaticAsset(variant.image, `${item.id}/${variant.id}`)
			}
			for (const language of REQUIRED_MVP_LANGUAGES) {
				const languageContent = item.content[language]
				expectStaticAsset(
					languageContent?.findPromptAudio,
					`${item.id}/${language}/findPrompt`,
				)
				expectStaticAsset(
					languageContent?.successPhraseAudio,
					`${item.id}/${language}/successPhrase`,
				)
				const levels = languageContent?.levels

				for (const level of LEARNING_LEVELS) {
					const content = levels?.[level]
					expect(content?.text).toBeTruthy()
					expect(content?.audioText).toBeTruthy()
					expectStaticAsset(content?.audio, `${item.id}/${language}/${level}`)
				}
			}
		}

		for (const pack of parsed.packs) {
			expect(
				pack.scenes.length,
				`${pack.id} should have multiple scenes`,
			).toBeGreaterThanOrEqual(2)
			const objectIds = new Set(pack.objects.map((object) => object.id))
			const setItemIds = new Set(pack.sets.flatMap((set) => set.itemIds))
			expect([...objectIds].sort()).toEqual([...setItemIds].sort())

			for (const set of pack.sets) {
				expect(set.itemIds.length).toBeGreaterThan(0)
				expect(set.sceneIds.length).toBeGreaterThan(0)
				for (const itemId of set.itemIds) {
					expect(objectIds.has(itemId)).toBe(true)
				}
			}

			for (const scene of pack.scenes) {
				expectStaticAsset(scene.background.asset, `${pack.id}/${scene.id}`)
				expect(
					scene.regions.length,
					`${pack.id}/${scene.id} regions`,
				).toBeGreaterThan(0)
				expect(scene.visibleObjectCount.min).toBeGreaterThan(0)
				expect(scene.visibleObjectCount.max).toBeLessThanOrEqual(
					scene.objects.length,
				)
				for (const placement of scene.objects) {
					expect(objectIds.has(placement.itemId)).toBe(true)
					expect(setItemIds.has(placement.itemId)).toBe(true)
					expect(placement.regionTags.length).toBeGreaterThan(0)
				}
			}
		}
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

function getSourcePackIds() {
	const packsDir = path.join(process.cwd(), 'content', 'packs')

	return readdirSync(packsDir)
		.filter((fileName) => fileName.endsWith('.json'))
		.map((fileName) => {
			const filePath = path.join(packsDir, fileName)
			const pack = JSON.parse(readFileSync(filePath, 'utf8')) as {
				id?: unknown
			}
			if (typeof pack.id !== 'string' || pack.id.length === 0) {
				throw new Error(`${fileName} is missing a content pack id`)
			}
			return pack.id
		})
		.sort()
}

function getSourceItemIds() {
	const itemsDir = path.join(process.cwd(), 'content', 'items')

	return readdirSync(itemsDir)
		.filter((fileName) => fileName.endsWith('.json'))
		.map((fileName) => {
			const filePath = path.join(itemsDir, fileName)
			const item = JSON.parse(readFileSync(filePath, 'utf8')) as {
				id?: unknown
			}
			if (typeof item.id !== 'string' || item.id.length === 0) {
				throw new Error(`${fileName} is missing an item id`)
			}
			return item.id
		})
		.sort()
}
