import { expect, type Page, test } from '@playwright/test'
import {
	DEFAULT_SETTINGS,
	SETTINGS_STORAGE_KEY,
} from '../../src/state/settings'

type AudioCaptureWindow = Window & {
	__audioPlayCount?: { count: number }
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

			HTMLMediaElement.prototype.play = () => {
				audioPlayCount.count += 1
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

async function getAudioPlayCount(page: Page) {
	return page.evaluate(() => {
		const captureWindow = window as AudioCaptureWindow
		return captureWindow.__audioPlayCount?.count ?? 0
	})
}

async function getPuzzlePieceIds(page: Page) {
	return page.locator('.puzzle-piece').evaluateAll((elements) =>
		elements
			.map((element) => element.getAttribute('data-testid') ?? '')
			.filter((testId) => testId.startsWith('puzzle-piece-'))
			.map((testId) => testId.replace('puzzle-piece-', '')),
	)
}

async function dragPuzzlePieceToGap(
	page: Page,
	objectId: string,
	targetObjectId = objectId,
) {
	const piece = page.getByTestId(`puzzle-piece-${objectId}`)
	const gap = page.getByTestId(`puzzle-gap-${targetObjectId}`)
	await expect(piece).toBeVisible()
	await expect(piece).toHaveAttribute('draggable', 'true')
	await expect(gap).toBeVisible()
	await piece.dragTo(gap)
}

async function expectObjectCountBetween(
	page: Page,
	min: number,
	max: number,
	selector = '.garden-object',
) {
	await expect(page.locator(selector).first()).toBeVisible()
	const count = await page.locator(selector).count()
	expect(count).toBeGreaterThanOrEqual(min)
	expect(count).toBeLessThanOrEqual(max)
	return count
}

test('app loads', async ({ page }) => {
	await page.goto('/')

	await expect(page).toHaveTitle('Word Garden')
	await expect(page.getByTestId('scene-title')).toContainText('Sunny Garden')
	await expectObjectCountBetween(page, 5, 6)
	await expect(page.locator('.garden-object').first()).toHaveAttribute(
		'data-variant-id',
		/classic|bright-large/,
	)
})

test('explore tap displays the word', async ({ page }) => {
	await page.goto('/')
	const firstObject = page.locator('.garden-object').first()
	const label = await firstObject.getAttribute('aria-label')
	await firstObject.click()

	await expect(page.getByTestId('word-tray')).toContainText(label ?? '')
	await expect(page.getByTestId('word-tray').locator('.word-line')).toHaveCount(
		2,
	)
})

test('e2e starts muted', async ({ page }) => {
	await page.goto('/')
	const muteButton = page.getByTestId('mute-button')

	await expect(muteButton).toHaveAttribute('aria-pressed', 'true')
})

test('find mode accepts target tap', async ({ page }) => {
	await page.goto('/')
	await page.getByTestId('mode-find').click()

	await expect(page.getByTestId('prompt')).toContainText('Find')
	await page.locator('.garden-object').first().click()
	await expect(page.getByTestId('prompt')).toContainText('You found')
	await expect(page.getByTestId('prompt')).toContainText('Find', {
		timeout: 3_000,
	})
})

test('find mode names non-target taps without failure language', async ({
	page,
}) => {
	await page.goto('/')
	await page.getByTestId('mode-find').click()

	await expect(page.getByTestId('prompt')).toContainText('Find')
	const secondObject = page.locator('.garden-object').nth(1)
	const label = await secondObject.getAttribute('aria-label')
	await secondObject.click()
	await expect(page.getByTestId('word-tray')).toContainText(label ?? '')
	await expect(page.getByTestId('prompt')).not.toContainText(/wrong|try again/i)
})

test('find mode handles immediate taps after alphabet set changes', async ({
	page,
}) => {
	await page.goto('/')
	await page.getByTestId('settings-button').click()
	await page.getByTestId('pack-english-alphabet').click()
	await page.getByTestId('set-alphabet-f-j').click()
	await page.getByLabel('Close settings').click()
	await page.getByTestId('mode-find').click()

	await page.locator('.garden-object').first().click()

	await expect(page.getByTestId('prompt')).toContainText('You found')
})

test('find mode stays silent while muted from settings', async ({ page }) => {
	await page.goto('/')
	await page.getByTestId('settings-button').click()
	await page.getByRole('dialog').getByTestId('mode-find').click()

	await expect.poll(() => getAudioPlayCount(page)).toBe(0)
	await expect(page.getByTestId('prompt')).toContainText('Find')
})

test('settings panel can change language order', async ({ page }) => {
	await page.goto('/')
	await page.getByTestId('settings-button').click()
	await page.getByTestId('preset-zh-then-en').click()
	await page.getByLabel('Close settings').click()
	await page.locator('.garden-object').first().click()

	const firstWord = page.getByTestId('word-tray').locator('.word-line').first()
	await expect(firstWord.locator('span')).toHaveAttribute('lang', 'zh-Hans')
})

test('settings panel can change word detail without raw level labels', async ({
	page,
}) => {
	await page.goto('/')
	await page.getByTestId('settings-button').click()
	const dialog = page.getByRole('dialog')

	await expect(dialog.getByText('Word Detail')).toBeVisible()
	await expect(dialog.getByTestId('detail-L3')).toContainText('Simple sentence')
	await expect(dialog.getByText('L3', { exact: true })).toHaveCount(0)
	await dialog.getByTestId('detail-L3').click()
	await page.getByLabel('Close settings').click()
	await page.locator('.garden-object').first().click()

	await expect(
		page.getByTestId('word-tray').locator('.word-line').first(),
	).toContainText(/[.!?]/)
})

test('puzzle mode fills scene gaps by dragging pieces', async ({ page }) => {
	await page.goto('/')

	await expect(page.getByTestId('mode-puzzle')).toBeVisible()

	await page.getByTestId('settings-button').click()
	const dialog = page.getByRole('dialog')
	await expect(dialog.getByTestId('mode-puzzle')).toBeVisible()
	await page.getByLabel('Close settings').click()

	await page.getByTestId('mode-puzzle').click()
	await expect(page.getByTestId('prompt')).toContainText('Puzzle garden.')
	const initialCount = await expectObjectCountBetween(
		page,
		5,
		6,
		'.puzzle-piece',
	)
	await expect(page.locator('.puzzle-gap')).toHaveCount(initialCount)

	const [firstPieceId] = await getPuzzlePieceIds(page)
	if (!firstPieceId) {
		throw new Error('Expected at least one puzzle piece')
	}
	await page.getByTestId(`puzzle-piece-${firstPieceId}`).click()
	await page.getByTestId(`puzzle-gap-${firstPieceId}`).click()
	await expect(page.getByTestId(`object-${firstPieceId}`)).toHaveCount(0)
	await expect(page.getByTestId(`puzzle-piece-${firstPieceId}`)).toBeVisible()

	await dragPuzzlePieceToGap(page, firstPieceId)
	await expect(page.getByTestId(`object-${firstPieceId}`)).toBeVisible()
	await expect(page.getByTestId(`puzzle-piece-${firstPieceId}`)).toHaveCount(0)

	const mismatchIds = await getPuzzlePieceIds(page)
	if (mismatchIds.length >= 2) {
		await dragPuzzlePieceToGap(page, mismatchIds[0], mismatchIds[1])
		await expect(
			page.getByTestId(`puzzle-piece-${mismatchIds[0]}`),
		).toBeVisible()
	}
	await expect(page.getByTestId('prompt')).not.toContainText(/wrong|try again/i)

	for (const objectId of await getPuzzlePieceIds(page)) {
		await dragPuzzlePieceToGap(page, objectId)
		await expect(page.getByTestId(`puzzle-piece-${objectId}`)).toHaveCount(0)
	}

	await expect(page.getByTestId('prompt')).toContainText('Puzzle garden.', {
		timeout: 3_000,
	})
	await expect(page.locator('.puzzle-gap')).toHaveCount(initialCount)
	await expect(page.locator('.puzzle-piece')).toHaveCount(initialCount)

	await page.getByTestId('mode-explore').click()
	await expect(page.getByTestId('prompt')).toContainText('Hello, garden.')
	await expect(page.getByTestId('prompt')).not.toHaveClass(/is-puzzle/)
})

test('settings panel can switch to the ocean animals pack', async ({
	page,
}) => {
	await page.goto('/')
	await page.getByTestId('settings-button').click()
	await page.getByTestId('pack-ocean-animals').click()
	await page.getByLabel('Close settings').click()

	await expect(page.getByTestId('scene-title')).toContainText('Ocean Cove')
	await expectObjectCountBetween(page, 5, 6)
	await page.locator('.garden-object').first().click()
	await expect(page.getByTestId('word-tray').locator('.word-line')).toHaveCount(
		2,
	)
})

test('settings panel can switch to numbers and English alphabet packs', async ({
	page,
}) => {
	await page.goto('/')
	await page.getByTestId('settings-button').click()
	await page.getByTestId('pack-numbers').click()
	await page.getByLabel('Close settings').click()

	await expect(page.getByTestId('scene-title')).toContainText('Number Meadow')
	await expectObjectCountBetween(page, 5, 6)
	await page.locator('.garden-object').first().click()
	await expect(page.getByTestId('word-tray').locator('.word-line')).toHaveCount(
		2,
	)

	await page.getByTestId('settings-button').click()
	await page.getByTestId('pack-english-alphabet').click()
	await page.getByLabel('Close settings').click()

	await expect(page.getByTestId('scene-title')).toContainText('Letters A-E')
	await expectObjectCountBetween(page, 4, 5)

	await page.getByTestId('settings-button').click()
	await page.getByTestId('set-alphabet-u-z').click()
	await page.getByLabel('Close settings').click()

	await expect(page.getByTestId('scene-title')).toContainText('Letters U-Z')
	await expectObjectCountBetween(page, 4, 5)
	await page.locator('.garden-object').first().click()
	await expect(page.getByTestId('word-tray').locator('.word-line')).toHaveCount(
		2,
	)
})

test('scene navigation shows another randomized scene', async ({ page }) => {
	await page.goto('/')

	await expectObjectCountBetween(page, 5, 6)
	await page.getByTestId('scene-next').click()

	await expect(page.getByTestId('scene-title')).toContainText('Pond Garden')
	await expectObjectCountBetween(page, 5, 6)
	await expect(page.getByTestId('scene-previous')).toBeEnabled()
})

test('runtime makes no calls to AI endpoints', async ({ page }) => {
	const forbiddenRequests: string[] = []
	const publicJsonRequests: string[] = []
	await page.route('**/*', async (route) => {
		const url = route.request().url()
		if (
			/openai|openrouter|anthropic|\/v1\/responses|\/v1\/images|\/v1\/chat\/completions/i.test(
				url,
			)
		) {
			forbiddenRequests.push(url)
		}
		const path = new URL(url).pathname
		if (path.endsWith('.json') && !path.startsWith('/content/packs/')) {
			publicJsonRequests.push(url)
		}
		await route.continue()
	})

	await page.goto('/')
	await page.locator('.garden-object').first().click()
	await page.getByTestId('mode-find').click()
	await page.locator('.garden-object').first().click()

	expect(forbiddenRequests).toEqual([])
	expect(publicJsonRequests).toEqual([])
})

test('mobile alphabet scenes keep toddler tap targets readable', async ({
	page,
}, testInfo) => {
	test.skip(testInfo.project.name !== 'mobile-chromium', 'mobile only')

	await page.goto('/')
	await page.getByTestId('settings-button').click()
	await page.getByTestId('pack-english-alphabet').click()
	await page.getByLabel('Close settings').click()

	await expect(page.getByTestId('scene-title')).toContainText('Letters A-E')
	await expectObjectCountBetween(page, 4, 5)

	for (const objectButton of await page.locator('.garden-object').all()) {
		const box = await objectButton.boundingBox()
		expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
		expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
	}
})
