import { describe, expect, it } from 'vitest'
import type { ObjectConcept } from '../../src/content/schema'
import {
	createMathPlayRound,
	getAvailableMathFocuses,
	getMathCountableObjects,
	handleColorSort,
	handleDotMatch,
	handleMathCollect,
	isMathRoundComplete,
	type MathPlayRound,
} from '../../src/game/math-play-mode'

const apple = createObject('apple', 'food', ['food', 'fruit'], {
	countable: true,
	quantityRange: { min: 1, max: 5 },
	skills: ['counting', 'one-to-one', 'dot-match', 'color-sort'],
	colors: ['red'],
	zhMeasureWord: '个',
	englishPlural: 'apples',
})
const banana = createObject('banana', 'food', ['food', 'fruit'], {
	countable: true,
	quantityRange: { min: 1, max: 5 },
	skills: ['counting', 'one-to-one', 'dot-match', 'color-sort'],
	colors: ['yellow'],
	zhMeasureWord: '根',
	englishPlural: 'bananas',
})
const carrot = createObject('carrot', 'farm-food', ['food', 'carrot'], {
	countable: true,
	quantityRange: { min: 1, max: 5 },
	skills: ['counting', 'one-to-one', 'dot-match', 'color-sort'],
	colors: ['orange'],
	zhMeasureWord: '根',
	englishPlural: 'carrots',
})
const rabbit = createObject('rabbit', 'animal', ['animal', 'rabbit'], {
	countable: true,
	quantityRange: { min: 1, max: 3 },
	skills: ['counting', 'one-to-one', 'dot-match'],
	colors: ['white'],
	zhMeasureWord: '只',
	englishPlural: 'rabbits',
})
const spatialOnlyDuck = createObject('duck', 'animal', ['animal', 'duck'], {
	countable: true,
	quantityRange: { min: 1, max: 3 },
	skills: ['spatial'],
})
const sun = createObject('sun', 'nature', ['sky'])

const placements = [apple, banana, carrot, rabbit].map((object) => ({ object }))

