import type { ObjectConcept } from '../content/schema'
import {
	MATH_FOCUS_OPTIONS,
	type MathFocus as MathPlayFocus,
} from '../state/settings'

export type MathPlayPlacement = {
	object: ObjectConcept
}

export type MathRoundType =
	| 'count-and-collect'
	| 'feed-the-friend'
	| 'dot-match'
	| 'color-sort'

export type CountAndCollectRound = {
	type: 'count-and-collect'
	targetObjectId: string
	targetQuantity: number
	collectedCount: number
}

export type FeedTheFriendRound = {
	type: 'feed-the-friend'
	friendObjectId: string
	itemObjectId: string
	targetQuantity: number
	collectedCount: number
}

export type DotMatchChoice = {
	id: string
	objectId: string
	quantity: number
}

export type DotMatchRound = {
	type: 'dot-match'
	targetObjectId: string
	targetQuantity: number
	choices: DotMatchChoice[]
	selectedChoiceId: string | null
	isComplete: boolean
}

export type ColorSortItem = {
	id: string
	objectId: string
	color: string
	placed: boolean
}

export type ColorSortRound = {
	type: 'color-sort'
	basketColors: string[]
	items: ColorSortItem[]
}

export type MathPlayRound =
	| CountAndCollectRound
	| FeedTheFriendRound
	| DotMatchRound
	| ColorSortRound

export type MathCollectResult = {
	isTarget: boolean
	collectedCount: number
	countedNumber: number | null
	isComplete: boolean
}

export type DotMatchResult = {
	isTarget: boolean
	selectedChoiceId: string
	isComplete: boolean
}

export type ColorSortResult = {
	isTarget: boolean
	items: ColorSortItem[]
	isComplete: boolean
}

export type CreateMathRoundOptions = {
	roundIndex?: number
	previousTargetId?: string
	focus?: MathPlayFocus
}

const mixedRoundOrder: MathRoundType[] = [
	'count-and-collect',
	'feed-the-friend',
	'dot-match',
	'color-sort',
]

const focusRoundOrder: Record<MathPlayFocus, MathRoundType[]> = {
	mixed: mixedRoundOrder,
	'counting-1-3': ['count-and-collect', 'feed-the-friend', 'dot-match'],
	colors: ['color-sort'],
}

const preferredFeedPairs: ReadonlyArray<{
	friendId: string
	itemId: string
}> = [
	{ friendId: 'rabbit', itemId: 'carrot' },
	{ friendId: 'duck', itemId: 'corn' },
	{ friendId: 'cow', itemId: 'corn' },
]

export function getMathCountableObjects(
	placements: readonly MathPlayPlacement[],
): ObjectConcept[] {
	return uniqueObjects(placements).filter(
		(object) =>
			object.math?.countable && object.math.skills.includes('counting'),
	)
}

export function createMathPlayRound(
	placements: readonly MathPlayPlacement[],
	options: CreateMathRoundOptions = {},
): MathPlayRound | null {
	const roundTypes = getOrderedRoundTypes(
		options.focus ?? 'mixed',
		options.roundIndex,
	)
	for (const roundType of roundTypes) {
		const round = createRoundByType(placements, roundType, options)
		if (round) {
			return round
		}
	}
	return null
}

export function getAvailableMathFocuses(
	placements: readonly MathPlayPlacement[],
): MathPlayFocus[] {
	return MATH_FOCUS_OPTIONS.filter((focus) =>
		getOrderedRoundTypes(focus).some((roundType) =>
			Boolean(createRoundByType(placements, roundType, {})),
		),
	)
}

