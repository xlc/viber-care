import { placementMatchesRegion, rectContainsPoint } from './regions'
import {
	type ContentPack,
	ContentPackSchema,
	LEARNING_LEVELS,
	REQUIRED_MVP_LANGUAGES,
} from './schema'

export class ContentValidationError extends Error {
	constructor(messages: string[]) {
		super(messages.join('\n'))
		this.name = 'ContentValidationError'
	}
}

export function validateContentPacks(input: unknown[]): ContentPack[] {
	const messages: string[] = []
	const packs: ContentPack[] = []
	input.forEach((pack, index) => {
		const result = ContentPackSchema.safeParse(pack)
		if (result.success) {
			packs.push(result.data)
			return
		}

		for (const issue of result.error.issues) {
			const path =
				issue.path.length > 0 ? issue.path.join('.') : `pack ${index}`
			messages.push(`${path}: ${issue.message}`)
		}
	})
	const packIds = new Set<string>()

	for (const pack of packs) {
		if (packIds.has(pack.id)) {
			messages.push(`Duplicate content pack id "${pack.id}".`)
		}
		packIds.add(pack.id)

		for (const language of REQUIRED_MVP_LANGUAGES) {
			if (!pack.languages.includes(language)) {
				messages.push(`Pack "${pack.id}" is missing ${language} language.`)
			}
		}

		const objectIds = new Set<string>()
		for (const object of pack.objects) {
			if (objectIds.has(object.id)) {
				messages.push(
					`Pack "${pack.id}" has duplicate object id "${object.id}".`,
				)
			}
			objectIds.add(object.id)

			const variantIds = new Set<string>()
			for (const variant of object.variants) {
				if (variantIds.has(variant.id)) {
					messages.push(
						`Object "${object.id}" has duplicate variant id "${variant.id}".`,
					)
				}
				variantIds.add(variant.id)
			}

			for (const language of REQUIRED_MVP_LANGUAGES) {
				const languageContent = object.content[language]
				if (!languageContent) {
					messages.push(`Object "${object.id}" is missing ${language} content.`)
					continue
				}

				for (const level of LEARNING_LEVELS) {
					const levelContent = languageContent.levels[level]
					if (!levelContent) {
						messages.push(
							`Object "${object.id}" is missing ${language} ${level} content.`,
						)
					}
				}
			}
		}

		const sceneIds = new Set<string>()
		if (pack.scenes.length < 2) {
			messages.push(`Pack "${pack.id}" must include at least two scenes.`)
		}
		for (const scene of pack.scenes) {
			if (scene.packId !== pack.id) {
				messages.push(
					`Scene "${scene.id}" belongs to "${scene.packId}", not pack "${pack.id}".`,
				)
			}
			if (sceneIds.has(scene.id)) {
				messages.push(`Pack "${pack.id}" has duplicate scene id "${scene.id}".`)
			}
			sceneIds.add(scene.id)

			if (scene.visibleObjectCount.min > scene.visibleObjectCount.max) {
				messages.push(
					`Scene "${scene.id}" has visible object min greater than max.`,
				)
			}
			if (scene.visibleObjectCount.max > scene.objects.length) {
				messages.push(
					`Scene "${scene.id}" visible object max exceeds spawn candidate count.`,
				)
			}

			const regionIds = new Set<string>()
			for (const region of scene.regions) {
				if (regionIds.has(region.id)) {
					messages.push(
						`Scene "${scene.id}" has duplicate region id "${region.id}".`,
					)
				}
				regionIds.add(region.id)

				for (const rect of region.rects) {
					if (rect.x + rect.width > 100 || rect.y + rect.height > 100) {
						messages.push(
							`Scene "${scene.id}" region "${region.id}" extends outside the background.`,
						)
					}
				}
			}

			for (const placement of scene.objects) {
				if (!objectIds.has(placement.objectId)) {
					messages.push(
						`Scene "${scene.id}" references unknown object "${placement.objectId}".`,
					)
					continue
				}

				if (
					placement.scaleRange &&
					placement.scaleRange.min > placement.scaleRange.max
				) {
					messages.push(
						`Scene "${scene.id}" placement "${placement.objectId}" has scale range min greater than max.`,
					)
				}

				const matchingRegions = scene.regions.filter((region) =>
					placementMatchesRegion(region, placement),
				)
				if (matchingRegions.length === 0) {
					messages.push(
						`Scene "${scene.id}" placement "${placement.objectId}" references missing region tags "${placement.regionTags.join(', ')}".`,
					)
					continue
				}

				if (
					!matchingRegions.some((region) =>
						region.rects.some((rect) =>
							rectContainsPoint(rect, placement.x, placement.y),
						),
					)
				) {
					messages.push(
						`Scene "${scene.id}" placement "${placement.objectId}" anchor is outside its region.`,
					)
				}
			}
		}

		if (!sceneIds.has(pack.defaultSceneId)) {
			messages.push(
				`Pack "${pack.id}" default scene "${pack.defaultSceneId}" does not exist.`,
			)
		}

		const subPackIds = new Set<string>()
		for (const subPack of pack.subPacks ?? []) {
			if (subPackIds.has(subPack.id)) {
				messages.push(
					`Pack "${pack.id}" has duplicate sub-pack id "${subPack.id}".`,
				)
			}
			subPackIds.add(subPack.id)

			for (const sceneId of subPack.sceneIds) {
				if (!sceneIds.has(sceneId)) {
					messages.push(
						`Sub-pack "${subPack.id}" references unknown scene "${sceneId}".`,
					)
				}
			}
		}
	}

	if (messages.length > 0) {
		throw new ContentValidationError(messages)
	}

	return packs
}
