import { describe, expect, it } from 'vitest'
import { catalog } from '../../src/content/catalog'
import type { ObjectConcept } from '../../src/content/schema'
import { buildLearningSequence, getPack } from '../../src/learning/engine'
import {
	DEFAULT_SETTINGS,
	type WordGardenSettings,
} from '../../src/state/settings'

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

	it('keeps committed audio paths on learning presentations', () => {
		const sequence = buildLearningSequence(duck, DEFAULT_SETTINGS)

		expect(sequence[0]?.audioPath).toBe(
			'/assets/generated/garden/audio/duck-en-L0.mp3',
		)
		expect(sequence[1]?.audioPath).toBe(
			'/assets/generated/garden/audio/duck-zh-Hans-L0.mp3',
		)
	})

	it('falls back from incomplete advanced levels to available content', () => {
		const incompleteDuck = JSON.parse(JSON.stringify(duck)) as ObjectConcept
		delete incompleteDuck.content.en.levels.L2
		delete incompleteDuck.content.en.levels.L3
		delete incompleteDuck.content.en.levels.L4
		delete incompleteDuck.content.en.levels.L5

		const settings: WordGardenSettings = {
			...DEFAULT_SETTINGS,
			activeLevel: 'L4',
		}

		const sequence = buildLearningSequence(incompleteDuck, settings)

		expect(sequence[0]?.requestedLevel).toBe('L4')
		expect(sequence[0]?.resolvedLevel).toBe('L1')
		expect(sequence[0]?.text).toBe('The duck says quack.')
	})
})
