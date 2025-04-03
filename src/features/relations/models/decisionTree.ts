export enum ConnectorType {
  ACTIVITY_ACTIVITY = 'activity',
  ACTIVITY_MOLECULE = 'activityMolecule',
  MOLECULE_ACTIVITY = 'moleculeActivity',
};

export interface RelationshipDefinition {
  id: string;
  label: string;
  description?: string;
}

export interface Definitions {
  activityRelationship: Record<ActivityRelationshipId, RelationshipDefinition>;
  activityMoleculeRelationship: Record<ActivityMoleculeRelationshipId, RelationshipDefinition>;
  moleculeActivityRelationship: Record<MoleculeActivityRelationshipId, RelationshipDefinition>;
  effectDirection: Record<EffectDirectionId, RelationshipDefinition>;
  directness: Record<DirectnessId, RelationshipDefinition>;
}

export enum ActivityRelationshipId {
  REGULATION = 'activityRelationship:regulation',
  CONSTITUTIVELY_UPSTREAM = 'activityRelationship:constitutivelyUpstream',
  PROVIDES_INPUT_FOR = 'activityRelationship:providesInputFor',
  REMOVES_INPUT_FOR = 'activityRelationship:removesInputFor',
  UNDETERMINED = 'activityRelationship:undetermined',
}

export enum ActivityMoleculeRelationshipId {
  PRODUCT = 'activityMoleculeRelationship:product',
}

export enum MoleculeActivityRelationshipId {
  REGULATES = 'moleculeActivityRelationship:regulates',
  SUBSTRATE = 'moleculeActivityRelationship:substrate',
}

export enum EffectDirectionId {
  POSITIVE = 'effectDirection:positive',
  NEGATIVE = 'effectDirection:negative',
}

export enum DirectnessId {
  DIRECT = 'directness:direct',
  INDIRECT = 'directness:indirect',
}

export enum RelationId {
  CONSTITUTIVELY_UPSTREAM_OF = 'RO:0012009',
  DIRECTLY_PROVIDES_INPUT = 'RO:0002413',
  REMOVES_INPUT_FOR = 'RO:0012010',
  CAUSALLY_UPSTREAM_OF_POSITIVE_EFFECT = 'RO:0002304',
  CAUSALLY_UPSTREAM_OF_NEGATIVE_EFFECT = 'RO:0002305',
  DIRECTLY_POSITIVELY_REGULATES = 'RO:0002629',
  INDIRECTLY_POSITIVELY_REGULATES = 'RO:0002407',
  DIRECTLY_NEGATIVELY_REGULATES = 'RO:0002630',
  INDIRECTLY_NEGATIVELY_REGULATES = 'RO:0002409',
  PRODUCT = 'RO:0002234',
  SMALL_MOLECULE_ACTIVATOR = 'RO:0012005',
  SMALL_MOLECULE_INHIBITOR = 'RO:0012006',
  SUBSTRATE = 'RO:0002233',
}

type RelationReference = { relation: RelationId }

type EffectDirectionMap = Partial<Record<EffectDirectionId, RelationReference | Record<DirectnessId, RelationReference>>>

type DecisionTree = Partial<
  Record<
    ActivityRelationshipId | ActivityMoleculeRelationshipId | MoleculeActivityRelationshipId,
    RelationReference | EffectDirectionMap
  >
>

export interface Schema {
  definitions: Definitions
  decisionTree: DecisionTree
}


