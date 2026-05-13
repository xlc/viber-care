import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, type Locator, type Page, test } from '@playwright/test'
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
		if (captureWindow.__audioPlaySources) {
			captureWindow.__audioPlaySources.length = 0
		}
	})
}

async function getAudioPlaySources(page: Page) {
	return page.evaluate(() => {
		const captureWindow = window as AudioCaptureWindow
		return captureWindow.__audioPlaySources ?? []
	})
}

async function useDeterministicLayoutSeed(page: Page, seed: string) {
	await page.addInitScript((layoutSeed) => {
		Object.defineProperty(window.crypto, 'randomUUID', {
			configurable: true,
			value: () => layoutSeed,
		})
	}, seed)
}

function getPackObjectIds(packId: string) {
	const packPath = path.join(
		process.cwd(),
		'content',
		'packs',
		`${packId}.json`,
	)
	const pack = JSON.parse(readFileSync(packPath, 'utf8')) as {
		sets?: Array<{ itemIds?: unknown }>
	}
	if (!pack.sets) {
		throw new Error(`Pack ${packId} has no sets`)
	}
	const itemIds = new Set<string>()
	for (const set of pack.sets) {
		if (!Array.isArray(set.itemIds)) {
			throw new Error(`Pack ${packId} has a set without item ids`)
		}
		for (const itemId of set.itemIds) {
			if (typeof itemId !== 'string') {
				throw new Error(`Pack ${packId} has a non-string item id`)
			}
			itemIds.add(itemId)
		}
	}
	return [...itemIds]
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

async function expectTapTargetAtLeast(locator: Locator, minSize: number) {
	const box = await locator.boundingBox()
	if (!box) {
		throw new Error('Expected tap target to have a layout box')
	}

	expect(box.width).toBeGreaterThanOrEqual(minSize)
	expect(box.height).toBeGreaterThanOrEqual(minSize)
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

async function expectUnhighlightable(locator: Locator) {
	await expect(locator).toBeVisible()
	const styles = await locator.evaluate((element) => {
		const style = window.getComputedStyle(element)
		return {
			tapHighlightColor: style.getPropertyValue('-webkit-tap-highlight-color'),
			userSelect: style.userSelect,
			webkitUserSelect: style.getPropertyValue('-webkit-user-select'),
		}
	})

	expect([styles.userSelect, styles.webkitUserSelect]).toContain('none')
	expect(styles.tapHighlightColor).toMatch(/^(rgba\(0, 0, 0, 0\)|transparent)$/)
}

async function completeMathRound(page: Page) {
	const stage = page.getByTestId('math-stage')
	await expect(stage).toBeVisible()
	const roundType = await stage.getAttribute('data-round-type')
	if (!roundType) {
		throw new Error('Expected Math Play round type')
	}

	if (roundType === 'count-and-collect' || roundType === 'feed-the-friend') {
		const count = await page.locator('.math-object').count()
		for (let index = 0; index < count; index += 1) {
			await page.locator('.math-object').first().click()
		}
		return roundType
	}

	if (roundType === 'dot-match') {
		const dotCount = await page.locator('.dot-card .dot').count()
		await page
			.locator(`[data-testid^="dot-choice-"][data-testid$="-${dotCount}"]`)
			.first()
			.click()
		return roundType
	}

	if (roundType === 'color-sort') {
		for (;;) {
			const remainingItems = page.locator('.sort-items .math-object')
			const remaining = await remainingItems.count()
			if (remaining === 0) {
				break
			}
			const item = remainingItems.first()
			const label = await item.getAttribute('aria-label')
			const color = label?.match(/^Sort ([^ ]+) /)?.[1]
			if (!color) {
				throw new Error(`Expected sort item color in label "${label}"`)
			}
			await item.click()
			await expect(item).toHaveAttribute('aria-pressed', 'true')
			await page.getByTestId(`sort-basket-${color}`).click()
		}
		return roundType
	}

	throw new Error(`Unhandled Math Play round type ${roundType}`)
}

test('app loads', async ({ page }) => {
	await page.goto('/')

	await expect(page).toHaveTitle('Word Garden')
	await expect(page.getByTestId('scene-title')).toContainText('Sunny Garden')
	expect(await page.locator('.mode-segment button').allTextContents()).toEqual([
		'Explore',
		'Find',
		'Cards',
		'Math Play',
	])
	await expectObjectCountBetween(page, 8, 10)
	await expect(page.locator('.garden-object').first()).toHaveAttribute(
		'data-variant-id',
		/classic|bright-large/,
	)
})

test('viewport locks iOS pinch zoom', async ({ page }) => {
	await page.goto('/')

	const viewportContent = await page
		.locator('meta[name="viewport"]')
		.getAttribute('content')

	expect(viewportContent?.split(',').map((part) => part.trim())).toEqual([
		'width=device-width',
		'initial-scale=1',
		'minimum-scale=1',
		'maximum-scale=1',
		'user-scalable=no',
		'viewport-fit=cover',
	])
})

test('app surfaces cannot be browser-highlighted', async ({ page }) => {
	await page.goto('/')

	await expectUnhighlightable(page.locator('.app-shell'))
	await expectUnhighlightable(page.locator('.topbar'))
	await expectUnhighlightable(page.getByTestId('mode-explore'))
	await expectUnhighlightable(page.getByTestId('scene-title'))

	await expectObjectCountBetween(page, 8, 10)
	await expectUnhighlightable(page.locator('.garden-stage'))
	await expectUnhighlightable(page.locator('.garden-object').first())
	await expectUnhighlightable(page.locator('.garden-object img').first())

	await page.getByTestId('settings-button').click()
	await expectUnhighlightable(page.locator('.settings-panel'))
	await expectUnhighlightable(page.locator('.settings-panel input').first())
	await page.getByLabel('Close settings').click()

	await page.getByTestId('mode-math').click()
	await expectUnhighlightable(page.getByTestId('math-stage'))
	await expectUnhighlightable(page.locator('.math-object').first())
	await expectUnhighlightable(page.locator('.math-object img').first())
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

test('settings panel closes from the blurred background only', async ({
	page,
}) => {
	await page.goto('/')
	await page.getByTestId('settings-button').click()
	const dialog = page.getByRole('dialog')

	await expect(dialog).toBeVisible()
	await page.getByTestId('pack-numbers').click()
	await expect(dialog).toBeVisible()

	await page
		.locator('.settings-backdrop-button')
		.click({ position: { x: 8, y: 8 } })
	await expect(dialog).toHaveCount(0)
})

test('settings panel does not expose mode controls', async ({ page }) => {
	await page.goto('/')
	await page.getByTestId('settings-button').click()
	const dialog = page.getByRole('dialog')

	await expect(dialog.getByText('Mode', { exact: true })).toHaveCount(0)
	await expect(dialog.getByTestId('mode-explore')).toHaveCount(0)
	await expect(dialog.getByTestId('mode-find')).toHaveCount(0)
	await expect(dialog.getByTestId('mode-cards')).toHaveCount(0)
	await expect(dialog.getByTestId('mode-math')).toHaveCount(0)
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
	await expectTapTargetAtLeast(page.getByTestId('card-previous'), 60)
	await expectTapTargetAtLeast(page.getByTestId('card-next'), 60)
	await expect(page.locator('.card-controls button')).toHaveCount(2)
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

	await page.getByTestId('card-main').click()
	await expect.poll(() => getAudioPlayCount(page)).toBe(2)
	let audioSources = await getAudioPlaySources(page)
	expect(audioSources).toHaveLength(2)
	expect(audioSources[0]).toContain('-en-L0.mp3')
	expect(audioSources[1]).toContain('zh-Hans-L0.mp3')

	await resetAudioPlayCount(page)
	await page.getByTestId('card-word-0').click()
	await expect.poll(() => getAudioPlayCount(page)).toBe(1)
	audioSources = await getAudioPlaySources(page)
	expect(audioSources).toHaveLength(1)
	expect(audioSources[0]).toContain('-en-L0.mp3')

	await resetAudioPlayCount(page)
	await page.getByTestId('card-word-1').click()
	await expect.poll(() => getAudioPlayCount(page)).toBe(1)
	audioSources = await getAudioPlaySources(page)
	expect(audioSources).toHaveLength(1)
	expect(audioSources[0]).toContain('zh-Hans-L0.mp3')

	await page.getByTestId('mute-button').click()
	await expect(page.getByTestId('mute-button')).toHaveAttribute(
		'aria-pressed',
		'true',
	)
	await resetAudioPlayCount(page)
	await page.getByTestId('card-main').click()
	await expect.poll(() => getAudioPlayCount(page)).toBe(0)
})

test('math play count and collect advances a short round', async ({ page }) => {
	await page.goto('/')

	await expect(page.getByTestId('mode-math')).toBeVisible()
	await page.getByTestId('mode-math').click()

	await expect(page.getByTestId('prompt')).toContainText(/Put (one|two|three)/i)
	await expect(page.getByTestId('math-stage')).toBeVisible()
	await expect(page.getByTestId('math-stage')).toHaveAttribute(
		'data-round-type',
		'count-and-collect',
	)
	const initialCount = await page.locator('.math-object').count()
	expect(initialCount).toBeGreaterThan(0)
	expect(initialCount).toBeLessThanOrEqual(3)

	await page.locator('.math-object').first().click()
	await expect(page.locator('.math-basket-items img')).toHaveCount(1)
	await expect(page.getByTestId('prompt')).not.toContainText(/wrong|try again/i)

	for (let count = 1; count < initialCount; count += 1) {
		await page.locator('.math-object').first().click()
	}

	await expect(page.locator('.math-basket-items img')).toHaveCount(initialCount)
	await expect(page.getByTestId('prompt')).toContainText(
		/one|two|three|一|两|三/i,
	)
	await expect.poll(() => getAudioPlayCount(page)).toBe(0)
})

test('math play rotates through MVP mini-games', async ({ page }) => {
	await useDeterministicLayoutSeed(page, 'math-0')
	await page.goto('/')
	await page.getByTestId('settings-button').click()
	await page.getByTestId('pack-farm-friends').click()
	await page.getByLabel('Close settings').click()
	await page.getByTestId('mode-math').click()

	const seenRoundTypes = new Set<string>()
	for (let round = 0; round < 6; round += 1) {
		const roundType = await completeMathRound(page)
		seenRoundTypes.add(roundType)
		if (
			seenRoundTypes.has('count-and-collect') &&
			seenRoundTypes.has('feed-the-friend') &&
			seenRoundTypes.has('dot-match') &&
			seenRoundTypes.has('color-sort')
		) {
			break
		}
		await page.waitForTimeout(1600)
	}

	expect([...seenRoundTypes].sort()).toEqual([
		'color-sort',
		'count-and-collect',
		'dot-match',
		'feed-the-friend',
	])
	await expect(page.getByTestId('prompt')).not.toContainText(/wrong|try again/i)
})

test('settings panel can bias Math Play learning focus', async ({ page }) => {
	await useDeterministicLayoutSeed(page, 'math-0')
	await page.goto('/')
	await page.getByTestId('settings-button').click()
	await page.getByTestId('pack-fruits-and-vegetables').click()
	await expect(page.getByText('Learning Focus')).toBeVisible()
	await page.getByTestId('math-focus-colors').click()
	await page.getByLabel('Close settings').click()

	await page.getByTestId('mode-math').click()
	await expect(page.getByTestId('math-stage')).toHaveAttribute(
		'data-round-type',
		'color-sort',
	)
})

test('settings panel only offers playable Math Play learning focuses', async ({
	page,
}) => {
	await page.goto('/')
	await page.getByTestId('settings-button').click()

	await expect(page.getByTestId('math-focus-mixed')).toBeVisible()
	await expect(page.getByTestId('math-focus-counting-1-3')).toBeVisible()
	await expect(page.getByTestId('math-focus-colors')).toBeVisible()

	await page.getByTestId('pack-animals').click()
	await expect(page.getByTestId('math-focus-mixed')).toBeVisible()
	await expect(page.getByTestId('math-focus-counting-1-3')).toBeVisible()
	await expect(page.getByTestId('math-focus-colors')).toHaveCount(0)

	await page.getByTestId('pack-dinosaurs').click()
	await expect(page.getByText('Learning Focus')).toHaveCount(0)
	await page.getByLabel('Close settings').click()
	await expect(page.getByTestId('mode-math')).toBeDisabled()
})

test('unavailable learning focus falls back to playful Math Play', async ({
	page,
}) => {
	await page.goto('/')
	await page.getByTestId('settings-button').click()
	await page.getByTestId('pack-fruits-and-vegetables').click()
	await page.getByTestId('math-focus-colors').click()
	await page.getByTestId('pack-animals').click()
	await expect(page.getByTestId('math-focus-colors')).toHaveCount(0)
	await page.getByLabel('Close settings').click()

	await page.getByTestId('mode-math').click()
	await expect(page.getByTestId('math-stage')).toHaveAttribute(
		'data-round-type',
		'count-and-collect',
	)
	await expect(page.getByTestId('prompt')).toContainText(/Put (one|two|three)/i)
	await expect(page.getByTestId('prompt')).not.toContainText(
		/Try another set|wrong|try again/i,
	)
})

test('settings panel can switch to the animals pack and sets', async ({
	page,
}) => {
	await page.goto('/')
	await page.getByTestId('settings-button').click()

	const animalsObjectIds = getPackObjectIds('animals')
	const animalsPack = page.getByTestId('pack-animals')
	expect(animalsObjectIds).toHaveLength(61)
	await expect(animalsPack).toContainText('Animals')
	await expect(animalsPack).toContainText('61 words / 5 sets')
	await animalsPack.click()
	await expect(page.getByTestId('set-ocean-animals')).toHaveAttribute(
		'aria-pressed',
		'true',
	)
	await page.getByLabel('Close settings').click()

	await expect(page.getByTestId('scene-title')).toContainText('Ocean Cove')
	await expectObjectCountBetween(page, 8, 10)
	await page.locator('.garden-object').first().click()
	await expect(page.getByTestId('word-tray').locator('.word-line')).toHaveCount(
		2,
	)

	await page.getByTestId('settings-button').click()
	await page.getByTestId('set-forest-animals').click()
	await page.getByLabel('Close settings').click()

	await expect(page.getByTestId('scene-title')).toContainText('Forest Clearing')
	await expectObjectCountBetween(page, 8, 10)
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

test('scene navigation cycles through every set in the content pack', async ({
	page,
}) => {
	await page.goto('/')
	await page.getByTestId('settings-button').click()
	await page.getByTestId('pack-animals').click()
	await page.getByLabel('Close settings').click()

	await expect(page.getByTestId('scene-title')).toContainText('Ocean Cove')
	await expectObjectCountBetween(page, 8, 10)
	await expect(page.getByTestId('scene-previous')).toBeEnabled()
	await expect(page.getByTestId('scene-next')).toBeEnabled()

	await page.getByTestId('scene-previous').click()

	await expect(page.getByTestId('scene-title')).toContainText(
		'Pond Flower Garden',
	)
	await expectObjectCountBetween(page, 8, 10)

	await page.getByTestId('scene-next').click()

	await expect(page.getByTestId('scene-title')).toContainText('Ocean Cove')
	await expectObjectCountBetween(page, 8, 10)

	await page.getByTestId('scene-next').click()

	await expect(page.getByTestId('scene-title')).toContainText('Tide Pool')
	await expectObjectCountBetween(page, 8, 10)
	await expect(page.getByTestId('scene-next')).toBeEnabled()

	await page.getByTestId('scene-next').click()

	await expect(page.getByTestId('scene-title')).toContainText('Farm Pasture')
	await expectObjectCountBetween(page, 8, 10)
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
		if (
			path.endsWith('.json') &&
			!path.startsWith('/content/items/') &&
			!path.startsWith('/content/packs/')
		) {
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
