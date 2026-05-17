import {
	type AssetReference,
	REQUIRED_STORY_LANGUAGES,
	type StoryPack,
	StoryPackSchema,
} from './schema'

export class ContentValidationError extends Error {
	constructor(messages: string[]) {
		super(messages.join('\n'))
		this.name = 'ContentValidationError'
	}
}

export function validateStoryPacks(input: unknown[]): StoryPack[] {
	const messages: string[] = []
	const packs = parsePacks(input, messages)

	validatePackUniqueness(packs, messages)
	for (const pack of packs) {
		validatePack(pack, messages)
	}

	if (messages.length > 0) {
		throw new ContentValidationError(messages)
	}

	return packs
}

function parsePacks(input: unknown[], messages: string[]): StoryPack[] {
	const packs: StoryPack[] = []

	input.forEach((pack, index) => {
		const result = StoryPackSchema.safeParse(pack)
		if (result.success) {
			packs.push(result.data)
			return
		}

		for (const issue of result.error.issues) {
			const path =
				issue.path.length > 0 ? issue.path.join('.') : `story pack ${index}`
			messages.push(`${path}: ${issue.message}`)
		}
	})

	return packs
}

function validatePackUniqueness(packs: StoryPack[], messages: string[]) {
	const packIds = new Set<string>()
	for (const pack of packs) {
		if (packIds.has(pack.id)) {
			messages.push(`Duplicate story pack id "${pack.id}".`)
		}
		packIds.add(pack.id)
	}
}

function validatePack(pack: StoryPack, messages: string[]) {
	if (pack.metadata.sceneCount !== pack.scenes.length) {
		messages.push(
			`Pack "${pack.id}" metadata scene count does not match its scenes.`,
		)
	}

	for (const language of REQUIRED_STORY_LANGUAGES) {
		if (!pack.languages.includes(language)) {
			messages.push(`Pack "${pack.id}" is missing ${language} language.`)
		}
	}

	validateImageAsset(pack.coverImage, `${pack.id}/cover`, pack.id, messages)
	validateRequiredLanguages(pack.metadata.title, `${pack.id}/title`, messages)
	validateRequiredLanguages(
		pack.metadata.description,
		`${pack.id}/description`,
		messages,
	)

	const sceneIds = validateScenes(pack, messages)
	validateItems(pack, sceneIds, messages)
}

function validateScenes(pack: StoryPack, messages: string[]): Set<string> {
	const sceneIds = new Set<string>()
	const sceneOrders = new Set<number>()
	const itemIds = new Set(pack.items.map((item) => item.id))

	for (const scene of pack.scenes) {
		if (sceneIds.has(scene.id)) {
			messages.push(`Pack "${pack.id}" has duplicate scene id "${scene.id}".`)
		}
		sceneIds.add(scene.id)

		if (sceneOrders.has(scene.order)) {
			messages.push(
				`Pack "${pack.id}" has duplicate scene order "${scene.order}".`,
			)
		}
		sceneOrders.add(scene.order)

		validateRequiredLanguages(scene.text, `${scene.id}/text`, messages)
		validateRequiredAudio(
			scene.narration,
			`${scene.id}/narration`,
			pack.id,
			messages,
		)
		validateImageAsset(scene.image, `${scene.id}/image`, pack.id, messages)

		const interactionIds = new Set<string>()
		for (const interaction of scene.interactions) {
			if (interactionIds.has(interaction.id)) {
				messages.push(
					`Scene "${scene.id}" has duplicate interaction id "${interaction.id}".`,
				)
			}
			interactionIds.add(interaction.id)
		}

		for (const sceneItem of scene.items) {
			if (!itemIds.has(sceneItem.itemId)) {
				messages.push(
					`Scene "${scene.id}" references unknown item "${sceneItem.itemId}".`,
				)
			}
			if (
				sceneItem.interactionId &&
				!interactionIds.has(sceneItem.interactionId)
			) {
				messages.push(
					`Scene "${scene.id}" item "${sceneItem.itemId}" references unknown interaction "${sceneItem.interactionId}".`,
				)
			}
		}
	}

	return sceneIds
}

