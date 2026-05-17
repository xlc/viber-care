import { describe, expect, it } from 'vitest'
import mimiPack from '../../content/story-packs/mimi-rides-the-bus.json'
import {
	ContentValidationError,
	validateStoryPacks,
} from '../../src/content/validation'

describe('story content schema validation', () => {
	it('accepts a valid story pack', () => {
		const [pack] = validateStoryPacks([mimiPack])

		expect(pack?.id).toBe('mimi-rides-the-bus')
		expect(pack?.scenes).toHaveLength(6)
		expect(pack?.items.map((item) => item.id)).toEqual([
			'bus',
			'bus-stop',
			'card',
			'seat',
			'window',
			'tree',
			'house',
			'park',
			'ball',
			'bird',
		])
	})

	it('requires English and Simplified Chinese text', () => {
		const brokenPack = clone(mimiPack)
		delete (brokenPack.scenes[0].text as Record<string, unknown>)['zh-Hans']

		expect(() => validateStoryPacks([brokenPack])).toThrow(
			ContentValidationError,
		)
		expect(() => validateStoryPacks([brokenPack])).toThrow(
			/01-bus-stop\/text is missing zh-Hans/,
		)
	})

	it('requires bilingual scene narration audio', () => {
		const brokenPack = clone(mimiPack)
		delete (brokenPack.scenes[0].narration as Record<string, unknown>).en

		expect(() => validateStoryPacks([brokenPack])).toThrow(
			/01-bus-stop\/narration is missing en audio/,
		)
	})

	it('requires scene items to reference known story items', () => {
		const brokenPack = clone(mimiPack)
		brokenPack.scenes[0].items[0].itemId = 'moon'

		expect(() => validateStoryPacks([brokenPack])).toThrow(
			/Scene "01-bus-stop" references unknown item "moon"/,
		)
	})

	it('requires items to appear in their declared scenes', () => {
		const brokenPack = clone(mimiPack)
		brokenPack.items[0].sceneIds = ['01-bus-stop']

		expect(() => validateStoryPacks([brokenPack])).toThrow(
			/declares scene "01-bus-stop" but is not placed there/,
		)
	})

	it('rejects asset paths outside the pack asset directory', () => {
		const brokenPack = clone(mimiPack)
		brokenPack.coverImage.path = '/assets/generated/other-pack/cover.jpg'

		expect(() => validateStoryPacks([brokenPack])).toThrow(
			/mimi-rides-the-bus\/cover must use a public asset path under \/assets\/generated\/mimi-rides-the-bus\//,
		)
	})

	it('rejects asset paths with traversal segments', () => {
		const brokenPack = clone(mimiPack)
		brokenPack.coverImage.path =
			'/assets/generated/mimi-rides-the-bus/../other/cover.jpg'

		expect(() => validateStoryPacks([brokenPack])).toThrow(
			/mimi-rides-the-bus\/cover must not contain path traversal/,
		)
	})
})

function clone<Value>(value: Value): Value {
	return JSON.parse(JSON.stringify(value)) as Value
}
