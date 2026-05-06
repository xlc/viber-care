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

	it('rotates through every object instead of repeating the first pair', () => {
		const firstRound = createFindRound(objects)
		const secondRound = createFindRound(objects, firstRound.targetObjectId)
		const thirdRound = createFindRound(objects, secondRound.targetObjectId)

		expect(firstRound.targetObjectId).toBe(objects[0]?.id)
		expect(secondRound.targetObjectId).toBe(objects[1]?.id)
		expect(thirdRound.targetObjectId).toBe(objects[2]?.id)
	})

	it('identifies another object positively and repeats the prompt', () => {
		const round = { targetObjectId: 'duck' }
		const result = handleFindTap(round, 'dog')

		expect(result.isTarget).toBe(false)
		expect(result.identifiedObjectId).toBe('dog')
		expect(result.shouldRepeatPrompt).toBe(true)
	})
})
