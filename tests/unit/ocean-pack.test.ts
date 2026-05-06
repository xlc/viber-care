import { describe, expect, it } from 'vitest'
import oceanPack from '../../content/packs/ocean-animals.json'
import { LEARNING_LEVELS, type LearningLevel } from '../../src/content/schema'
import { validateContentPacks } from '../../src/content/validation'

describe('ocean animals content pack', () => {
	it('contains the requested scene, object count, languages, and levels', () => {
		const [validatedPack] = validateContentPacks([oceanPack])

		expect(validatedPack.id).toBe('ocean-animals')
		expect(validatedPack.scenes).toHaveLength(1)
		expect(validatedPack.scenes[0]?.id).toBe('ocean-cove')
		expect(validatedPack.objects).toHaveLength(10)
		expect(validatedPack.languages).toEqual(['en', 'zh-Hans'])

		for (const object of validatedPack.objects) {
			expect(Object.keys(object.content.en.levels)).toEqual([
				...LEARNING_LEVELS,
			])
			expect(Object.keys(object.content['zh-Hans'].levels)).toEqual([
				...LEARNING_LEVELS,
			])
		}
	})

	it('keeps existing generated audio targets', () => {
		const [validatedPack] = validateContentPacks([oceanPack])

		for (const object of validatedPack.objects) {
			const levels = object.content['zh-Hans'].levels as Record<
				LearningLevel,
				{ audio?: { path: string } }
			>
			for (const level of LEARNING_LEVELS) {
				if (level !== 'L5') {
					expect(levels[level]?.audio?.path).toContain(
						'/assets/generated/ocean-animals/audio/',
					)
				}
			}
		}
	})
})
