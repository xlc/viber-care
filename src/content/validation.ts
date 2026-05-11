import { placementMatchesRegion, rectContainsPoint } from './regions'
import {
	type ContentPack,
	LEARNING_LEVELS,
	type ObjectConcept,
	ObjectConceptSchema,
	REQUIRED_MVP_LANGUAGES,
	type SourceContentPack,
	SourceContentPackSchema,
} from './schema'

export class ContentValidationError extends Error {
	constructor(messages: string[]) {
		super(messages.join('\n'))
		this.name = 'ContentValidationError'
	}
}

export function validateContentCatalog(
	itemInput: unknown[],
	packInput: unknown[],
): { items: ObjectConcept[]; packs: ContentPack[] } {
	const messages: string[] = []
	const items = parseItems(itemInput, messages)
	const packs = parsePacks(packInput, messages)
	const itemMap = new Map(items.map((item) => [item.id, item]))

	validateItemUniqueness(items, messages)
	validatePackSources(packs, itemMap, messages)

	if (messages.length > 0) {
		throw new ContentValidationError(messages)
	}

	return {
		items,
		packs: packs.map((pack) => hydratePack(pack, itemMap)),
	}
}

function parseItems(input: unknown[], messages: string[]): ObjectConcept[] {
	const items: ObjectConcept[] = []
	input.forEach((item, index) => {
		const result = ObjectConceptSchema.safeParse(item)
		if (result.success) {
			items.push(result.data)
			return
		}

		for (const issue of result.error.issues) {
			const path =
				issue.path.length > 0 ? issue.path.join('.') : `item ${index}`
			messages.push(`${path}: ${issue.message}`)
		}
	})
	return items
}

function parsePacks(input: unknown[], messages: string[]): SourceContentPack[] {
	const packs: SourceContentPack[] = []
	input.forEach((pack, index) => {
		const result = SourceContentPackSchema.safeParse(pack)
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
	return packs
}

function validateItemUniqueness(
	items: ObjectConcept[],
	messages: string[],
): void {
	const itemIds = new Set<string>()
	for (const item of items) {
		if (itemIds.has(item.id)) {
			messages.push(`Duplicate item id "${item.id}".`)
		}
		itemIds.add(item.id)

		const variantIds = new Set<string>()
		for (const variant of item.variants) {
			if (variantIds.has(variant.id)) {
				messages.push(
					`Item "${item.id}" has duplicate variant id "${variant.id}".`,
				)
			}
			variantIds.add(variant.id)
		}

		validateItemLanguageContent(item, messages)
	}
}

function validateItemLanguageContent(
	item: ObjectConcept,
	messages: string[],
): void {
	for (const language of REQUIRED_MVP_LANGUAGES) {
		const languageContent = item.content[language]
		if (!languageContent) {
			messages.push(`Item "${item.id}" is missing ${language} content.`)
			continue
		}
		if (!languageContent.findPromptAudio) {
			messages.push(
				`Item "${item.id}" is missing ${language} find prompt audio.`,
			)
		} else if (languageContent.findPromptAudio.type !== 'audio') {
			messages.push(
				`Item "${item.id}" ${language} find prompt audio must be an audio asset.`,
			)
		}
		if (!languageContent.successPhraseAudio) {
			messages.push(
				`Item "${item.id}" is missing ${language} success phrase audio.`,
			)
		} else if (languageContent.successPhraseAudio.type !== 'audio') {
			messages.push(
				`Item "${item.id}" ${language} success phrase audio must be an audio asset.`,
			)
		}

		for (const level of LEARNING_LEVELS) {
			const levelContent = languageContent.levels[level]
			if (!levelContent) {
				messages.push(
					`Item "${item.id}" is missing ${language} ${level} content.`,
				)
				continue
			}
			if (!levelContent.audio) {
				messages.push(
					`Item "${item.id}" is missing ${language} ${level} audio.`,
				)
			} else if (levelContent.audio.type !== 'audio') {
				messages.push(
					`Item "${item.id}" ${language} ${level} audio must be an audio asset.`,
				)
			}
		}
	}
}

function validatePackSources(
	packs: SourceContentPack[],
	itemMap: Map<string, ObjectConcept>,
	messages: string[],
): void {
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

		const sceneIds = validateScenes(pack, itemMap, messages)
		validateSets(pack, sceneIds, itemMap, messages)

		if (!sceneIds.has(pack.defaultSceneId)) {
			messages.push(
				`Pack "${pack.id}" default scene "${pack.defaultSceneId}" does not exist.`,
			)
		}
	}
}

function validateScenes(
	pack: SourceContentPack,
	itemMap: Map<string, ObjectConcept>,
	messages: string[],
): Set<string> {
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
			if (!itemMap.has(placement.itemId)) {
				messages.push(
					`Scene "${scene.id}" references unknown item "${placement.itemId}".`,
				)
				continue
			}

			if (
				placement.scaleRange &&
				placement.scaleRange.min > placement.scaleRange.max
			) {
				messages.push(
					`Scene "${scene.id}" placement "${placement.itemId}" has scale range min greater than max.`,
				)
			}

			const matchingRegions = scene.regions.filter((region) =>
				placementMatchesRegion(region, placement),
			)
			if (matchingRegions.length === 0) {
				messages.push(
					`Scene "${scene.id}" placement "${placement.itemId}" references missing region tags "${placement.regionTags.join(', ')}".`,
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
					`Scene "${scene.id}" placement "${placement.itemId}" anchor is outside its region.`,
				)
			}
		}
	}

	return sceneIds
}

function validateSets(
	pack: SourceContentPack,
	sceneIds: Set<string>,
	itemMap: Map<string, ObjectConcept>,
	messages: string[],
): void {
	const setIds = new Set<string>()
	const packSetItemIds = new Set<string>()
	const sceneMap = new Map(pack.scenes.map((scene) => [scene.id, scene]))

	for (const set of pack.sets) {
		if (setIds.has(set.id)) {
			messages.push(`Pack "${pack.id}" has duplicate set id "${set.id}".`)
		}
		setIds.add(set.id)

		const setItemIds = new Set(set.itemIds)
		for (const itemId of set.itemIds) {
			if (!itemMap.has(itemId)) {
				messages.push(`Set "${set.id}" references unknown item "${itemId}".`)
			}
			packSetItemIds.add(itemId)
		}

		for (const sceneId of set.sceneIds) {
			if (!sceneIds.has(sceneId)) {
				messages.push(`Set "${set.id}" references unknown scene "${sceneId}".`)
				continue
			}
			const scene = sceneMap.get(sceneId)
			if (!scene) {
				continue
			}
			for (const placement of scene.objects) {
				if (!setItemIds.has(placement.itemId)) {
					messages.push(
						`Set "${set.id}" includes scene "${scene.id}" but is missing item "${placement.itemId}".`,
					)
				}
			}
		}
	}

	for (const scene of pack.scenes) {
		for (const placement of scene.objects) {
			if (!packSetItemIds.has(placement.itemId)) {
				messages.push(
					`Scene "${scene.id}" references item "${placement.itemId}" that is not included in any set for pack "${pack.id}".`,
				)
			}
		}
	}
}

function hydratePack(
	pack: SourceContentPack,
	itemMap: Map<string, ObjectConcept>,
): ContentPack {
	const itemIds = new Set(pack.sets.flatMap((set) => set.itemIds))
	const objects = [...itemIds]
		.map((itemId) => itemMap.get(itemId))
		.filter((item): item is ObjectConcept => Boolean(item))

	return {
		...pack,
		objects,
	}
}
