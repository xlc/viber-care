import { describe, expect, it } from 'vitest'
import storySeed from '../../content/story-packs/story-seed.json'
import {
	ContentValidationError,
	validateStoryPacks,
} from '../../src/content/validation'

describe('story content schema validation', () => {
	it('accepts a valid story pack', () => {
		const [pack] = validateStoryPacks([storySeed])

		expect(pack?.id).toBe('story-seed')
		expect(pack?.scenes).toHaveLength(2)
		expect(pack?.items.map((item) => item.id)).toEqual(['bus', 'flower'])
	})

	it('requires English and Simplified Chinese text', () => {
		const brokenPack = clone(storySeed)
		delete (brokenPack.scenes[0].text as Record<string, unknown>)['zh-Hans']

		expect(() => validateStoryPacks([brokenPack])).toThrow(
			ContentValidationError,
		)
		expect(() => validateStoryPacks([brokenPack])).toThrow(
			/bus-arrives\/text is missing zh-Hans/,
		)
	})

	it('requires bilingual scene narration audio', () => {
		const brokenPack = clone(storySeed)
		delete (brokenPack.scenes[0].narration as Record<string, unknown>).en

		expect(() => validateStoryPacks([brokenPack])).toThrow(
			/bus-arrives\/narration is missing en audio/,
		)
	})

	it('requires scene items to reference known story items', () => {
		const brokenPack = clone(storySeed)
		brokenPack.scenes[0].items[0].itemId = 'moon'

		expect(() => validateStoryPacks([brokenPack])).toThrow(
			/Scene "bus-arrives" references unknown item "moon"/,
		)
	})

	it('requires items to appear in their declared scenes', () => {
		const brokenPack = clone(storySeed)
		brokenPack.items[0].sceneIds = ['garden-hello']

		expect(() => validateStoryPacks([brokenPack])).toThrow(
			/declares scene "garden-hello" but is not placed there/,
		)
	})

	it('rejects asset paths outside public assets', () => {
		const brokenPack = clone(storySeed)
		brokenPack.coverImage.path = '/legacy/cover.svg'

		expect(() => validateStoryPacks([brokenPack])).toThrow(
			/story-seed\/cover must use a public \/assets\/ path/,
		)
	})
})

function clone<Value>(value: Value): Value {
	return JSON.parse(JSON.stringify(value)) as Value
}
