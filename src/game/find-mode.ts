import type { ObjectConcept } from '../content/schema'

export type FindRound = {
	targetObjectId: string
}

export type FindTapResult = {
	isTarget: boolean
	identifiedObjectId: string
	shouldRepeatPrompt: boolean
}

export function createFindRound(
	objects: ObjectConcept[],
	previousTargetId?: string,
): FindRound {
	if (objects.length === 0) {
		return { targetObjectId: '' }
	}

	if (!previousTargetId) {
		return { targetObjectId: objects[0]?.id ?? '' }
	}

	const previousIndex = objects.findIndex(
		(object) => object.id === previousTargetId,
	)
	const nextIndex =
		previousIndex >= 0 ? (previousIndex + 1) % objects.length : 0

	return { targetObjectId: objects[nextIndex]?.id ?? '' }
}

export function handleFindTap(
	round: FindRound,
	tappedObjectId: string,
): FindTapResult {
	const isTarget = tappedObjectId === round.targetObjectId
	return {
		isTarget,
		identifiedObjectId: tappedObjectId,
		shouldRepeatPrompt: !isTarget,
	}
}
