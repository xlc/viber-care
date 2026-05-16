import { expect, type Page, test } from '@playwright/test'
import {
	DEFAULT_SETTINGS,
	SETTINGS_STORAGE_KEY,
} from '../../src/state/settings'

type AudioCaptureWindow = Window & {
	__audioPlayCount?: { count: number }
	__audioPlaySources?: string[]
}

test.beforeEach(async ({ page }) => {
	await page.addInitScript(
		({
			settingsKey,
			mutedSettings,
		}: {
			settingsKey: string
			mutedSettings: typeof DEFAULT_SETTINGS
		}) => {
			window.localStorage.setItem(settingsKey, JSON.stringify(mutedSettings))

			const audioPlayCount = { count: 0 }
			Object.defineProperty(window, '__audioPlayCount', {
				configurable: true,
				value: audioPlayCount,
			})
			Object.defineProperty(window, '__audioPlaySources', {
				configurable: true,
				value: [],
			})

			HTMLMediaElement.prototype.play = function () {
				audioPlayCount.count += 1
				;(window as AudioCaptureWindow).__audioPlaySources?.push(
					this.currentSrc || this.getAttribute('src') || '',
				)
				window.setTimeout(() => {
					this.dispatchEvent(new Event('ended'))
				}, 0)
				return Promise.resolve()
			}
		},
		{
			settingsKey: SETTINGS_STORAGE_KEY,
			mutedSettings: { ...DEFAULT_SETTINGS, muted: true },
		},
	)
})

test.afterEach(async ({ page }) => {
	if (page.isClosed()) {
		return
	}
	if (!page.url().startsWith('http://127.0.0.1:5173')) {
		return
	}

	const audioState = await page.evaluate((settingsKey) => {
		const captureWindow = window as AudioCaptureWindow
		const storedSettings = JSON.parse(
			window.localStorage.getItem(settingsKey) ?? '{}',
		) as { muted?: unknown }

		return {
			audioPlayCount: captureWindow.__audioPlayCount?.count ?? 0,
			muted: storedSettings.muted,
		}
	}, SETTINGS_STORAGE_KEY)

	expect(audioState.muted).toBe(true)
	expect(audioState.audioPlayCount).toBe(0)
})

async function resetAudio(page: Page) {
	await page.evaluate(() => {
		const captureWindow = window as AudioCaptureWindow
		if (captureWindow.__audioPlayCount) {
			captureWindow.__audioPlayCount.count = 0
		}
		if (captureWindow.__audioPlaySources) {
			captureWindow.__audioPlaySources.length = 0
		}
	})
}

async function getAudioSources(page: Page) {
	return page.evaluate(() => {
		const captureWindow = window as AudioCaptureWindow
		return captureWindow.__audioPlaySources ?? []
	})
}

test('app opens on the story-pack home screen', async ({ page }) => {
	await page.goto('/')

	await expect(page.getByTestId('home-screen')).toBeVisible()
	await expect(page.getByTestId('pack-card-story-seed')).toBeVisible()
	await expect(page.getByTestId('start-story-story-seed')).toBeVisible()
	await expect(page.getByTestId('start-cards-story-seed')).toBeVisible()
	await expect(page.getByTestId('mode-explore')).toHaveCount(0)
	await expect(page.getByTestId('mode-find')).toHaveCount(0)
	await expect(page.getByTestId('mode-math')).toHaveCount(0)
})

test('language and pack settings persist from the home screen', async ({
	page,
}) => {
	await page.goto('/')
	await page.getByTestId('language-zh-Hans').click()
	await page.getByTestId('pack-card-story-seed').click()

	const stored = await page.evaluate((settingsKey) => {
		return JSON.parse(window.localStorage.getItem(settingsKey) ?? '{}') as {
			language?: string
			selectedPackId?: string
		}
	}, SETTINGS_STORAGE_KEY)

	expect(stored.language).toBe('zh-Hans')
	expect(stored.selectedPackId).toBe('story-seed')
})

