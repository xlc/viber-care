import { expect, test } from '@playwright/test'

test('app loads', async ({ page }) => {
	await page.goto('/')

	await expect(page.getByRole('heading', { name: 'Word Garden' })).toBeVisible()
	await expect(page.getByTestId('object-duck')).toBeVisible()
	await expect(page.locator('.garden-object')).toHaveCount(10)
})

test('explore tap displays the word', async ({ page }) => {
	await page.goto('/')
	await page.getByTestId('object-duck').click()

	await expect(page.getByTestId('word-tray')).toContainText('duck')
	await expect(page.getByTestId('word-tray')).toContainText('鸭子')
})

test('mute toggles', async ({ page }) => {
	await page.goto('/')
	const muteButton = page.getByTestId('mute-button')

	await expect(muteButton).toHaveAttribute('aria-pressed', 'false')
	await muteButton.click()
	await expect(muteButton).toHaveAttribute('aria-pressed', 'true')
})

test('find mode accepts target tap', async ({ page }) => {
	await page.goto('/')
	await page.getByTestId('mode-find').click()

	await expect(page.getByTestId('prompt')).toContainText('Find the sun.')
	await page.getByTestId('object-sun').click()
	await expect(page.getByTestId('prompt')).toContainText('You found the sun.')
})

test('settings panel can change language order', async ({ page }) => {
	await page.goto('/')
	await page.getByTestId('settings-button').click()
	await page.getByTestId('preset-zh-then-en').click()
	await page.getByLabel('Close settings').click()
	await page.getByTestId('object-duck').click()

	const firstWord = page.getByTestId('word-tray').locator('.word-line').first()
	await expect(firstWord).toContainText('鸭子')
})

test('settings panel can switch to the ocean animals pack', async ({
	page,
}) => {
	await page.goto('/')
	await page.getByTestId('settings-button').click()
	await page.getByTestId('pack-ocean-animals').click()
	await page.getByLabel('Close settings').click()

	await expect(page.getByText('Ocean Cove')).toBeVisible()
	await expect(page.getByTestId('object-whale')).toBeVisible()
	await page.getByTestId('object-whale').click()
	await expect(page.getByTestId('word-tray')).toContainText('whale')
	await expect(page.getByTestId('word-tray')).toContainText('鲸鱼')
})

test('runtime makes no calls to OpenAI or AI endpoints', async ({ page }) => {
	const forbiddenRequests: string[] = []
	await page.route('**/*', async (route) => {
		const url = route.request().url()
		if (
			/openai|anthropic|\/v1\/responses|\/v1\/images|\/v1\/chat\/completions/i.test(
				url,
			)
		) {
			forbiddenRequests.push(url)
		}
		await route.continue()
	})

	await page.goto('/')
	await page.getByTestId('object-duck').click()
	await page.getByTestId('mode-find').click()
	await page.getByTestId('object-sun').click()

	expect(forbiddenRequests).toEqual([])
})
