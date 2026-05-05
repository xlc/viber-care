import { describe, expect, it } from 'vitest'
import oceanPack from '../../content/packs/ocean-animals.json'
import type { LearningLevel } from '../../src/content/schema'
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
				'L0',
				'L1',
				'L2',
				'L3',
				'L4',
			])
			expect(Object.keys(object.content['zh-Hans'].levels)).toEqual([
				'L0',
				'L1',
				'L2',
				'L3',
				'L4',
			])
		}
	})

	it('provides Simplified Chinese romanization and generated audio targets for each included level', () => {
		const [validatedPack] = validateContentPacks([oceanPack])

		for (const object of validatedPack.objects) {
			const levels = object.content['zh-Hans'].levels as Record<
				LearningLevel,
				{ romanization?: string; audio?: { path: string } }
			>
			for (const level of ['L0', 'L1', 'L2', 'L3', 'L4'] as const) {
				expect(levels[level]?.romanization).toBeTruthy()
				expect(levels[level]?.audio?.path).toContain(
					'/assets/generated/ocean-animals/audio/',
				)
			}
		}
	})
})
