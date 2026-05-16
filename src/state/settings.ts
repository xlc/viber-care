import { type LanguageCode, SUPPORTED_LANGUAGE_CODES } from '../content/schema'

export const SETTINGS_STORAGE_KEY = 'word-garden.story-settings.v1'

export type StoryAppSettings = {
	selectedPackId: string
	language: LanguageCode
	muted: boolean
	lastSceneId: string | null
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export const DEFAULT_SETTINGS: StoryAppSettings = {
	selectedPackId: 'mimi-rides-the-bus',
	language: 'en',
	muted: false,
	lastSceneId: null,
}

const languageSet = new Set<string>(SUPPORTED_LANGUAGE_CODES)

function sanitizeSettings(input: unknown): StoryAppSettings {
	if (!input || typeof input !== 'object') {
		return DEFAULT_SETTINGS
	}

	const value = input as Partial<StoryAppSettings>

	return {
		selectedPackId:
			typeof value.selectedPackId === 'string' &&
			value.selectedPackId.length > 0
				? value.selectedPackId
				: DEFAULT_SETTINGS.selectedPackId,
		language:
			value.language && languageSet.has(value.language)
				? value.language
				: DEFAULT_SETTINGS.language,
		muted:
			typeof value.muted === 'boolean' ? value.muted : DEFAULT_SETTINGS.muted,
		lastSceneId:
			typeof value.lastSceneId === 'string' && value.lastSceneId.length > 0
				? value.lastSceneId
				: null,
	}
}

export function loadSettings(
	storage: StorageLike | undefined,
): StoryAppSettings {
	if (!storage) {
		return DEFAULT_SETTINGS
	}

	const raw = storage.getItem(SETTINGS_STORAGE_KEY)
	if (!raw) {
		return DEFAULT_SETTINGS
	}

	try {
		return sanitizeSettings(JSON.parse(raw))
	} catch {
		return DEFAULT_SETTINGS
	}
}

export function saveSettings(
	storage: StorageLike | undefined,
	settings: StoryAppSettings,
): void {
	if (!storage) {
		return
	}

	storage.setItem(
		SETTINGS_STORAGE_KEY,
		JSON.stringify(sanitizeSettings(settings)),
	)
}
