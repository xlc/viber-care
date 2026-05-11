import { describe, expect, it } from 'vitest'
import {
	DEFAULT_SETTINGS,
	loadSettings,
	resolveLanguageOrder,
	SETTINGS_STORAGE_KEY,
	type StorageLike,
	saveSettings,
	type WordGardenSettings,
} from '../../src/state/settings'

class MemoryStorage implements StorageLike {
	private values = new Map<string, string>()

	getItem(key: string) {
		return this.values.get(key) ?? null
	}

	setItem(key: string, value: string) {
		this.values.set(key, value)
	}
}

describe('settings persistence', () => {
	it('loads defaults when storage is empty', () => {
		expect(loadSettings(new MemoryStorage())).toEqual(DEFAULT_SETTINGS)
	})

	it('persists valid settings and resolves language order', () => {
		const storage = new MemoryStorage()
		const settings: WordGardenSettings = {
			...DEFAULT_SETTINGS,
			mode: 'cards',
			selectedPackId: 'english-alphabet',
			selectedSubPackId: 'alphabet-u-z',
			languageOrderPreset: 'zh-then-en',
			activeLevel: 'L3',
			muted: true,
		}

		saveSettings(storage, settings)
		const loaded = loadSettings(storage)

		expect(loaded).toEqual(settings)
		expect(resolveLanguageOrder(loaded)).toEqual(['zh-Hans', 'en'])
	})

	it('accepts math as a valid stored mode', () => {
		const storage = new MemoryStorage()
		const settings: WordGardenSettings = {
			...DEFAULT_SETTINGS,
			mode: 'math',
			mathFocus: 'colors',
		}

		saveSettings(storage, settings)

		expect(loadSettings(storage).mode).toBe('math')
		expect(loadSettings(storage).mathFocus).toBe('colors')
	})

	it('falls back from invalid stored modes', () => {
		const storage = new MemoryStorage()
		storage.setItem(
			SETTINGS_STORAGE_KEY,
			JSON.stringify({ ...DEFAULT_SETTINGS, mode: 'story' }),
		)

		expect(loadSettings(storage).mode).toBe(DEFAULT_SETTINGS.mode)
	})

	it('falls back from invalid stored math focus', () => {
		const storage = new MemoryStorage()
		storage.setItem(
			SETTINGS_STORAGE_KEY,
			JSON.stringify({ ...DEFAULT_SETTINGS, mathFocus: 'badges' }),
		)

		expect(loadSettings(storage).mathFocus).toBe(DEFAULT_SETTINGS.mathFocus)
	})
})