function validateItems(
	pack: StoryPack,
	sceneIds: Set<string>,
	messages: string[],
) {
	const itemIds = new Set<string>()
	const placedSceneIdsByItem = getPlacedSceneIdsByItem(pack)

	for (const item of pack.items) {
		if (itemIds.has(item.id)) {
			messages.push(`Pack "${pack.id}" has duplicate item id "${item.id}".`)
		}
		itemIds.add(item.id)

		validateRequiredLanguages(item.name, `${item.id}/name`, messages)
		if (item.phrase) {
			validateRequiredLanguages(item.phrase, `${item.id}/phrase`, messages)
		}
		validateRequiredAudio(
			item.wordAudio,
			`${item.id}/wordAudio`,
			pack.id,
			messages,
		)
		validateImageAsset(item.image, `${item.id}/image`, pack.id, messages)

		const placedSceneIds =
			placedSceneIdsByItem.get(item.id) ?? new Set<string>()
		if (placedSceneIds.size === 0) {
			messages.push(`Item "${item.id}" must appear in a scene.`)
		}

		for (const sceneId of item.sceneIds) {
			if (!sceneIds.has(sceneId)) {
				messages.push(
					`Item "${item.id}" references unknown scene "${sceneId}".`,
				)
				continue
			}

			if (!placedSceneIds.has(sceneId)) {
				messages.push(
					`Item "${item.id}" declares scene "${sceneId}" but is not placed there.`,
				)
			}
		}

		for (const sceneId of placedSceneIds) {
			if (!item.sceneIds.includes(sceneId)) {
				messages.push(
					`Item "${item.id}" is placed in scene "${sceneId}" but does not declare it.`,
				)
			}
		}
	}
}

function getPlacedSceneIdsByItem(pack: StoryPack): Map<string, Set<string>> {
	const placedSceneIdsByItem = new Map<string, Set<string>>()

	for (const scene of pack.scenes) {
		for (const sceneItem of scene.items) {
			const sceneIds =
				placedSceneIdsByItem.get(sceneItem.itemId) ?? new Set<string>()
			sceneIds.add(scene.id)
			placedSceneIdsByItem.set(sceneItem.itemId, sceneIds)
		}
	}

	return placedSceneIdsByItem
}

function validateRequiredLanguages(
	value: Record<string, unknown>,
	label: string,
	messages: string[],
) {
	for (const language of REQUIRED_STORY_LANGUAGES) {
		if (!value[language]) {
			messages.push(`${label} is missing ${language}.`)
		}
	}
}

function validateRequiredAudio(
	value: Record<string, AssetReference | undefined>,
	label: string,
	packId: string,
	messages: string[],
) {
	for (const language of REQUIRED_STORY_LANGUAGES) {
		const asset = value[language]
		if (!asset) {
			messages.push(`${label} is missing ${language} audio.`)
			continue
		}
		if (asset.type !== 'audio' && asset.type !== 'sound') {
			messages.push(`${label} ${language} must be an audio asset.`)
		}
		validatePublicAsset(asset, `${label}/${language}`, packId, messages)
	}
}

function validateImageAsset(
	asset: AssetReference,
	label: string,
	packId: string,
	messages: string[],
) {
	if (asset.type !== 'image') {
		messages.push(`${label} must be an image asset.`)
	}
	validatePublicAsset(asset, label, packId, messages)
}

function validatePublicAsset(
	asset: AssetReference,
	label: string,
	packId: string,
	messages: string[],
) {
	const expectedPrefix = `/assets/generated/${packId}/`
	if (!asset.path.startsWith(expectedPrefix)) {
		messages.push(
			`${label} must use a public asset path under ${expectedPrefix}.`,
		)
	}
	if (asset.path.split('/').includes('..')) {
		messages.push(`${label} must not contain path traversal.`)
	}
}
