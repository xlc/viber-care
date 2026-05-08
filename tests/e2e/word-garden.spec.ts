import { expect, type Page, test } from '@playwright/test'

type SpeechCaptureWindow = Window & {
	__spokenUtterances?: string[]
}

async function installSpeechCapture(page: Page) {
	await page.addInitScript(() => {
		const spokenUtterances: string[] = []
		Object.defineProperty(window, '__spokenUtterances', {
			configurable: true,
			value: spokenUtterances,
		})

		class MockSpeechSynthesisUtterance extends EventTarget {
			lang = ''
			pitch = 1
			rate = 1
			text: string
			volume = 1

			constructor(text?: string) {
				super()
				this.text = text ?? ''
			}
		}

		Object.defineProperty(window, 'SpeechSynthesisUtterance', {
			configurable: true,
			value: MockSpeechSynthesisUtterance,
		})
		Object.defineProperty(window, 'speechSynthesis', {
			configurable: true,
			value: {
				cancel() {},
				speak(utterance: SpeechSynthesisUtterance) {
					spokenUtterances.push(utterance.text)
					queueMicrotask(() => utterance.dispatchEvent(new Event('end')))
				},
			},
		})
	})
}

async function getSpokenUtterances(page: Page) {
	return page.evaluate(() => {
		const captureWindow = window as SpeechCaptureWindow
		return captureWindow.__spokenUtterances ?? []
	})
}

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

test('find mode handles immediate taps after alphabet set changes', async ({
	page,
}) => {
	await page.goto('/')
	await page.getByTestId('mute-button').click()
	await page.getByTestId('settings-button').click()
	await page.getByTestId('pack-english-alphabet').click()
	await page.getByTestId('set-alphabet-f-j').click()
	await page.getByLabel('Close settings').click()
	await page.getByTestId('mode-find').click()

	await page.getByTestId('object-letter-f').click()

	await expect(page.getByTestId('prompt')).toContainText('You found letter F.')
})

test('find mode announces the task when selected from settings', async ({
	page,
}) => {
	await installSpeechCapture(page)
	await page.goto('/')
	await page.getByTestId('settings-button').click()
	await page.getByRole('dialog').getByTestId('mode-find').click()

	await expect.poll(() => getSpokenUtterances(page)).toContain('Find the sun.')
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
	await page.getByTestId('object-duck').click()

	await expect(page.getByTestId('word-tray')).toContainText(
		'The duck paddles by the pond.',
	)
})

test('puzzle mode fills scene gaps', async ({ page }) => {
	await page.goto('/')

	await expect(page.getByTestId('mode-puzzle')).toBeVisible()

	await page.getByTestId('settings-button').click()
	const dialog = page.getByRole('dialog')
	await expect(dialog.getByTestId('mode-puzzle')).toBeVisible()
	await page.getByLabel('Close settings').click()

	await page.getByTestId('mode-puzzle').click()
	await expect(page.getByTestId('prompt')).toContainText('Puzzle garden.')
	await expect(page.locator('.puzzle-gap')).toHaveCount(10)
	await expect(page.locator('.puzzle-piece')).toHaveCount(10)

	await page
		.getByTestId('puzzle-piece-sun')
		.dragTo(page.getByTestId('puzzle-gap-sun'))
	await expect(page.getByTestId('object-sun')).toBeVisible()
	await expect(page.getByTestId('puzzle-piece-sun')).toHaveCount(0)

	await page.getByTestId('puzzle-piece-tree').click()
	await page.getByTestId('puzzle-gap-duck').click()
	await expect(page.getByTestId('puzzle-piece-tree')).toBeVisible()
	await expect(page.getByTestId('prompt')).not.toContainText(/wrong|try again/i)

	const remainingObjectIds = [
		'tree',
		'flower',
		'duck',
		'fish',
		'dog',
		'cat',
		'apple',
		'banana',
		'ball',
	]
	for (const objectId of remainingObjectIds) {
		await page.getByTestId(`puzzle-piece-${objectId}`).click()
		await page.getByTestId(`puzzle-gap-${objectId}`).click()
	}

	await expect(page.getByTestId('prompt')).toContainText('Puzzle garden.', {
		timeout: 3_000,
	})
	await expect(page.locator('.puzzle-gap')).toHaveCount(10)
	await expect(page.locator('.puzzle-piece')).toHaveCount(10)

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

	await page.getByTestId('settings-button').click()
	await page.getByTestId('set-alphabet-u-z').click()
	await page.getByLabel('Close settings').click()

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

	for (const objectButton of await page.locator('.garden-object').all()) {
		const box = await objectButton.boundingBox()
		expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
		expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
	}
})