describe('Math Play round behavior', () => {
	it('chooses only visible math-countable objects with counting skill', () => {
		const objects = getMathCountableObjects([
			{ object: apple },
			{ object: spatialOnlyDuck },
			{ object: sun },
		])

		expect(objects.map((object) => object.id)).toEqual(['apple'])
	})

	it('rotates Count and Collect targets without repeating when possible', () => {
		const firstRound = createMathPlayRound(placements, {
			roundIndex: 0,
		})
		const secondRound = createMathPlayRound(placements, {
			roundIndex: 0,
			previousTargetId:
				firstRound?.type === 'count-and-collect'
					? firstRound.targetObjectId
					: undefined,
		})

		expect(firstRound?.type).toBe('count-and-collect')
		expect(secondRound?.type).toBe('count-and-collect')
		if (
			firstRound?.type === 'count-and-collect' &&
			secondRound?.type === 'count-and-collect'
		) {
			expect(secondRound.targetObjectId).not.toBe(firstRound.targetObjectId)
		}
	})

	it('starts with one and keeps the counting focus within 1-3', () => {
		const round = createMathPlayRound(placements, { roundIndex: 0 })

		expect(round?.type).toBe('count-and-collect')
		if (round?.type !== 'count-and-collect') {
			throw new Error('Expected Count and Collect round')
		}
		expect(round.targetQuantity).toBe(1)

		const stretchRound = createMathPlayRound(placements, {
			roundIndex: 2,
			focus: 'counting-1-3',
		})
		expect(stretchRound?.type).toBe('dot-match')
		if (stretchRound?.type !== 'dot-match') {
			throw new Error('Expected Dot Match round')
		}
		expect(stretchRound.targetQuantity).toBe(3)
	})

	it('increments collected count and completes target collection rounds', () => {
		const round: MathPlayRound = {
			type: 'count-and-collect',
			targetObjectId: 'apple',
			targetQuantity: 2,
			collectedCount: 1,
		}

		const result = handleMathCollect(round, 'apple')

		expect(result).toMatchObject({
			isTarget: true,
			collectedCount: 2,
			countedNumber: 2,
			isComplete: true,
		})
		expect(isMathRoundComplete({ ...round, collectedCount: 2 })).toBe(true)
	})

	it('ignores non-target collection taps without failure state', () => {
		const round: MathPlayRound = {
			type: 'count-and-collect',
			targetObjectId: 'apple',
			targetQuantity: 2,
			collectedCount: 0,
		}

		expect(handleMathCollect(round, 'banana')).toEqual({
			isTarget: false,
			collectedCount: 0,
			countedNumber: null,
			isComplete: false,
		})
	})

	it('builds Feed the Friend with a compatible friend and item', () => {
		const round = createMathPlayRound(placements, { roundIndex: 1 })

		expect(round).toMatchObject({
			type: 'feed-the-friend',
			friendObjectId: 'rabbit',
			itemObjectId: 'carrot',
		})
	})

	it('does not invent Feed the Friend pairings from generic animals and food', () => {
		const round = createMathPlayRound(
			[{ object: rabbit }, { object: banana }, { object: apple }],
			{ roundIndex: 1 },
		)

		expect(round?.type).not.toBe('feed-the-friend')
	})

	it('rotates across playable rounds when a preferred round is unavailable', () => {
		const rounds = [0, 1, 2].map(
			(roundIndex) =>
				createMathPlayRound([{ object: apple }, { object: banana }], {
					roundIndex,
				})?.type,
		)

		expect(rounds).toEqual(['count-and-collect', 'color-sort', 'dot-match'])
	})

	it('builds Dot Match with one correct and one distractor quantity', () => {
		const round = createMathPlayRound(placements, { roundIndex: 3 })

		expect(round?.type).toBe('dot-match')
		if (round?.type !== 'dot-match') {
			throw new Error('Expected dot match round')
		}

		expect(
			round.choices.some((choice) => choice.quantity === round.targetQuantity),
		).toBe(true)
		expect(new Set(round.choices.map((choice) => choice.quantity)).size).toBe(2)
		const correctChoice = round.choices.find(
			(choice) => choice.quantity === round.targetQuantity,
		)
		if (!correctChoice) {
			throw new Error('Expected a correct dot choice')
		}

		expect(handleDotMatch(round, correctChoice.id)).toMatchObject({
			isTarget: true,
			isComplete: true,
		})
	})

	it('builds Color Sort and places objects into matching baskets', () => {
		const round = createMathPlayRound(placements, { roundIndex: 2 })

		expect(round?.type).toBe('color-sort')
		if (round?.type !== 'color-sort') {
			throw new Error('Expected color sort round')
		}
		expect(round.items).toHaveLength(2)
		expect(new Set(round.items.map((item) => item.color)).size).toBe(2)

		const firstItem = round.items[0]
		if (!firstItem) {
			throw new Error('Expected a sort item')
		}

		const mismatch = handleColorSort(round, firstItem.id, 'not-a-color')
		expect(mismatch.isTarget).toBe(false)
		const match = handleColorSort(round, firstItem.id, firstItem.color)
		expect(match.isTarget).toBe(true)
		expect(match.items.find((item) => item.id === firstItem.id)?.placed).toBe(
			true,
		)
	})

	it('biases round selection with learning focus', () => {
		expect(createMathPlayRound(placements, { focus: 'colors' })?.type).toBe(
			'color-sort',
		)
		expect(
			createMathPlayRound([{ object: sun }], { focus: 'colors' }),
		).toBeNull()
	})

	it('reports only playable learning focuses for the available content', () => {
		expect(getAvailableMathFocuses(placements)).toEqual([
			'mixed',
			'counting-1-3',
			'colors',
		])
		expect(getAvailableMathFocuses([{ object: rabbit }])).toEqual([
			'mixed',
			'counting-1-3',
		])
		expect(getAvailableMathFocuses([{ object: sun }])).toEqual([])
	})
})

function createObject(
	id: string,
	category: string,
	tags: string[],
	math?: ObjectConcept['math'],
): ObjectConcept {
	return {
		id,
		category,
		tags,
		visualPrompt: `${id} prompt`,
		interaction: {
			id: `${id}-bob`,
			animation: 'bob',
		},
		variants: [createVariant(`${id}-classic`), createVariant(`${id}-bright`)],
		content: {
			en: createLanguageContent(id, 'en'),
			'zh-Hans': createLanguageContent(id, 'zh-Hans'),
		},
		...(math ? { math } : {}),
	}
}

function createVariant(id: string): ObjectConcept['variants'][number] {
	return {
		id,
		label: id,
		image: {
			type: 'image',
			path: `/assets/${id}.png`,
		},
		visualPrompt: `${id} prompt`,
		scaleMultiplier: 1,
	}
}

function createLanguageContent(
	id: string,
	language: 'en' | 'zh-Hans',
): ObjectConcept['content']['en'] {
	return {
		language,
		displayName: language === 'en' ? 'English' : 'Simplified Chinese',
		findPrompt: `Find ${id}.`,
		successPhrase: `You found ${id}.`,
		fallbackText: id,
		levels: {
			L0: {
				text: id,
				audioText: id,
			},
		},
	}
}
