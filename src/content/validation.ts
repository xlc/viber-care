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
	const packs = input.map((pack) => ContentPackSchema.parse(pack))
	const messages: string[] = []
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
						continue
					}
					if (language === 'zh-Hans' && !levelContent.romanization) {
						messages.push(
							`Object "${object.id}" is missing zh-Hans ${level} romanization.`,
						)
					}
				}
			}
		}

		const sceneIds = new Set<string>()
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

			for (const placement of scene.objects) {
				if (!objectIds.has(placement.objectId)) {
					messages.push(
						`Scene "${scene.id}" references unknown object "${placement.objectId}".`,
					)
				}
			}
		}

		if (!sceneIds.has(pack.defaultSceneId)) {
			messages.push(
				`Pack "${pack.id}" default scene "${pack.defaultSceneId}" does not exist.`,
			)
		}
	}

	if (messages.length > 0) {
		throw new ContentValidationError(messages)
	}

	return packs
}
