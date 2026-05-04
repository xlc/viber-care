import {
	type LanguageCode,
	LEARNING_LEVELS,
	type LearningLevel,
	SUPPORTED_LANGUAGE_CODES,
} from '../content/schema'

export const SETTINGS_STORAGE_KEY = 'word-garden.settings.v1'

export const LANGUAGE_ORDER_PRESETS = [
	'en-only',
	'zh-only',
	'en-then-zh',
	'zh-then-en',
	'custom',
] as const

export const GAME_MODES = ['explore', 'find', 'story'] as const

export type LanguageOrderPreset = (typeof LANGUAGE_ORDER_PRESETS)[number]
export type GameMode = (typeof GAME_MODES)[number]

export type WordGardenSettings = {
	mode: GameMode
	selectedPackId: string
	languageOrderPreset: LanguageOrderPreset
	customLanguageOrder: LanguageCode[]
	showRomanization: boolean
	activeLevel: LearningLevel
	muted: boolean
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export const DEFAULT_SETTINGS: WordGardenSettings = {
	mode: 'explore',
	selectedPackId: 'garden',
	languageOrderPreset: 'en-then-zh',
	customLanguageOrder: ['en', 'zh-Hans'],
	showRomanization: true,
	activeLevel: 'L0',
	muted: false,
}

const languageSet = new Set<string>(SUPPORTED_LANGUAGE_CODES)
const levelSet = new Set<string>(LEARNING_LEVELS)
const modeSet = new Set<string>(GAME_MODES)
const presetSet = new Set<string>(LANGUAGE_ORDER_PRESETS)

export function sanitizeSettings(input: unknown): WordGardenSettings {
	if (!input || typeof input !== 'object') {
		return DEFAULT_SETTINGS
	}

	const value = input as Partial<WordGardenSettings>
	const customLanguageOrder = Array.isArray(value.customLanguageOrder)
		? value.customLanguageOrder.filter((language): language is LanguageCode =>
				languageSet.has(language),
			)
		: DEFAULT_SETTINGS.customLanguageOrder

	return {
		mode:
			value.mode && modeSet.has(value.mode)
				? value.mode
				: DEFAULT_SETTINGS.mode,
		selectedPackId:
			typeof value.selectedPackId === 'string' &&
			value.selectedPackId.length > 0
				? value.selectedPackId
				: DEFAULT_SETTINGS.selectedPackId,
		languageOrderPreset:
			value.languageOrderPreset && presetSet.has(value.languageOrderPreset)
				? value.languageOrderPreset
				: DEFAULT_SETTINGS.languageOrderPreset,
		customLanguageOrder:
			customLanguageOrder.length > 0
				? customLanguageOrder
				: DEFAULT_SETTINGS.customLanguageOrder,
		showRomanization:
			typeof value.showRomanization === 'boolean'
				? value.showRomanization
				: DEFAULT_SETTINGS.showRomanization,
		activeLevel:
			value.activeLevel && levelSet.has(value.activeLevel)
				? value.activeLevel
				: DEFAULT_SETTINGS.activeLevel,
		muted:
			typeof value.muted === 'boolean' ? value.muted : DEFAULT_SETTINGS.muted,
	}
}

export function loadSettings(
	storage: StorageLike | undefined,
): WordGardenSettings {
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
	settings: WordGardenSettings,
): void {
	if (!storage) {
		return
	}
	storage.setItem(
		SETTINGS_STORAGE_KEY,
		JSON.stringify(sanitizeSettings(settings)),
	)
}

export function resolveLanguageOrder(
	settings: WordGardenSettings,
): LanguageCode[] {
	switch (settings.languageOrderPreset) {
		case 'en-only':
			return ['en']
		case 'zh-only':
			return ['zh-Hans']
		case 'zh-then-en':
			return ['zh-Hans', 'en']
		case 'custom':
			return settings.customLanguageOrder.length > 0
				? settings.customLanguageOrder
				: DEFAULT_SETTINGS.customLanguageOrder
		default:
			return ['en', 'zh-Hans']
	}
}
