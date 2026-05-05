import { describe, expect, it } from 'vitest'
import gardenPack from '../../content/packs/garden.json'
import { ContentPackSchema } from '../../src/content/schema'
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
})