export function handleMathCollect(
	round: CountAndCollectRound | FeedTheFriendRound,
	objectId: string,
): MathCollectResult {
	const targetObjectId =
		round.type === 'feed-the-friend' ? round.itemObjectId : round.targetObjectId
	if (objectId !== targetObjectId || isMathRoundComplete(round)) {
		return {
			isTarget: false,
			collectedCount: round.collectedCount,
			countedNumber: null,
			isComplete: isMathRoundComplete(round),
		}
	}

	const collectedCount = Math.min(
		round.collectedCount + 1,
		round.targetQuantity,
	)

	return {
		isTarget: true,
		collectedCount,
		countedNumber: collectedCount,
		isComplete: collectedCount === round.targetQuantity,
	}
}

export function handleDotMatch(
	round: DotMatchRound,
	choiceId: string,
): DotMatchResult {
	const choice = round.choices.find((candidate) => candidate.id === choiceId)
	const isTarget = choice?.quantity === round.targetQuantity
	return {
		isTarget,
		selectedChoiceId: choiceId,
		isComplete: isTarget,
	}
}

export function handleColorSort(
	round: ColorSortRound,
	itemId: string,
	basketColor: string,
): ColorSortResult {
	const item = round.items.find((candidate) => candidate.id === itemId)
	if (!item || item.placed || item.color !== basketColor) {
		return {
			isTarget: false,
			items: round.items,
			isComplete: isMathRoundComplete(round),
		}
	}

	const items = round.items.map((candidate) =>
		candidate.id === itemId ? { ...candidate, placed: true } : candidate,
	)
	return {
		isTarget: true,
		items,
		isComplete: items.every((candidate) => candidate.placed),
	}
}

export function isMathRoundComplete(round: MathPlayRound): boolean {
	switch (round.type) {
		case 'count-and-collect':
		case 'feed-the-friend':
			return round.collectedCount >= round.targetQuantity
		case 'dot-match':
			return round.isComplete
		case 'color-sort':
			return round.items.length > 0 && round.items.every((item) => item.placed)
	}
}

function createRoundByType(
	placements: readonly MathPlayPlacement[],
	roundType: MathRoundType,
	options: CreateMathRoundOptions,
): MathPlayRound | null {
	switch (roundType) {
		case 'count-and-collect':
			return createCountAndCollectRound(placements, options.previousTargetId)
		case 'feed-the-friend':
			return createFeedTheFriendRound(placements)
		case 'dot-match':
			return createDotMatchRound(placements, options.previousTargetId)
		case 'color-sort':
			return createColorSortRound(placements)
	}
}

function createCountAndCollectRound(
	placements: readonly MathPlayPlacement[],
	previousTargetId?: string,
): CountAndCollectRound | null {
	const countableObjects = getMathCountableObjects(placements)
	if (countableObjects.length === 0) {
		return null
	}

	const targetObject = getNextTargetObject(countableObjects, previousTargetId)
	return {
		type: 'count-and-collect',
		targetObjectId: targetObject.id,
		targetQuantity: getStarterQuantity(targetObject),
		collectedCount: 0,
	}
}

function createFeedTheFriendRound(
	placements: readonly MathPlayPlacement[],
): FeedTheFriendRound | null {
	const objects = uniqueObjects(placements)
	const preferredPair = preferredFeedPairs
		.map((pair) => ({
			friend: objects.find((object) => object.id === pair.friendId),
			item: objects.find((object) => object.id === pair.itemId),
		}))
		.find((pair): pair is { friend: ObjectConcept; item: ObjectConcept } =>
			Boolean(pair.friend && pair.item && isFeedItem(pair.item)),
		)

	if (!preferredPair) {
		return null
	}

	return {
		type: 'feed-the-friend',
		friendObjectId: preferredPair.friend.id,
		itemObjectId: preferredPair.item.id,
		targetQuantity: getStarterQuantity(preferredPair.item),
		collectedCount: 0,
	}
}

