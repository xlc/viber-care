import { placementMatchesRegion, rectContainsPoint } from '../content/regions'
import type {
	ObjectConcept,
	ObjectVariant,
	Scene,
	SceneRegion,
	SceneRegionRect,
} from '../content/schema'

export type VisibleScenePlacement = Scene['objects'][number] & {
	object: ObjectConcept
	variant: ObjectVariant
}

type RandomSource = () => number

export function createSceneLayoutSeed(): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID()
	}
	return `${Date.now()}-${Math.random()}`
}

export function buildSceneLayout(
	scene: Scene,
	objects: ObjectConcept[],
	seed: string,
): VisibleScenePlacement[] {
	const objectMap = new Map(objects.map((object) => [object.id, object]))
	const rng = createSeededRandom(`${scene.id}:${seed}`)
	const candidates = shuffle(
		scene.objects
			.map((placement) => {
				const object = objectMap.get(placement.objectId)
				return object ? { placement, object } : null
			})
			.filter((item): item is NonNullable<typeof item> => Boolean(item)),
		rng,
	)
	const count = getVisibleObjectCount(scene, candidates.length, rng)
	const visiblePlacements: VisibleScenePlacement[] = []
	const deferredPlacements: VisibleScenePlacement[] = []

	for (const candidate of candidates) {
		const visiblePlacement = buildVisiblePlacement(scene, candidate, rng)
		if (hasRoomForPlacement(visiblePlacements, visiblePlacement)) {
			visiblePlacements.push(visiblePlacement)
		} else {
			deferredPlacements.push(visiblePlacement)
		}

		if (visiblePlacements.length === count) {
			return visiblePlacements
		}
	}

	const minCount = Math.min(scene.visibleObjectCount.min, count)
	for (const placement of deferredPlacements) {
		if (visiblePlacements.length >= minCount) {
			break
		}
		visiblePlacements.push(placement)
	}

	return visiblePlacements
}

function buildVisiblePlacement(
	scene: Scene,
	{
		placement,
		object,
	}: {
		placement: Scene['objects'][number]
		object: ObjectConcept
	},
	rng: RandomSource,
): VisibleScenePlacement {
	const region = getPlacementRegion(scene.regions, placement)
	const rect = getPlacementRect(region, placement)
	const x = jitterCoordinate(
		placement.x,
		placement.jitter?.x ?? 0,
		rect.x,
		rect.x + rect.width,
		rng,
	)
	const y = jitterCoordinate(
		placement.y,
		placement.jitter?.y ?? 0,
		rect.y,
		rect.y + rect.height,
		rng,
	)
	const variant = chooseVariant(object, rng)
	const scale = getScale(placement, variant, rng)

	return {
		...placement,
		x,
		y,
		scale,
		object,
		variant,
	}
}

function hasRoomForPlacement(
	placements: VisibleScenePlacement[],
	nextPlacement: VisibleScenePlacement,
): boolean {
	return placements.every(
		(placement) =>
			Math.abs(placement.x - nextPlacement.x) >= 18 ||
			Math.abs(placement.y - nextPlacement.y) >= 18,
	)
}

function getVisibleObjectCount(
	scene: Scene,
	candidateCount: number,
	rng: RandomSource,
): number {
	const max = Math.min(scene.visibleObjectCount.max, candidateCount)
	const min = Math.min(scene.visibleObjectCount.min, max)
	if (max <= min) {
		return max
	}
	return min + Math.floor(rng() * (max - min + 1))
}

function getPlacementRegion(
	regions: SceneRegion[],
	placement: Scene['objects'][number],
): SceneRegion {
	const matchingRegions = regions.filter((region) =>
		placementMatchesRegion(region, placement),
	)
	return (
		matchingRegions.find((region) =>
			region.rects.some((rect) =>
				rectContainsPoint(rect, placement.x, placement.y),
			),
		) ??
		matchingRegions[0] ??
		regions[0]
	)
}

function getPlacementRect(
	region: SceneRegion,
	placement: Scene['objects'][number],
): SceneRegionRect {
	return (
		region.rects.find((rect) =>
			rectContainsPoint(rect, placement.x, placement.y),
		) ?? region.rects[0]
	)
}

function jitterCoordinate(
	value: number,
	jitter: number,
	min: number,
	max: number,
	rng: RandomSource,
): number {
	const offset = jitter > 0 ? (rng() * 2 - 1) * jitter : 0
	return clamp(Number((value + offset).toFixed(2)), min, max)
}

function chooseVariant(
	object: ObjectConcept,
	rng: RandomSource,
): ObjectVariant {
	const fallbackVariant = object.variants[0]
	if (!fallbackVariant) {
		throw new Error(`Object "${object.id}" has no variants.`)
	}
	return (
		object.variants[Math.floor(rng() * object.variants.length)] ??
		fallbackVariant
	)
}

function getScale(
	placement: Scene['objects'][number],
	variant: ObjectVariant,
	rng: RandomSource,
): number {
	const baseScale = placement.scaleRange
		? placement.scaleRange.min +
			rng() * (placement.scaleRange.max - placement.scaleRange.min)
		: placement.scale
	return clamp(Number((baseScale * variant.scaleMultiplier).toFixed(3)), 0.4, 2)
}

function shuffle<Item>(items: Item[], rng: RandomSource): Item[] {
	const nextItems = [...items]
	for (let index = nextItems.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(rng() * (index + 1))
		const item = nextItems[index]
		nextItems[index] = nextItems[swapIndex]
		nextItems[swapIndex] = item
	}
	return nextItems
}

function createSeededRandom(seed: string): RandomSource {
	let hash = 2166136261
	for (let index = 0; index < seed.length; index += 1) {
		hash ^= seed.charCodeAt(index)
		hash = Math.imul(hash, 16777619)
	}
	return () => {
		hash += 0x6d2b79f5
		let value = hash
		value = Math.imul(value ^ (value >>> 15), value | 1)
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296
	}
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value))
}
