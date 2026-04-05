import { useMemo } from 'react'
import type { ActivityType } from '@/features/gocam/models/cam'
import {
  ConnectorType,
  ActivityRelationshipId,
  ActivityMoleculeRelationshipId,
  MoleculeActivityRelationshipId,
} from '../models/decisionTree'
import { definitions } from '../models/decisionTree'
import { getConnectorType } from '../services/decisionTree'
import type { RelationshipInput } from '../slices/relationSlice'

export function useRelationFormConfig(
  sourceType: ActivityType,
  targetType: ActivityType,
  selected: RelationshipInput
) {
  const connectorType = useMemo(
    () => getConnectorType(sourceType, targetType),
    [sourceType, targetType]
  )

  const relationshipOptions = useMemo(() => {
    if (connectorType === ConnectorType.ACTIVITY_ACTIVITY) {
      return Object.values(ActivityRelationshipId)
    }
    if (connectorType === ConnectorType.ACTIVITY_MOLECULE) {
      return Object.values(ActivityMoleculeRelationshipId)
    }
    return Object.values(MoleculeActivityRelationshipId)
  }, [connectorType])

  const definitionMap = useMemo(() => {
    if (connectorType === ConnectorType.ACTIVITY_ACTIVITY) {
      return definitions.activityRelationship
    }
    if (connectorType === ConnectorType.ACTIVITY_MOLECULE) {
      return definitions.activityMoleculeRelationship
    }
    return definitions.moleculeActivityRelationship
  }, [connectorType])

  const shouldShowDirection =
    (connectorType === ConnectorType.ACTIVITY_ACTIVITY &&
      selected.relationshipId === ActivityRelationshipId.REGULATION) ||
    (connectorType === ConnectorType.MOLECULE_ACTIVITY &&
      selected.relationshipId === MoleculeActivityRelationshipId.REGULATES) ||
    selected.relationshipId === (ActivityRelationshipId.UNDETERMINED as string)

  const shouldShowDirectness =
    connectorType === ConnectorType.ACTIVITY_ACTIVITY &&
    selected.relationshipId === ActivityRelationshipId.REGULATION

  const shouldShowChemicalIntermediate =
    connectorType === ConnectorType.ACTIVITY_ACTIVITY &&
    selected.relationshipId === ActivityRelationshipId.PROVIDES_INPUT_FOR

  return {
    connectorType,
    relationshipOptions,
    definitionMap,
    shouldShowDirection,
    shouldShowDirectness,
    shouldShowChemicalIntermediate,
  }
}
