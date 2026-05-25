import { expect, type Locator, type Page, test } from '@playwright/test'
import {
	DEFAULT_SETTINGS,
	SETTINGS_STORAGE_KEY,
} from '../../src/state/settings'

const VIEWPORTS = [
	{
		name: 'iPhone portrait',
		width: 390,
		height: 844,
		minCardHeight: 500,
		minSceneHeight: 230,
	},
	{
		name: 'iPhone landscape',
		width: 844,
		height: 390,
		minCardHeight: 200,
		minSceneHeight: 200,
	},
	{
		name: 'iPad portrait',
		width: 820,
		height: 1180,
		minCardHeight: 800,
		minSceneHeight: 500,
	},
	{
		name: 'iPad landscape',
		width: 1180,
		height: 820,
		minCardHeight: 520,
		minSceneHeight: 560,
	},
]

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
		},
		{
			settingsKey: SETTINGS_STORAGE_KEY,
			mutedSettings: { ...DEFAULT_SETTINGS, muted: true },
		},
	)
})

for (const viewport of VIEWPORTS) {
	test(`release layout fits ${viewport.name}`, async ({ page }) => {
		await page.setViewportSize({
			width: viewport.width,
			height: viewport.height,
		})
		await page.goto('/')

		await expectNoHorizontalOverflow(page)
		await expect(page.getByTestId('mute-button')).toBeVisible()
		await expect(page.getByTestId('settings-button')).toBeVisible()
		await expect(page.getByTestId('pack-card-mimi-rides-the-bus')).toBeVisible()
		await expect(
			page.getByTestId('start-story-mimi-rides-the-bus'),
		).toBeVisible()
		await expect(
			page.getByTestId('start-cards-mimi-rides-the-bus'),
		).toBeVisible()

		await page.getByTestId('start-story-mimi-rides-the-bus').click()
		await expectNoHorizontalOverflow(page)
		await expectNoVerticalOverflow(page)
		await expect(page.getByTestId('scene-text')).toBeVisible()
		await expectUsableBox(
			page.locator('.scene-image'),
			220,
			viewport.minSceneHeight,
		)
		await expectAspectRatio(page.locator('.scene-image'), 1.5)
		await expect(page.getByTestId('scene-item-bus-stop')).toBeVisible()
		await expect(page.getByTestId('replay-scene')).toBeVisible()
		await expect(
			page.getByRole('button', { name: 'Previous scene' }),
		).toBeVisible()
		await expect(page.getByRole('button', { name: 'Next scene' })).toBeVisible()

		await page.getByRole('button', { name: 'Back' }).click()
		await page.getByTestId('start-cards-mimi-rides-the-bus').click()
		await expectNoHorizontalOverflow(page)
		await expectNoVerticalOverflow(page)
		await expectUsableBox(
			page.getByTestId('vocabulary-card'),
			240,
			viewport.minCardHeight,
		)
		await expect(
			page.getByRole('button', { name: 'Previous card' }),
		).toBeVisible()
		await expect(page.getByRole('button', { name: 'Next card' })).toBeVisible()

		await page.getByTestId('settings-button').click()
		await expectNoHorizontalOverflow(page)
		await expect(page.getByTestId('settings-panel')).toBeVisible()
		await expect(
			page.getByRole('dialog').getByRole('button', { name: 'Close' }),
		).toBeVisible()
	})
}

async function expectNoHorizontalOverflow(page: Page) {
	const overflow = await page.evaluate(() => {
		return Math.ceil(document.documentElement.scrollWidth - window.innerWidth)
	})

	expect(overflow).toBeLessThanOrEqual(1)
}

async function expectNoVerticalOverflow(page: Page) {
	const overflow = await page.evaluate(() => {
		return Math.ceil(document.documentElement.scrollHeight - window.innerHeight)
	})

	expect(overflow).toBeLessThanOrEqual(1)
}

async function expectUsableBox(
	locator: Locator,
	minWidth: number,
	minHeight: number,
) {
	await locator.scrollIntoViewIfNeeded()
	const box = await locator.boundingBox()

	expect(box).not.toBeNull()
	expect(box?.width ?? 0).toBeGreaterThanOrEqual(minWidth)
	expect(box?.height ?? 0).toBeGreaterThanOrEqual(minHeight)
}

async function expectAspectRatio(
	locator: Locator,
	expectedRatio: number,
	tolerance = 0.03,
) {
	const box = await locator.boundingBox()
	expect(box).not.toBeNull()

	const ratio = (box?.width ?? 0) / (box?.height || 1)
	expect(Math.abs(ratio - expectedRatio)).toBeLessThanOrEqual(tolerance)
}
