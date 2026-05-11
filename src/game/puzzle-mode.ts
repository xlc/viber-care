export type PuzzlePlacement = {
	object: {
		id: string
	}
}

export type PuzzleRound = {
	trayObjectIds: string[]
	placedObjectIds: string[]
}

export type PuzzleDropResult = {
	isMatch: boolean
	placedObjectIds: string[]
	isComplete: boolean
}

function rotateIds(ids: string[], rotation: number): string[] {
	if (ids.length === 0) {
		return []
	}

	const offset = ((rotation % ids.length) + ids.length) % ids.length
	return [...ids.slice(offset), ...ids.slice(0, offset)]
}

export function createPuzzleRound(
	placements: readonly PuzzlePlacement[],
	rotation = 0,
): PuzzleRound {
	const objectIds: string[] = []
	for (const placement of placements) {
		if (!objectIds.includes(placement.object.id)) {
			objectIds.push(placement.object.id)
		}
	}

	return {
		trayObjectIds: rotateIds(objectIds, rotation),
		placedObjectIds: [],
	}
}

export function getPuzzleTrayObjectIds(round: PuzzleRound): string[] {
	return round.trayObjectIds.filter(
		(objectId) => !round.placedObjectIds.includes(objectId),
	)
}

export function handlePuzzleDrop(
	round: PuzzleRound,
	objectId: string,
	targetObjectId: string,
): PuzzleDropResult {
	const canPlace =
		objectId === targetObjectId &&
		round.trayObjectIds.includes(objectId) &&
		!round.placedObjectIds.includes(objectId)

	if (!canPlace) {
		return {
			isMatch: false,
			placedObjectIds: round.placedObjectIds,
			isComplete: isPuzzleComplete(round),
		}
	}

	const placedObjectIds = [...round.placedObjectIds, objectId]

	return {
		isMatch: true,
		placedObjectIds,
		isComplete: placedObjectIds.length === round.trayObjectIds.length,
	}
}

export function isPuzzleComplete(round: PuzzleRound): boolean {
	if (round.trayObjectIds.length === 0) {
		return false
	}

	const placedObjectIds = new Set(round.placedObjectIds)
	return round.trayObjectIds.every((objectId) => placedObjectIds.has(objectId))
}
