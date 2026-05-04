import { describe, expect, it } from 'vitest'
import gardenPack from '../../content/packs/garden.json'
import {
	buildRuntimeCatalog,
	validateContentPacks,
} from '../../src/content/build-catalog'
import { buildLearningSequence, getPack } from '../../src/learning/engine'
import {
	DEFAULT_SETTINGS,
	type WordGardenSettings,
} from '../../src/state/settings'

const catalog = buildRuntimeCatalog(
	validateContentPacks([gardenPack]),
	'2026-05-04T00:00:00.000Z',
)
const duck = getPack(catalog).objects.find((object) => object.id === 'duck')
if (!duck) {
	throw new Error('Test setup failed: duck object not found')
}

describe('learning engine', () => {
	it('uses the configured language order', () => {
		const settings: WordGardenSettings = {
			...DEFAULT_SETTINGS,
			languageOrderPreset: 'zh-then-en',
		}

		const sequence = buildLearningSequence(duck, settings)

		expect(sequence.map((item) => item.resolvedLanguage)).toEqual([
			'zh-Hans',
			'en',
		])
		expect(sequence.map((item) => item.text)).toEqual(['鸭子', 'duck'])
	})

	it('falls back from incomplete advanced levels to available content', () => {
		const settings: WordGardenSettings = {
			...DEFAULT_SETTINGS,
			activeLevel: 'L4',
		}

		const sequence = buildLearningSequence(duck, settings)

		expect(sequence[0]?.requestedLevel).toBe('L4')
		expect(sequence[0]?.resolvedLevel).toBe('L1')
		expect(sequence[0]?.text).toBe('The duck says quack.')
	})
})
