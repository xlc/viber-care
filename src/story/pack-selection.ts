import type { AudioCue } from '../audio/speech'
import type {
	AssetReference,
	LanguageCode,
	LocalizedAudio,
	LocalizedText,
	StoryCatalog,
	StoryItem,
	StoryPack,
	StoryScene,
	StorySceneItem,
} from '../content/schema'

export function getPack(catalog: StoryCatalog, packId: string): StoryPack {
	return catalog.packs.find((pack) => pack.id === packId) ?? catalog.packs[0]
}

export function getInitialScene(
	pack: StoryPack,
	sceneId: string | null,
): StoryScene {
	return (
		pack.scenes.find((scene) => scene.id === sceneId) ??
		[...pack.scenes].sort((a, b) => a.order - b.order)[0]
	)
}

export function getOrderedScenes(pack: StoryPack): StoryScene[] {
	return [...pack.scenes].sort((a, b) => a.order - b.order)
}

export function getSceneIndex(pack: StoryPack, sceneId: string): number {
	return getOrderedScenes(pack).findIndex((scene) => scene.id === sceneId)
}

export function getLearnableItems(pack: StoryPack): StoryItem[] {
	return pack.items.filter((item) => item.card)
}

export function getStoryItem(
	pack: StoryPack,
	sceneItem: StorySceneItem,
): StoryItem | undefined {
	return pack.items.find((item) => item.id === sceneItem.itemId)
}

export function getText(value: LocalizedText, language: LanguageCode): string {
	return value[language] ?? value.en ?? Object.values(value)[0] ?? ''
}

export function getAudioPath(
	value: LocalizedAudio,
	language: LanguageCode,
): string | undefined {
	return value[language]?.path ?? value.en?.path
}

export function getCardAudioSequence(item: StoryItem): AudioCue[] {
	return [
		{ audioPath: item.wordAudio.en?.path },
		{ audioPath: item.wordAudio['zh-Hans']?.path },
	]
}

export function getAssetAlt(asset: AssetReference, fallback: string): string {
	return asset.alt ?? fallback
}