export const definitions: Definitions = {
  activityRelationship: {
    [ActivityRelationshipId.REGULATION]: {
      id: ActivityRelationshipId.REGULATION,
      label: "Regulation",
      description: "The upstream activity conditionally controls the downstream activity",
    },
    [ActivityRelationshipId.CONSTITUTIVELY_UPSTREAM]: {
      id: ActivityRelationshipId.CONSTITUTIVELY_UPSTREAM,
      label: "Constitutively Upstream",
      description: "The upstream activity is normally present and required for the downstream activity.",
    },
    [ActivityRelationshipId.PROVIDES_INPUT_FOR]: {
      id: ActivityRelationshipId.PROVIDES_INPUT_FOR,
      label: "Provides Input For",
      description: "The upstream activity produces a molecule that is an input for the downstream activity.",
    },
    [ActivityRelationshipId.REMOVES_INPUT_FOR]: {
      id: ActivityRelationshipId.REMOVES_INPUT_FOR,
      label: "Removes Input For",
      description: "The upstream and downstream activities have the same input but the upstream activity makes the input unavailable for the downstream activity.",
    },
    [ActivityRelationshipId.UNDETERMINED]: {
      id: ActivityRelationshipId.UNDETERMINED,
      label: "Undetermined",
      description: "There is insufficient data to specify a precise causal mechanism.",
    },
  },
  activityMoleculeRelationship: {
    [ActivityMoleculeRelationshipId.PRODUCT]: {
      id: ActivityMoleculeRelationshipId.PRODUCT,
      label: "Product",
      description: "The activity creates the molecule as a reaction product",
    },
  },
  moleculeActivityRelationship: {
    [MoleculeActivityRelationshipId.REGULATES]: {
      id: MoleculeActivityRelationshipId.REGULATES,
      label: "Regulation",
      description: "The chemical regulates the activity",
    },
    [MoleculeActivityRelationshipId.SUBSTRATE]: {
      id: MoleculeActivityRelationshipId.SUBSTRATE,
      label: "Substrate",
      description: "The chemical is the substrate that the activity acts upon",
    },
  },
  effectDirection: {
    [EffectDirectionId.POSITIVE]: {
      id: EffectDirectionId.POSITIVE,
      label: "Positive",
    },
    [EffectDirectionId.NEGATIVE]: {
      id: EffectDirectionId.NEGATIVE,
      label: "Negative",
    },
  },
  directness: {
    [DirectnessId.DIRECT]: {
      id: DirectnessId.DIRECT,
      label: "Direct",
      description: "The upstream activity immediately precedes the downstream activity",
    },
    [DirectnessId.INDIRECT]: {
      id: DirectnessId.INDIRECT,
      label: "Indirect",
      description: "There are intervening activities between the upstream and downstream activities.",
    },
  },
};


export const decisionTree: DecisionTree = {
  [ActivityRelationshipId.CONSTITUTIVELY_UPSTREAM]: {
    relation: RelationId.CONSTITUTIVELY_UPSTREAM_OF,
  },
  [ActivityRelationshipId.PROVIDES_INPUT_FOR]: {
    relation: RelationId.DIRECTLY_PROVIDES_INPUT,
  },
  [ActivityRelationshipId.REMOVES_INPUT_FOR]: {
    relation: RelationId.REMOVES_INPUT_FOR,
  },
  [ActivityRelationshipId.UNDETERMINED]: {
    [EffectDirectionId.POSITIVE]: {
      relation: RelationId.CAUSALLY_UPSTREAM_OF_POSITIVE_EFFECT,
    },
    [EffectDirectionId.NEGATIVE]: {
      relation: RelationId.CAUSALLY_UPSTREAM_OF_NEGATIVE_EFFECT,
    },
  },
  [ActivityRelationshipId.REGULATION]: {
    [EffectDirectionId.POSITIVE]: {
      [DirectnessId.DIRECT]: {
        relation: RelationId.DIRECTLY_POSITIVELY_REGULATES,
      },
      [DirectnessId.INDIRECT]: {
        relation: RelationId.INDIRECTLY_POSITIVELY_REGULATES,
      },
    },
    [EffectDirectionId.NEGATIVE]: {
      [DirectnessId.DIRECT]: {
        relation: RelationId.DIRECTLY_NEGATIVELY_REGULATES,
      },
      [DirectnessId.INDIRECT]: {
        relation: RelationId.INDIRECTLY_NEGATIVELY_REGULATES,
      },
    },
  },
  [ActivityMoleculeRelationshipId.PRODUCT]: {
    relation: RelationId.PRODUCT,
  },
  [MoleculeActivityRelationshipId.REGULATES]: {
    [EffectDirectionId.POSITIVE]: {
      relation: RelationId.SMALL_MOLECULE_ACTIVATOR,
    },
    [EffectDirectionId.NEGATIVE]: {
      relation: RelationId.SMALL_MOLECULE_INHIBITOR,
    },
  },
  [MoleculeActivityRelationshipId.SUBSTRATE]: {
    relation: RelationId.SUBSTRATE,
  },
}
