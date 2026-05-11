import { describe, expect, it } from 'vitest'
import {
	createPuzzleRound,
	getPuzzleTrayObjectIds,
	handlePuzzleDrop,
	isPuzzleComplete,
} from '../../src/game/puzzle-mode'

const placements = [
	{ object: { id: 'sun' } },
	{ object: { id: 'tree' } },
	{ object: { id: 'duck' } },
]

describe('Puzzle mode behavior', () => {
	it('creates a whole-scene round with a rotated tray order', () => {
		const round = createPuzzleRound(placements, 1)

		expect(round.trayObjectIds).toEqual(['tree', 'duck', 'sun'])
		expect(round.placedObjectIds).toEqual([])
		expect(getPuzzleTrayObjectIds(round)).toEqual(['tree', 'duck', 'sun'])
	})

	it('places only a matching object into its gap', () => {
		const round = createPuzzleRound(placements)

		const result = handlePuzzleDrop(round, 'sun', 'sun')

		expect(result.isMatch).toBe(true)
		expect(result.placedObjectIds).toEqual(['sun'])
		expect(result.isComplete).toBe(false)
		expect(
			getPuzzleTrayObjectIds({
				...round,
				placedObjectIds: result.placedObjectIds,
			}),
		).toEqual(['tree', 'duck'])
	})

	it('returns wrong drops to the tray without changing placement state', () => {
		const round = createPuzzleRound(placements)

		const result = handlePuzzleDrop(round, 'sun', 'tree')

		expect(result.isMatch).toBe(false)
		expect(result.placedObjectIds).toEqual([])
		expect(result.isComplete).toBe(false)
		expect(getPuzzleTrayObjectIds(round)).toEqual(['sun', 'tree', 'duck'])
	})

	it('ignores object ids that are not part of the round', () => {
		const round = createPuzzleRound(placements)

		const result = handlePuzzleDrop(round, 'moon', 'moon')

		expect(result.isMatch).toBe(false)
		expect(result.placedObjectIds).toEqual([])
		expect(result.isComplete).toBe(false)
	})

	it('detects completion only after every scene object is placed', () => {
		let round = createPuzzleRound(placements)
		for (const objectId of round.trayObjectIds) {
			const result = handlePuzzleDrop(round, objectId, objectId)
			round = { ...round, placedObjectIds: result.placedObjectIds }
		}

		expect(isPuzzleComplete(round)).toBe(true)
		expect(getPuzzleTrayObjectIds(round)).toEqual([])
	})

	it('does not treat duplicate placements as a complete puzzle', () => {
		expect(
			isPuzzleComplete({
				trayObjectIds: ['sun', 'tree'],
				placedObjectIds: ['sun', 'sun'],
			}),
		).toBe(false)
	})
})
