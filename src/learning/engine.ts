import {
	type ContentPack,
	type ContentSet,
	type LanguageCode,
	LEARNING_LEVELS,
	type LearningLevel,
	type LevelContent,
	type ObjectConcept,
	type RuntimeCatalog,
	type Scene,
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

export function getPackSets(pack: ContentPack): ContentSet[] {
	return pack.sets
}

export function getSelectedSet(
	pack: ContentPack,
	setId: string | null | undefined,
): ContentSet {
	const sets = getPackSets(pack)
	return (
		sets.find((set) => set.id === setId) ??
		sets.find((set) => set.sceneIds.includes(pack.defaultSceneId)) ??
		sets[0]
	)
}

export function getSetScenes(
	pack: ContentPack,
	setId: string | null | undefined,
): Scene[] {
	const set = getSelectedSet(pack, setId)
	const sceneMap = new Map(pack.scenes.map((scene) => [scene.id, scene]))
	const scenes = set.sceneIds
		.map((sceneId) => sceneMap.get(sceneId))
		.filter((scene): scene is Scene => Boolean(scene))
	return scenes.length > 0 ? scenes : pack.scenes
}

export function getDefaultScene(
	catalog: RuntimeCatalog,
	packId = 'garden',
	setId?: string | null,
) {
	const pack = getPack(catalog, packId)
	const setScenes = getSetScenes(pack, setId)
	return (
		setScenes.find((scene) => scene.id === pack.defaultSceneId) ??
		setScenes[0] ??
		pack.scenes[0]
	)
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
			audioPath: languageContent?.findPromptAudio?.path,
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
			audioPath: languageContent?.successPhraseAudio?.path,
		}
	})
}
