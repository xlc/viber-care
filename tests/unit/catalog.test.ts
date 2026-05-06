import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { catalog } from '../../src/content/catalog'
import { LEARNING_LEVELS, RuntimeCatalogSchema } from '../../src/content/schema'

describe('runtime catalog', () => {
	it('loads committed source content directly', () => {
		const parsed = RuntimeCatalogSchema.parse(catalog)

		expect(parsed.schemaVersion).toBe('1')
		expect(parsed.defaultLanguageOrder).toEqual(['en', 'zh-Hans'])
		expect(parsed.supportedLanguages).toEqual(['en', 'zh-Hans'])
		expect(parsed.learningLevels).toEqual(['L0', 'L1', 'L2', 'L3', 'L4', 'L5'])
		expect(parsed.packs.map((pack) => pack.id)).toEqual([
			'garden',
			'ocean-animals',
			'dinosaurs',
			'numbers',
			'english-alphabet',
		])
		expect(parsed.packs[0]?.objects.map((object) => object.id)).toContain('sun')
		expect(parsed.packs[1]?.objects.map((object) => object.id)).toContain(
			'whale',
		)
		expect(parsed.packs[3]?.objects.map((object) => object.id)).toContain(
			'number-one',
		)
		expect(parsed.packs[4]?.objects.map((object) => object.id)).toContain(
			'letter-z',
		)
		expect(parsed.packs[4]?.defaultSceneId).toBe('alphabet-a-e')
		expect(parsed.packs[4]?.scenes).toHaveLength(5)
		for (const scene of parsed.packs[4]?.scenes ?? []) {
			expect(scene.objects.length).toBeLessThanOrEqual(6)
		}
	})

	it('uses committed imagegen raster assets for every content image reference', () => {
		for (const pack of catalog.packs) {
			for (const scene of pack.scenes) {
				const backgroundPath = scene.background.asset?.path
				if (!backgroundPath) {
					throw new Error(
						`${pack.id}/${scene.id} is missing a background asset`,
					)
				}
				expect(backgroundPath).toMatch(
					/^\/assets\/generated\/imagegen\/.+\.(png|webp)$/,
				)
				expect(
					existsSync(
						path.join(process.cwd(), 'public', backgroundPath.slice(1)),
					),
				).toBe(true)
			}

			for (const object of pack.objects) {
				expect(object.image.path).toMatch(
					/^\/assets\/generated\/imagegen\/.+\.(png|webp)$/,
				)
				expect(
					existsSync(
						path.join(process.cwd(), 'public', object.image.path.slice(1)),
					),
				).toBe(true)
			}
		}
	})

	it('provides full bilingual learning levels for every object', () => {
		for (const pack of catalog.packs) {
			for (const object of pack.objects) {
				expect(Object.keys(object.content.en.levels)).toEqual([
					...LEARNING_LEVELS,
				])
				expect(Object.keys(object.content['zh-Hans'].levels)).toEqual([
					...LEARNING_LEVELS,
				])

				for (const level of LEARNING_LEVELS) {
					expect(object.content.en.levels[level]?.text).toBeTruthy()
					expect(object.content.en.levels[level]?.audioText).toBeTruthy()
					expect(object.content['zh-Hans'].levels[level]?.text).toBeTruthy()
					expect(
						object.content['zh-Hans'].levels[level]?.audioText,
					).toBeTruthy()
				}
			}
		}
	})
})
