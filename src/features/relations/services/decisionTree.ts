import { ActivityType } from "@/features/gocam/models/cam";
import type { RelationId } from "../models/decisionTree";
import { ActivityRelationshipId, ActivityMoleculeRelationshipId, MoleculeActivityRelationshipId, EffectDirectionId, DirectnessId, decisionTree, ConnectorType, ConnectorType } from "../models/decisionTree";



export type RelationshipInput = {
  sourceType: ActivityType;
  targetType: ActivityType;
  relationshipId:
  | ActivityRelationshipId
  | ActivityMoleculeRelationshipId
  | MoleculeActivityRelationshipId;
  directionId?: EffectDirectionId;
  directnessId?: DirectnessId;
};

export const determineRelation = (input: RelationshipInput): RelationId | null => {
  const { sourceType, targetType, relationshipId, directionId, directnessId } = input;

  let branch: any = null;

  // Select correct relationship tree branch
  if (sourceType === ActivityType.ACTIVITY && targetType === ActivityType.ACTIVITY) {
    branch = decisionTree[relationshipId as ActivityRelationshipId];
  } else if (sourceType === ActivityType.ACTIVITY && targetType === ActivityType.MOLECULE) {
    branch = decisionTree[relationshipId as ActivityMoleculeRelationshipId];
  } else if (sourceType === ActivityType.MOLECULE && targetType === ActivityType.ACTIVITY) {
    branch = decisionTree[relationshipId as MoleculeActivityRelationshipId];
  }

  if (!branch) return null;

  // Logic in order: base → direction → direction + directness

  // 1. Direct match at top level
  if ('relation' in branch) return branch.relation;

  // 2. Match at directionId level (e.g. branch[positive].relation)
  if (directionId && branch[directionId]?.relation) {
    return branch[directionId].relation;
  }

  // 3. Match at directionId + directnessId level
  if (directionId && directnessId && branch[directionId]?.[directnessId]?.relation) {
    return branch[directionId][directnessId].relation;
  }

  return null;
};





export const getConnectorType = (
  sourceType: ActivityType,
  targetType: ActivityType
): ConnectorType => {
  if (sourceType !== ActivityType.MOLECULE && targetType !== ActivityType.MOLECULE) {
    return ConnectorType.ACTIVITY_ACTIVITY;
  }
  if (sourceType !== ActivityType.MOLECULE && targetType === ActivityType.MOLECULE) {
    return ConnectorType.ACTIVITY_MOLECULE;
  }
  return ConnectorType.MOLECULE_ACTIVITY;
};

export const getDefaultSelection = (
  connectorType: ConnectorType
): {
  relationshipId: ActivityRelationshipId | ActivityMoleculeRelationshipId | MoleculeActivityRelationshipId;
  directionId?: EffectDirectionId;
  directnessId?: DirectnessId;
} => {
  switch (connectorType) {
    case ConnectorType.ACTIVITY_ACTIVITY:
      return {
        relationshipId: ActivityRelationshipId.REGULATION,
        directionId: EffectDirectionId.POSITIVE,
        directnessId: DirectnessId.DIRECT,
      };
    case ConnectorType.ACTIVITY_MOLECULE:
      return {
        relationshipId: ActivityMoleculeRelationshipId.PRODUCT,
      };
    case ConnectorType.MOLECULE_ACTIVITY:
      return {
        relationshipId: MoleculeActivityRelationshipId.REGULATES,
        directionId: EffectDirectionId.POSITIVE,
      };
  }
};




export const reverseLookup = (relation: RelationId): RelationshipInput | null => {
  for (const [relationshipId, branch] of Object.entries(decisionTree)) {
    const base = branch as any;

    if ('relation' in base && base.relation === relation) {
      return {
        relationshipId: relationshipId as any,
        sourceType: inferSourceType(relationshipId),
        targetType: inferTargetType(relationshipId),
      };
    }

    for (const [dirKey, dirVal] of Object.entries(base)) {
      if ('relation' in dirVal && dirVal.relation === relation) {
        return {
          relationshipId: relationshipId as any,
          directionId: dirKey as EffectDirectionId,
          sourceType: inferSourceType(relationshipId),
          targetType: inferTargetType(relationshipId),
        };
      }

      for (const [dirKey2, val] of Object.entries(dirVal)) {
        if (val.relation === relation) {
          return {
            relationshipId: relationshipId as any,
            directionId: dirKey as EffectDirectionId,
            directnessId: dirKey2 as DirectnessId,
            sourceType: inferSourceType(relationshipId),
            targetType: inferTargetType(relationshipId),
          };
        }
      }
    }
  }

  return null;
};




const inferSourceType = (id: string): ActivityType =>
  id.startsWith('moleculeActivityRelationship')
    ? ActivityType.MOLECULE
    : ActivityType.ACTIVITY;

const inferTargetType = (id: string): ActivityType =>
  id.startsWith('activityMoleculeRelationship')
    ? ActivityType.MOLECULE
    : ActivityType.ACTIVITY;
