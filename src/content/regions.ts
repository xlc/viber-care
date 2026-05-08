import type { Scene, SceneRegion, SceneRegionRect } from './schema'

function regionHasTag(region: SceneRegion, tag: string): boolean {
	return region.id === tag || region.tags.includes(tag)
}

export function placementMatchesRegion(
	region: SceneRegion,
	placement: Scene['objects'][number],
): boolean {
	return placement.regionTags.some((tag) => regionHasTag(region, tag))
}

export function rectContainsPoint(
	rect: SceneRegionRect,
	x: number,
	y: number,
): boolean {
	return (
		x >= rect.x &&
		x <= rect.x + rect.width &&
		y >= rect.y &&
		y <= rect.y + rect.height
	)
}
