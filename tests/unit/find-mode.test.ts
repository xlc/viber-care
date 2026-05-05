import { describe, expect, it } from 'vitest'
import { catalog } from '../../src/content/catalog'
import { createFindRound, handleFindTap } from '../../src/game/find-mode'
import { getPack } from '../../src/learning/engine'

const objects = getPack(catalog).objects

describe('Find mode target behavior', () => {
	it('celebrates the target tap', () => {
		const round = createFindRound(objects)
		const result = handleFindTap(round, round.targetObjectId)

		expect(result.isTarget).toBe(true)
		expect(result.shouldRepeatPrompt).toBe(false)
	})

	it('identifies another object positively and repeats the prompt', () => {
		const round = { targetObjectId: 'duck' }
		const result = handleFindTap(round, 'dog')

		expect(result.isTarget).toBe(false)
		expect(result.identifiedObjectId).toBe('dog')
		expect(result.shouldRepeatPrompt).toBe(true)
	})
})
