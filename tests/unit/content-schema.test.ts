import { describe, expect, it } from 'vitest'
import englishAlphabetPack from '../../content/packs/english-alphabet.json'
import gardenPack from '../../content/packs/garden.json'
import numbersPack from '../../content/packs/numbers.json'
import { ContentPackSchema, LEARNING_LEVELS } from '../../src/content/schema'
import {
	ContentValidationError,
	validateContentPacks,
} from '../../src/content/validation'

describe('content schema validation', () => {
	it('validates the garden content pack', () => {
		const parsed = ContentPackSchema.parse(gardenPack)

		expect(parsed.id).toBe('garden')
		expect(parsed.objects).toHaveLength(10)
		expect(parsed.scenes[0]?.objects).toHaveLength(10)
	})

	it('validates the numbers and English alphabet content packs', () => {
		const [numbers, alphabet] = validateContentPacks([
			numbersPack,
			englishAlphabetPack,
		])

		expect(numbers.id).toBe('numbers')
		expect(numbers.objects).toHaveLength(10)
		expect(numbers.scenes[0]?.objects).toHaveLength(10)
		expect(numbers.objects[0]?.content.en.levels.L0.text).toBe('one')
		expect(Object.keys(numbers.objects[0]?.content.en.levels ?? {})).toEqual([
			...LEARNING_LEVELS,
		])
		expect(numbers.objects[0]?.content['zh-Hans'].levels.L0.text).toBe('一')

		expect(alphabet.id).toBe('english-alphabet')
		expect(alphabet.objects).toHaveLength(26)
		expect(alphabet.scenes[0]?.objects).toHaveLength(26)
		expect(alphabet.objects[0]?.content.en.levels.L1.text).toBe(
			'A is for apple.',
		)
		expect(Object.keys(alphabet.objects[0]?.content.en.levels ?? {})).toEqual([
			...LEARNING_LEVELS,
		])
		expect(alphabet.objects[25]?.content['zh-Hans'].levels.L0.text).toBe(
			'字母 Z',
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
})
