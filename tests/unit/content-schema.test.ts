import { describe, expect, it } from 'vitest'
import gardenPack from '../../content/packs/garden.json'
import {
	ContentValidationError,
	validateContentPacks,
} from '../../src/content/validation'

describe('content schema validation', () => {
	it('accepts a valid content pack', () => {
		const [validatedPack] = validateContentPacks([gardenPack])

		expect(validatedPack?.id).toBe('garden')
	})

	it('reports missing MVP language content', () => {
		const brokenPack = JSON.parse(JSON.stringify(gardenPack))
		delete brokenPack.objects[0].content['zh-Hans']

		expect(() => validateContentPacks([brokenPack])).toThrow(
			ContentValidationError,
		)
		expect(() => validateContentPacks([brokenPack])).toThrow(
			/missing zh-Hans content/,
		)
	})

	it('reports missing required pack languages', () => {
		const brokenPack = JSON.parse(JSON.stringify(gardenPack))
		brokenPack.languages = ['en']

		expect(() => validateContentPacks([brokenPack])).toThrow(
			/Pack "garden" is missing zh-Hans language/,
		)
	})

	it('reports sub-packs that reference missing scenes', () => {
		const brokenPack = JSON.parse(JSON.stringify(gardenPack))
		brokenPack.subPacks = [
			{
				id: 'missing-scene-set',
				title: {
					en: 'Missing scene',
					'zh-Hans': '缺少场景',
				},
				sceneIds: ['not-a-scene'],
			},
		]

		expect(() => validateContentPacks([brokenPack])).toThrow(
			/Sub-pack "missing-scene-set" references unknown scene "not-a-scene"/,
		)
	})
})
