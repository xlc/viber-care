import { describe, expect, it } from 'vitest'
import {
	DEFAULT_SETTINGS,
	loadSettings,
	SETTINGS_STORAGE_KEY,
	type StorageLike,
	type StoryAppSettings,
	saveSettings,
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

describe('story settings persistence', () => {
	it('loads defaults when storage is empty', () => {
		expect(loadSettings(new MemoryStorage())).toEqual(DEFAULT_SETTINGS)
	})

	it('persists valid story settings', () => {
		const storage = new MemoryStorage()
		const settings: StoryAppSettings = {
			selectedPackId: 'mimi-rides-the-bus',
			language: 'zh-Hans',
			muted: true,
			lastSceneId: '03-card-and-seat',
		}

		saveSettings(storage, settings)

		expect(loadSettings(storage)).toEqual(settings)
	})

	it('falls back from legacy mode and language-order settings', () => {
		const storage = new MemoryStorage()
		storage.setItem(
			SETTINGS_STORAGE_KEY,
			JSON.stringify({
				mode: 'math',
				activeLevel: 'L5',
				languageOrderPreset: 'zh-then-en',
				selectedSetId: 'old-set',
				selectedPackId: 'mimi-rides-the-bus',
			}),
		)

		expect(loadSettings(storage)).toEqual({
			...DEFAULT_SETTINGS,
			selectedPackId: 'mimi-rides-the-bus',
		})
	})

	it('falls back from unsupported story settings', () => {
		const storage = new MemoryStorage()
		storage.setItem(
			SETTINGS_STORAGE_KEY,
			JSON.stringify({
				selectedPackId: '',
				language: 'fr',
				muted: 'no',
				lastSceneId: '',
			}),
		)

		expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS)
	})
})