test('story mode shell renders through its dedicated screen', async ({
	page,
}) => {
	await page.goto('/')
	await page.getByTestId('language-zh-Hans').click()
	await page.getByTestId('start-story-story-seed').click()

	await expect(page.getByTestId('story-screen')).toBeVisible()
	await expect(page.getByTestId('scene-progress')).toContainText('1 / 2')
	await expect(page.getByTestId('scene-text')).toContainText(
		'米米看见公共汽车。',
	)
	await expect(page.getByTestId('scene-item-bus')).toBeVisible()
	await page.getByRole('button', { name: 'Next scene' }).click()
	await expect(page.getByTestId('scene-progress')).toContainText('2 / 2')
	await expect(page.getByTestId('scene-text')).toContainText('米米找到一朵花。')
	await expect(page.getByTestId('scene-item-flower')).toBeVisible()
	await page.getByRole('button', { name: 'Previous scene' }).click()
	await expect(page.getByTestId('scene-text')).toContainText(
		'米米看见公共汽车。',
	)
	await expect(page.getByTestId('home-screen')).toHaveCount(0)
	await page.getByRole('button', { name: 'Back' }).click()
	await expect(page.getByTestId('home-screen')).toBeVisible()
})

test('card mode shell uses one-card paging and bilingual labels', async ({
	page,
}) => {
	await page.goto('/')
	await page.getByTestId('start-cards-story-seed').click()

	await expect(page.getByTestId('card-screen')).toBeVisible()
	await expect(page.getByTestId('vocabulary-card')).toContainText('bus')
	await expect(page.getByTestId('vocabulary-card')).toContainText('公共汽车')
	await page.getByRole('button', { name: 'Next card' }).click()
	await expect(page.getByTestId('vocabulary-card')).toContainText('flower')
	await expect(page.getByTestId('vocabulary-card')).toContainText('花')
})

test('audio is user initiated and respects mute', async ({ page }) => {
	await page.goto('/')
	await page.getByTestId('mute-button').click()
	await resetAudio(page)

	await page.getByTestId('start-story-story-seed').click()
	await page.getByTestId('replay-scene').click()
	let audioSources = await getAudioSources(page)
	expect(audioSources).toHaveLength(1)
	expect(audioSources[0]).toContain('/assets/generated/story-seed/audio/')

	await page.getByTestId('scene-item-bus').click()
	await expect.poll(async () => (await getAudioSources(page)).length).toBe(2)

	await page.getByTestId('mute-button').click()
	await resetAudio(page)
	await page.getByTestId('replay-scene').click()
	audioSources = await getAudioSources(page)
	expect(audioSources).toHaveLength(0)
})

test('card audio plays English then Chinese static assets', async ({
	page,
}) => {
	await page.goto('/')
	await page.getByTestId('mute-button').click()
	await resetAudio(page)

	await page.getByTestId('start-cards-story-seed').click()
	await page.getByTestId('vocabulary-card').click()

	await expect.poll(async () => (await getAudioSources(page)).length).toBe(2)

	const audioSources = await getAudioSources(page)
	expect(audioSources).toHaveLength(2)
	expect(audioSources[0]).toContain('/assets/generated/story-seed/audio/')
	expect(audioSources[1]).toContain('/assets/generated/story-seed/audio/')

	await page.getByTestId('mute-button').click()
	await expect
		.poll(async () => {
			return page.evaluate((settingsKey) => {
				const stored = JSON.parse(
					window.localStorage.getItem(settingsKey) ?? '{}',
				) as { muted?: unknown }
				return stored.muted
			}, SETTINGS_STORAGE_KEY)
		})
		.toBe(true)
	await resetAudio(page)
})

test('parent settings stay behind the gear button', async ({ page }) => {
	await page.goto('/')

	await expect(page.getByTestId('settings-panel')).toHaveCount(0)
	await page.getByTestId('settings-button').click()
	await expect(page.getByTestId('settings-panel')).toBeVisible()
	await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click()
	await expect(page.getByTestId('settings-panel')).toHaveCount(0)
})

test('runtime makes no calls to AI endpoints', async ({ page }) => {
	const requests: string[] = []
	page.on('request', (request) => {
		requests.push(request.url())
	})

	await page.goto('/')
	await page.getByTestId('start-story-story-seed').click()
	await page.getByTestId('home-button').click()
	await page.getByTestId('start-cards-story-seed').click()

	expect(
		requests.filter((url) =>
			/openrouter|openai|anthropic|gemini|replicate|fal\.ai/i.test(url),
		),
	).toEqual([])
})
