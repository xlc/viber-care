import { readFileSync } from 'node:fs'
import path from 'node:path'
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

async function resetAudioPlayCount(page: Page) {
	await page.evaluate(() => {
		const captureWindow = window as AudioCaptureWindow
		if (captureWindow.__audioPlayCount) {
			captureWindow.__audioPlayCount.count = 0
		}
	})
}

function getPackObjectIds(packId: string) {
	const packPath = path.join(
		process.cwd(),
		'content',
		'packs',
		`${packId}.json`,
	)
	const pack = JSON.parse(readFileSync(packPath, 'utf8')) as {
		objects?: Array<{ id?: unknown }>
	}
	if (!pack.objects) {
		throw new Error(`Pack ${packId} has no objects`)
	}
	return pack.objects.map((object) => {
		if (typeof object.id !== 'string') {
			throw new Error(`Pack ${packId} has an object without an id`)
		}
		return object.id
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

async function getLanguageCardSize(page: Page) {
	const box = await page.getByTestId('language-card').boundingBox()
	if (!box) {
		throw new Error('Expected language card to have a layout box')
	}

	return {
		width: Math.round(box.width),
		height: Math.round(box.height),
	}
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
	await expectObjectCountBetween(page, 8, 10)
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

test('find mode stays silent while muted', async ({ page }) => {
	await page.goto('/')
	await page.getByTestId('mode-find').click()

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

test('settings panel highlights the current pack selection', async ({
	page,
}) => {
	await page.goto('/')
	await page.getByTestId('settings-button').click()

	const gardenPack = page.getByTestId('pack-garden')
	const numbersPack = page.getByTestId('pack-numbers')
	await expect(gardenPack).toHaveAttribute('aria-pressed', 'true')
	await expect(gardenPack).toHaveClass(/is-selected/)
	await expect(numbersPack).toHaveAttribute('aria-pressed', 'false')
	await expect(numbersPack).not.toHaveClass(/is-selected/)

	await numbersPack.click()

	await expect(numbersPack).toHaveAttribute('aria-pressed', 'true')
	await expect(numbersPack).toHaveClass(/is-selected/)
	await expect(gardenPack).toHaveAttribute('aria-pressed', 'false')
	await expect(gardenPack).not.toHaveClass(/is-selected/)
})

test('settings panel does not expose mode controls', async ({ page }) => {
	await page.goto('/')
	await page.getByTestId('settings-button').click()
	const dialog = page.getByRole('dialog')

	await expect(dialog.getByText('Mode', { exact: true })).toHaveCount(0)
	await expect(dialog.getByTestId('mode-explore')).toHaveCount(0)
	await expect(dialog.getByTestId('mode-find')).toHaveCount(0)
	await expect(dialog.getByTestId('mode-puzzle')).toHaveCount(0)
	await expect(dialog.getByTestId('mode-cards')).toHaveCount(0)
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

test('cards mode shows pack-wide language cards', async ({ page }) => {
	await page.goto('/')

	await expect(page.getByTestId('mode-cards')).toBeVisible()
	await page.getByTestId('mode-cards').click()
	await expect(page.getByTestId('deck-title')).toContainText('Garden')
	await expect(page.getByTestId('language-card')).toBeVisible()
	await expect(
		page.getByTestId('card-words').locator('.word-line'),
	).toHaveCount(2)
	await expect(
		page
			.getByTestId('card-words')
			.locator('.word-line')
			.first()
			.locator('span'),
	).toHaveAttribute('lang', 'en')

	await page.getByTestId('settings-button').click()
	await page.getByTestId('preset-zh-then-en').click()
	await page.getByLabel('Close settings').click()
	await expect(
		page
			.getByTestId('card-words')
			.locator('.word-line')
			.first()
			.locator('span'),
	).toHaveAttribute('lang', 'zh-Hans')

	const gardenObjectIds = getPackObjectIds('garden')
	const visitedObjectIds = new Set<string>()
	for (let index = 0; index < gardenObjectIds.length; index += 1) {
		const objectId = await page
			.getByTestId('language-card')
			.getAttribute('data-object-id')
		if (objectId) {
			visitedObjectIds.add(objectId)
		}
		await page.getByTestId('card-next').click()
	}

	expect([...visitedObjectIds].sort()).toEqual([...gardenObjectIds].sort())
	await expect(page.getByTestId('language-card')).toHaveAttribute(
		'data-object-id',
		gardenObjectIds[0],
	)
})

test('cards mode keeps a fixed card size across the deck', async ({ page }) => {
	await page.goto('/')
	await page.getByTestId('mode-cards').click()
	await expect(page.getByTestId('language-card')).toBeVisible()

	const firstSize = await getLanguageCardSize(page)
	const visitedSizes = [firstSize]

	for (let index = 0; index < 4; index += 1) {
		await page.getByTestId('card-next').click()
		visitedSizes.push(await getLanguageCardSize(page))
	}

	for (const size of visitedSizes) {
		expect(Math.abs(size.width - firstSize.width)).toBeLessThanOrEqual(1)
		expect(Math.abs(size.height - firstSize.height)).toBeLessThanOrEqual(1)
	}
})

test('cards mode uses the whole selected pack deck', async ({ page }) => {
	await page.goto('/')
	await page.getByTestId('mode-cards').click()
	await page.getByTestId('settings-button').click()
	await page.getByTestId('pack-english-alphabet').click()
	await page.getByLabel('Close settings').click()

	const alphabetObjectIds = getPackObjectIds('english-alphabet')
	await expect(page.getByTestId('mode-cards')).toHaveAttribute(
		'aria-pressed',
		'true',
	)
	await expect(page.getByTestId('deck-title')).toContainText('English Alphabet')
	await expect(page.getByTestId('card-count')).toContainText(
		`1 / ${alphabetObjectIds.length}`,
	)

	await page.getByTestId('settings-button').click()
	await page.getByTestId('set-alphabet-u-z').click()
	await page.getByLabel('Close settings').click()
	await expect(page.getByTestId('mode-cards')).toHaveAttribute(
		'aria-pressed',
		'true',
	)
	await expect(page.getByTestId('card-count')).toContainText(
		`1 / ${alphabetObjectIds.length}`,
	)
})

test('cards audio is user initiated and respects mute', async ({ page }) => {
	await page.goto('/')
	await page.getByTestId('mute-button').click()
	await expect(page.getByTestId('mute-button')).toHaveAttribute(
		'aria-pressed',
		'false',
	)
	await resetAudioPlayCount(page)

	await page.getByTestId('mode-cards').click()
	await expect(page.getByTestId('language-card')).toBeVisible()
	await expect.poll(() => getAudioPlayCount(page)).toBe(0)

	await page.getByTestId('card-speak').click()
	await expect.poll(() => getAudioPlayCount(page)).toBeGreaterThan(0)

	await page.getByTestId('mute-button').click()
	await expect(page.getByTestId('mute-button')).toHaveAttribute(
		'aria-pressed',
		'true',
	)
	await resetAudioPlayCount(page)
	await page.getByTestId('card-main').click()
	await expect.poll(() => getAudioPlayCount(page)).toBe(0)
})

test('puzzle mode fills scene gaps by dragging pieces', async ({ page }) => {
	await page.goto('/')

	await expect(page.getByTestId('mode-puzzle')).toBeVisible()
	await page.getByTestId('mode-puzzle').click()
	await expect(page.getByTestId('prompt')).toContainText('Puzzle garden.')
	const initialCount = await expectObjectCountBetween(
		page,
		8,
		10,
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
	await expectObjectCountBetween(page, 8, 10)
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

	await expectObjectCountBetween(page, 8, 10)
	await page.getByTestId('scene-next').click()

	await expect(page.getByTestId('scene-title')).toContainText('Pond Garden')
	await expectObjectCountBetween(page, 8, 10)
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
