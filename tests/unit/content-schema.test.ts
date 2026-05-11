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

	it('keeps math metadata optional on objects', () => {
		const packWithoutMath = JSON.parse(JSON.stringify(gardenPack))
		delete packWithoutMath.objects[0].math

		const [validatedPack] = validateContentPacks([packWithoutMath])

		expect(validatedPack?.objects[0]?.math).toBeUndefined()
	})

	it('accepts valid math metadata on objects', () => {
		const packWithMath = JSON.parse(JSON.stringify(gardenPack))
		packWithMath.objects[0].math = {
			countable: true,
			quantityRange: {
				min: 1,
				max: 3,
			},
			skills: ['counting', 'one-to-one', 'dot-match'],
			colors: ['yellow'],
			sizes: ['big', 'small'],
			sceneZones: ['water', 'pond'],
			zhMeasureWord: '只',
			englishPlural: 'ducks',
		}

		const [validatedPack] = validateContentPacks([packWithMath])

		expect(validatedPack?.objects[0]?.math?.zhMeasureWord).toBe('只')
	})

	it('reports invalid math quantity ranges', () => {
		const brokenPack = JSON.parse(JSON.stringify(gardenPack))
		brokenPack.objects[0].math = {
			countable: true,
			quantityRange: {
				min: 1,
				max: 4,
			},
			skills: ['counting'],
		}

		expect(() => validateContentPacks([brokenPack])).toThrow(/Invalid input/)
	})

	it('reports unsupported math skill names', () => {
		const brokenPack = JSON.parse(JSON.stringify(gardenPack))
		brokenPack.objects[0].math = {
			countable: true,
			quantityRange: {
				min: 1,
				max: 3,
			},
			skills: ['addition'],
		}

		expect(() => validateContentPacks([brokenPack])).toThrow(/Invalid option/)
	})

	it('reports empty math measure words', () => {
		const brokenPack = JSON.parse(JSON.stringify(gardenPack))
		brokenPack.objects[0].math = {
			countable: true,
			quantityRange: {
				min: 1,
				max: 3,
			},
			skills: ['counting'],
			zhMeasureWord: '',
		}

		expect(() => validateContentPacks([brokenPack])).toThrow(
			/Too small: expected string to have >=1 characters/,
		)
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

	it('reports objects without two variants', () => {
		const brokenPack = JSON.parse(JSON.stringify(gardenPack))
		brokenPack.objects[0].variants = [brokenPack.objects[0].variants[0]]

		expect(() => validateContentPacks([brokenPack])).toThrow(/variants/)
	})

	it('reports scene placements with missing region tags', () => {
		const brokenPack = JSON.parse(JSON.stringify(gardenPack))
		brokenPack.scenes[0].objects[0].regionTags = ['not-a-region']

		expect(() => validateContentPacks([brokenPack])).toThrow(
			/references missing region tags "not-a-region"/,
		)
	})

	it('reports scene placement anchors outside matching regions', () => {
		const brokenPack = JSON.parse(JSON.stringify(gardenPack))
		brokenPack.scenes[0].objects[0].y = 90

		expect(() => validateContentPacks([brokenPack])).toThrow(
			/anchor is outside its region/,
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
