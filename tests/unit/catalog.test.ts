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

		expect(parsed.schemaVersion).toBe('1')
		expect(parsed.defaultLanguageOrder).toEqual([...REQUIRED_MVP_LANGUAGES])
		expect(parsed.supportedLanguages).toEqual([...REQUIRED_MVP_LANGUAGES])
		expect(parsed.learningLevels).toEqual([...LEARNING_LEVELS])
		expect(parsed.packs.map((pack) => pack.id).sort()).toEqual(
			getSourcePackIds(),
		)

		for (const pack of parsed.packs) {
			const objectIds = new Set(pack.objects.map((object) => object.id))

			for (const scene of pack.scenes) {
				expectStaticAsset(scene.background.asset, `${pack.id}/${scene.id}`)
				for (const placement of scene.objects) {
					expect(objectIds.has(placement.objectId)).toBe(true)
				}
			}

			for (const object of pack.objects) {
				expectStaticAsset(object.image, `${pack.id}/${object.id}`)
				for (const language of REQUIRED_MVP_LANGUAGES) {
					const levels = object.content[language]?.levels

					for (const level of LEARNING_LEVELS) {
						const content = levels?.[level]
						expect(content?.text).toBeTruthy()
						expect(content?.audioText).toBeTruthy()
						if (content?.audio) {
							expectStaticAsset(
								content.audio,
								`${pack.id}/${object.id}/${language}/${level}`,
							)
						}
					}
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
