import type { ObjectConcept } from "../content/schema";

export type FindRound = {
  targetObjectId: string;
};

export type FindTapResult = {
  isTarget: boolean;
  identifiedObjectId: string;
  shouldRepeatPrompt: boolean;
};

export function createFindRound(objects: ObjectConcept[], previousTargetId?: string): FindRound {
  const firstDifferent = objects.find((object) => object.id !== previousTargetId) ?? objects[0];
  return { targetObjectId: firstDifferent?.id ?? "" };
}

export function handleFindTap(round: FindRound, tappedObjectId: string): FindTapResult {
  const isTarget = tappedObjectId === round.targetObjectId;
  return {
    isTarget,
    identifiedObjectId: tappedObjectId,
    shouldRepeatPrompt: !isTarget
  };
}
