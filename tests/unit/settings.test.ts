import { describe, expect, it } from 'vitest'
import {
	DEFAULT_SETTINGS,
	loadSettings,
	resolveLanguageOrder,
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
})
