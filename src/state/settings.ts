import {
	type LanguageCode,
	LEARNING_LEVELS,
	type LearningLevel,
} from '../content/schema'

export const SETTINGS_STORAGE_KEY = 'word-garden.settings.v1'

export const LANGUAGE_ORDER_PRESETS = [
	'en-only',
	'zh-only',
	'en-then-zh',
	'zh-then-en',
] as const

export const GAME_MODES = [
	'explore',
	'find',
	'puzzle',
	'cards',
	'math',
] as const

export const MATH_FOCUS_OPTIONS = ['mixed', 'counting-1-3', 'colors'] as const

export type LanguageOrderPreset = (typeof LANGUAGE_ORDER_PRESETS)[number]
export type GameMode = (typeof GAME_MODES)[number]
export type MathFocus = (typeof MATH_FOCUS_OPTIONS)[number]

export type WordGardenSettings = {
	mode: GameMode
	selectedPackId: string
	selectedSubPackId: string | null
	languageOrderPreset: LanguageOrderPreset
	activeLevel: LearningLevel
	mathFocus: MathFocus
	muted: boolean
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export const DEFAULT_SETTINGS: WordGardenSettings = {
	mode: 'explore',
	selectedPackId: 'garden',
	selectedSubPackId: null,
	languageOrderPreset: 'en-then-zh',
	activeLevel: 'L0',
	mathFocus: 'mixed',
	muted: false,
}

const levelSet = new Set<string>(LEARNING_LEVELS)
const modeSet = new Set<string>(GAME_MODES)
const mathFocusSet = new Set<string>(MATH_FOCUS_OPTIONS)
const presetSet = new Set<string>(LANGUAGE_ORDER_PRESETS)

export function sanitizeSettings(input: unknown): WordGardenSettings {
	if (!input || typeof input !== 'object') {
		return DEFAULT_SETTINGS
	}

	const value = input as Partial<WordGardenSettings>

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
		selectedSubPackId:
			typeof value.selectedSubPackId === 'string' &&
			value.selectedSubPackId.length > 0
				? value.selectedSubPackId
				: null,
		languageOrderPreset:
			value.languageOrderPreset && presetSet.has(value.languageOrderPreset)
				? value.languageOrderPreset
				: DEFAULT_SETTINGS.languageOrderPreset,
		activeLevel:
			value.activeLevel && levelSet.has(value.activeLevel)
				? value.activeLevel
				: DEFAULT_SETTINGS.activeLevel,
		mathFocus:
			value.mathFocus && mathFocusSet.has(value.mathFocus)
				? value.mathFocus
				: DEFAULT_SETTINGS.mathFocus,
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
		default:
			return ['en', 'zh-Hans']
	}
}