function createDotMatchRound(
	placements: readonly MathPlayPlacement[],
	previousTargetId?: string,
): DotMatchRound | null {
	const objects = uniqueObjects(placements).filter(
		(object) =>
			object.math?.countable && object.math.skills.includes('dot-match'),
	)
	if (objects.length === 0) {
		return null
	}

	const targetObject = getNextTargetObject(objects, previousTargetId)
	const targetQuantity = getStarterQuantity(targetObject)
	const distractorQuantity = targetQuantity === 1 ? 2 : 1
	const choices: DotMatchChoice[] = [
		{
			id: `${targetObject.id}-${targetQuantity}`,
			objectId: targetObject.id,
			quantity: targetQuantity,
		},
		{
			id: `${targetObject.id}-${distractorQuantity}`,
			objectId: targetObject.id,
			quantity: distractorQuantity,
		},
	]

	return {
		type: 'dot-match',
		targetObjectId: targetObject.id,
		targetQuantity,
		choices,
		selectedChoiceId: null,
		isComplete: false,
	}
}

function createColorSortRound(
	placements: readonly MathPlayPlacement[],
): ColorSortRound | null {
	const objectsByColor = new Map<string, ObjectConcept[]>()
	for (const object of uniqueObjects(placements)) {
		if (!object.math?.skills.includes('color-sort')) {
			continue
		}
		for (const color of object.math.colors ?? []) {
			const objects = objectsByColor.get(color) ?? []
			objects.push(object)
			objectsByColor.set(color, objects)
		}
	}

	const colors = [...objectsByColor.keys()].slice(0, 2)
	if (colors.length < 2) {
		return null
	}

	const items: ColorSortItem[] = colors.flatMap((color) =>
		(objectsByColor.get(color) ?? []).slice(0, 2).map((object, index) => ({
			id: `${color}-${object.id}-${index}`,
			objectId: object.id,
			color,
			placed: false,
		})),
	)

	if (items.length < 2) {
		return null
	}

	return {
		type: 'color-sort',
		basketColors: colors,
		items: items.slice(0, 4),
	}
}

function getOrderedRoundTypes(
	focus: MathPlayFocus,
	roundIndex = 0,
): MathRoundType[] {
	const roundTypes = focusRoundOrder[focus]
	const offset =
		roundTypes.length > 0
			? ((roundIndex % roundTypes.length) + roundTypes.length) %
				roundTypes.length
			: 0
	return [...roundTypes.slice(offset), ...roundTypes.slice(0, offset)]
}

function getStarterQuantity(object: ObjectConcept): number {
	const maxQuantity = Math.min(object.math?.quantityRange.max ?? 1, 3)
	return Math.min(maxQuantity, maxQuantity >= 2 ? 2 : 1)
}

function getNextTargetObject(
	objects: ObjectConcept[],
	previousTargetId?: string,
): ObjectConcept {
	const fallbackObject = objects[0]
	if (!fallbackObject) {
		throw new Error('Math Play needs at least one countable object.')
	}
	if (!previousTargetId || objects.length === 1) {
		return fallbackObject
	}

	const previousIndex = objects.findIndex(
		(object) => object.id === previousTargetId,
	)
	const nextIndex =
		previousIndex >= 0 ? (previousIndex + 1) % objects.length : 0
	return objects[nextIndex] ?? fallbackObject
}

function uniqueObjects(
	placements: readonly MathPlayPlacement[],
): ObjectConcept[] {
	const objects: ObjectConcept[] = []
	for (const placement of placements) {
		if (!objects.some((object) => object.id === placement.object.id)) {
			objects.push(placement.object)
		}
	}
	return objects
}

function isFeedItem(object: ObjectConcept): boolean {
	return Boolean(
		object.math?.countable &&
			(object.math.skills.includes('one-to-one') ||
				object.math.skills.includes('counting')) &&
			(object.category.includes('food') ||
				object.category.includes('fruit') ||
				object.category.includes('vegetable') ||
				object.tags.some((tag) =>
					['food', 'fruit', 'vegetable', 'corn', 'carrot'].includes(tag),
				)),
	)
}
