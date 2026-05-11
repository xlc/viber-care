import { describe, expect, it } from 'vitest'
import { catalog } from '../../src/content/catalog'
import {
	placementMatchesRegion,
	rectContainsPoint,
} from '../../src/content/regions'
import type { Scene } from '../../src/content/schema'
import { buildSceneLayout } from '../../src/game/scene-layout'
import { getPack } from '../../src/learning/engine'

const gardenPack = getPack(catalog, 'garden')
const gardenScene = gardenPack.scenes[0]

if (!gardenScene) {
	throw new Error('Test setup failed: garden scene not found')
}

describe('scene layout', () => {
	it('keeps randomized layouts stable for the same seed', () => {
		const firstLayout = buildSceneLayout(
			gardenScene,
			gardenPack.objects,
			'seed',
		)
		const secondLayout = buildSceneLayout(
			gardenScene,
			gardenPack.objects,
			'seed',
		)

		expect(snapshotLayout(firstLayout)).toEqual(snapshotLayout(secondLayout))
	})

	it('limits visible objects and keeps them inside matching regions', () => {
		const layout = buildSceneLayout(gardenScene, gardenPack.objects, 'regions')

		expect(layout.length).toBeGreaterThanOrEqual(
			gardenScene.visibleObjectCount.min,
		)
		expect(layout.length).toBeLessThanOrEqual(
			gardenScene.visibleObjectCount.max,
		)

		for (const placement of layout) {
			const matchingRegions = gardenScene.regions.filter((region) =>
				placementMatchesRegion(region, placement),
			)
			expect(
				matchingRegions.some((region) =>
					region.rects.some((rect) =>
						rectContainsPoint(rect, placement.x, placement.y),
					),
				),
			).toBe(true)
			expect(
				placement.object.variants.some(
					(variant) => variant.id === placement.variant.id,
				),
			).toBe(true)
		}
	})

	it('avoids selecting visibly crowded placements when possible', () => {
		const object = gardenPack.objects[0]
		const placement = gardenScene.objects.find(
			(candidate) => candidate.itemId === object?.id,
		)
		if (!object || !placement) {
			throw new Error('Test setup failed: object placement not found')
		}

		const scene: Scene = {
			...gardenScene,
			objects: [
				placement,
				{
					...placement,
					itemId: object.id,
					x: placement.x + 1,
					y: placement.y + 1,
				},
			],
			visibleObjectCount: {
				min: 1,
				max: 2,
			},
		}

		const layout = buildSceneLayout(scene, [object], 'spacing')

		expect(layout).toHaveLength(1)
	})
})

function snapshotLayout(layout: ReturnType<typeof buildSceneLayout>) {
	return layout.map((placement) => ({
		objectId: placement.object.id,
		variantId: placement.variant.id,
		x: placement.x,
		y: placement.y,
		scale: placement.scale,
	}))
}
