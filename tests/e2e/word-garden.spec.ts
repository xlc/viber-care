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
	await expect(page.getByTestId('prompt')).toContainText('Find the tree.', {
		timeout: 3_000,
	})
})

test('find mode names non-target taps without failure language', async ({
	page,
}) => {
	await page.goto('/')
	await page.getByTestId('mode-find').click()

	await expect(page.getByTestId('prompt')).toContainText('Find the sun.')
	await page.getByTestId('object-dog').click()
	await expect(page.getByTestId('word-tray')).toContainText('dog')
	await expect(page.getByTestId('prompt')).not.toContainText(/wrong|try again/i)
})

test('find mode handles immediate taps after alphabet scene changes', async ({
	page,
}) => {
	await page.goto('/')
	await page.getByTestId('mute-button').click()
	await page.getByTestId('settings-button').click()
	await page.getByTestId('pack-english-alphabet').click()
	await page.getByLabel('Close settings').click()
	await page.getByTestId('mode-find').click()

	await page.getByTestId('scene-next').click()
	await page.getByTestId('object-letter-f').click()

	await expect(page.getByTestId('prompt')).toContainText('You found letter F.')
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

test('settings panel can switch to numbers and English alphabet packs', async ({
	page,
}) => {
	await page.goto('/')
	await page.getByTestId('mute-button').click()
	await page.getByTestId('settings-button').click()
	await page.getByTestId('pack-numbers').click()
	await page.getByLabel('Close settings').click()

	await expect(page.getByText('Number Meadow')).toBeVisible()
	await expect(page.getByTestId('object-number-one')).toBeVisible()
	await expect(page.locator('.garden-object')).toHaveCount(10)
	await page.getByTestId('object-number-one').click()
	await expect(page.getByTestId('word-tray')).toContainText('one')
	await expect(page.getByTestId('word-tray')).toContainText('一')

	await page.getByTestId('settings-button').click()
	await page.getByTestId('pack-english-alphabet').click()
	await page.getByLabel('Close settings').click()

	await expect(page.getByTestId('scene-title')).toContainText('Letters A-E')
	await expect(page.getByTestId('object-letter-a')).toBeVisible()
	await expect(page.locator('.garden-object')).toHaveCount(5)

	for (let i = 0; i < 4; i++) {
		await page.getByTestId('scene-next').click()
	}

	await expect(page.getByTestId('scene-title')).toContainText('Letters U-Z')
	await expect(page.getByTestId('object-letter-z')).toBeVisible()
	await expect(page.locator('.garden-object')).toHaveCount(6)
	await page.getByTestId('object-letter-z').click()
	await expect(page.getByTestId('word-tray')).toContainText('Z')
	await expect(page.getByTestId('word-tray')).toContainText('字母 Z')
})

test('runtime makes no calls to OpenAI or AI endpoints', async ({ page }) => {
	const forbiddenRequests: string[] = []
	const publicJsonRequests: string[] = []
	await page.route('**/*', async (route) => {
		const url = route.request().url()
		if (
			/openai|anthropic|\/v1\/responses|\/v1\/images|\/v1\/chat\/completions/i.test(
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
	await page.getByTestId('object-duck').click()
	await page.getByTestId('mode-find').click()
	await page.getByTestId('object-sun').click()

	expect(forbiddenRequests).toEqual([])
	expect(publicJsonRequests).toEqual([])
})

test('mobile alphabet scenes keep toddler tap targets readable', async ({
	page,
}, testInfo) => {
	test.skip(testInfo.project.name !== 'mobile-chromium', 'mobile only')

	await page.goto('/')
	await page.getByTestId('mute-button').click()
	await page.getByTestId('settings-button').click()
	await page.getByTestId('pack-english-alphabet').click()
	await page.getByLabel('Close settings').click()

	await expect(page.getByTestId('scene-title')).toContainText('Letters A-E')
	await expect(page.locator('.garden-object')).toHaveCount(5)
	await expect(page.getByTestId('scene-next')).toBeVisible()

	for (const objectButton of await page.locator('.garden-object').all()) {
		const box = await objectButton.boundingBox()
		expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
		expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
	}
})
