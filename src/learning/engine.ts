import {
	type LanguageCode,
	LEARNING_LEVELS,
	type LearningLevel,
	type LevelContent,
	type ObjectConcept,
	type RuntimeCatalog,
} from '../content/schema'
import {
	resolveLanguageOrder,
	type WordGardenSettings,
} from '../state/settings'

export type LearningPresentation = {
	requestedLanguage: LanguageCode
	resolvedLanguage: LanguageCode
	requestedLevel: LearningLevel
	resolvedLevel: LearningLevel
	text: string
	audioText: string
	audioPath?: string
}

export function getPack(catalog: RuntimeCatalog, packId = 'garden') {
	return catalog.packs.find((pack) => pack.id === packId) ?? catalog.packs[0]
}

export function getDefaultScene(catalog: RuntimeCatalog, packId = 'garden') {
	const pack = getPack(catalog, packId)
	return (
		pack.scenes.find((scene) => scene.id === pack.defaultSceneId) ??
		pack.scenes[0]
	)
}

export function getSceneObjects(
	catalog: RuntimeCatalog,
	packId = 'garden',
): ObjectConcept[] {
	const pack = getPack(catalog, packId)
	const scene = getDefaultScene(catalog, packId)
	const objectMap = new Map(pack.objects.map((object) => [object.id, object]))
	return scene.objects
		.map((placement) => objectMap.get(placement.objectId))
		.filter((object): object is ObjectConcept => Boolean(object))
}

function levelFallbackOrder(level: LearningLevel): LearningLevel[] {
	const requestedIndex = LEARNING_LEVELS.indexOf(level)
	const lowerLevels = LEARNING_LEVELS.slice(0, requestedIndex + 1).reverse()
	const remainingLevels = LEARNING_LEVELS.filter(
		(candidate) => !lowerLevels.includes(candidate),
	)
	return [...lowerLevels, ...remainingLevels]
}

function firstAvailableLanguage(object: ObjectConcept): LanguageCode {
	const firstLanguage = Object.keys(object.content)[0] as
		| LanguageCode
		| undefined
	return firstLanguage ?? 'en'
}

export function getLevelPresentation(
	object: ObjectConcept,
	language: LanguageCode,
	level: LearningLevel,
): LearningPresentation {
	const resolvedLanguage = object.content[language]
		? language
		: firstAvailableLanguage(object)
	const languageContent = object.content[resolvedLanguage]

	if (!languageContent) {
		return {
			requestedLanguage: language,
			resolvedLanguage: language,
			requestedLevel: level,
			resolvedLevel: 'L0',
			text: object.id,
			audioText: object.id,
		}
	}

	for (const candidateLevel of levelFallbackOrder(level)) {
		const levelContent = languageContent.levels[candidateLevel] as
			| LevelContent
			| undefined
		if (levelContent) {
			return {
				requestedLanguage: language,
				resolvedLanguage,
				requestedLevel: level,
				resolvedLevel: candidateLevel,
				text: levelContent.text || languageContent.fallbackText,
				audioText:
					levelContent.audioText ||
					levelContent.text ||
					languageContent.fallbackText,
				audioPath: levelContent.audio?.path,
			}
		}
	}

	return {
		requestedLanguage: language,
		resolvedLanguage,
		requestedLevel: level,
		resolvedLevel: 'L0',
		text: languageContent.fallbackText,
		audioText: languageContent.fallbackText,
	}
}

export function buildLearningSequence(
	object: ObjectConcept,
	settings: WordGardenSettings,
): LearningPresentation[] {
	return resolveLanguageOrder(settings).map((language) =>
		getLevelPresentation(object, language, settings.activeLevel),
	)
}

export function getFindPrompt(
	object: ObjectConcept,
	settings: WordGardenSettings,
): LearningPresentation[] {
	return resolveLanguageOrder(settings).map((language) => {
		const resolvedLanguage = object.content[language]
			? language
			: firstAvailableLanguage(object)
		const languageContent = object.content[resolvedLanguage]
		const fallback = getLevelPresentation(object, resolvedLanguage, 'L0')

		return {
			requestedLanguage: language,
			resolvedLanguage,
			requestedLevel: settings.activeLevel,
			resolvedLevel: fallback.resolvedLevel,
			text: languageContent?.findPrompt ?? fallback.text,
			audioText: languageContent?.findPrompt ?? fallback.audioText,
			audioPath: undefined,
		}
	})
}

export function getSuccessPhrase(
	object: ObjectConcept,
	settings: WordGardenSettings,
): LearningPresentation[] {
	return resolveLanguageOrder(settings).map((language) => {
		const resolvedLanguage = object.content[language]
			? language
			: firstAvailableLanguage(object)
		const languageContent = object.content[resolvedLanguage]
		const fallback = getLevelPresentation(object, resolvedLanguage, 'L0')

		return {
			requestedLanguage: language,
			resolvedLanguage,
			requestedLevel: settings.activeLevel,
			resolvedLevel: fallback.resolvedLevel,
			text: languageContent?.successPhrase ?? fallback.text,
			audioText: languageContent?.successPhrase ?? fallback.audioText,
			audioPath: undefined,
		}
	})
}
