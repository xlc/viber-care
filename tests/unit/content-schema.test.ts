import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import gardenPack from '../../content/packs/garden.json'
import {
	ContentValidationError,
	validateContentCatalog,
} from '../../src/content/validation'

const sourceItems = getSourceItems()

describe('content schema validation', () => {
	it('accepts a valid content catalog slice', () => {
		const { packs } = validateContentCatalog(sourceItems, [gardenPack])

		expect(packs[0]?.id).toBe('garden')
		expect(packs[0]?.objects.length).toBeGreaterThan(0)
	})

	it('keeps math metadata optional on items', () => {
		const items = clone(sourceItems)
		delete items[0].math

		const { items: validatedItems } = validateContentCatalog(items, [
			gardenPack,
		])

		expect(validatedItems[0]?.math).toBeUndefined()
	})

	it('accepts valid math metadata on items', () => {
		const items = clone(sourceItems)
		items[0].math = {
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

		const { items: validatedItems } = validateContentCatalog(items, [
			gardenPack,
		])

		expect(validatedItems[0]?.math?.zhMeasureWord).toBe('只')
	})

	it('reports invalid math quantity ranges', () => {
		const items = clone(sourceItems)
		items[0].math = {
			countable: true,
			quantityRange: {
				min: 1,
				max: 4,
			},
			skills: ['counting'],
		}

		expect(() => validateContentCatalog(items, [gardenPack])).toThrow(
			/Invalid input/,
		)
	})

	it('reports unsupported math skill names', () => {
		const items = clone(sourceItems)
		items[0].math = {
			countable: true,
			quantityRange: {
				min: 1,
				max: 3,
			},
			skills: ['addition'],
		}

		expect(() => validateContentCatalog(items, [gardenPack])).toThrow(
			/Invalid option/,
		)
	})

	it('reports empty math measure words', () => {
		const items = clone(sourceItems)
		items[0].math = {
			countable: true,
			quantityRange: {
				min: 1,
				max: 3,
			},
			skills: ['counting'],
			zhMeasureWord: '',
		}

		expect(() => validateContentCatalog(items, [gardenPack])).toThrow(
			/Too small: expected string to have >=1 characters/,
		)
	})

	it('reports missing MVP language content', () => {
		const items = clone(sourceItems)
		delete items[0].content['zh-Hans']

		expect(() => validateContentCatalog(items, [gardenPack])).toThrow(
			ContentValidationError,
		)
		expect(() => validateContentCatalog(items, [gardenPack])).toThrow(
			/missing zh-Hans content/,
		)
	})

	it('reports missing required pack languages', () => {
		const brokenPack = clone(gardenPack)
		brokenPack.languages = ['en']

		expect(() => validateContentCatalog(sourceItems, [brokenPack])).toThrow(
			/Pack "garden" is missing zh-Hans language/,
		)
	})

	it('reports items without two variants', () => {
		const items = clone(sourceItems)
		items[0].variants = [items[0].variants[0]]

		expect(() => validateContentCatalog(items, [gardenPack])).toThrow(
			/variants/,
		)
	})

	it('reports scene placements with missing region tags', () => {
		const brokenPack = clone(gardenPack)
		brokenPack.scenes[0].objects[0].regionTags = ['not-a-region']

		expect(() => validateContentCatalog(sourceItems, [brokenPack])).toThrow(
			/references missing region tags "not-a-region"/,
		)
	})

	it('reports scene placement anchors outside matching regions', () => {
		const brokenPack = clone(gardenPack)
		brokenPack.scenes[0].objects[0].y = 90

		expect(() => validateContentCatalog(sourceItems, [brokenPack])).toThrow(
			/anchor is outside its region/,
		)
	})

	it('reports sets that reference missing scenes', () => {
		const brokenPack = clone(gardenPack)
		brokenPack.sets = [
			{
				id: 'missing-scene-set',
				title: {
					en: 'Missing scene',
					'zh-Hans': '缺少场景',
				},
				itemIds: ['duck'],
				sceneIds: ['not-a-scene'],
			},
		]

		expect(() => validateContentCatalog(sourceItems, [brokenPack])).toThrow(
			/Set "missing-scene-set" references unknown scene "not-a-scene"/,
		)
	})

	it('reports sets that expose scenes without their items', () => {
		const brokenPack = clone(gardenPack)
		const scene = brokenPack.scenes[0]
		const placement = scene.objects[0]
		if (!placement) {
			throw new Error('Test setup failed: scene has no placements')
		}
		brokenPack.sets = [
			{
				id: 'incomplete-set',
				title: {
					en: 'Incomplete set',
					'zh-Hans': '不完整集合',
				},
				itemIds: ['duck'],
				sceneIds: [scene.id],
			},
		]

		expect(() => validateContentCatalog(sourceItems, [brokenPack])).toThrow(
			`Set "incomplete-set" includes scene "${scene.id}" but is missing item "${placement.itemId}".`,
		)
	})
})

function getSourceItems() {
	const itemsDir = path.join(process.cwd(), 'content', 'items')

	return readdirSync(itemsDir)
		.filter((fileName) => fileName.endsWith('.json'))
		.map((fileName) =>
			JSON.parse(readFileSync(path.join(itemsDir, fileName), 'utf8')),
		)
}

function clone<Value>(value: Value): Value {
	return JSON.parse(JSON.stringify(value)) as Value
}
