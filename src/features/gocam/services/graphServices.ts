import type { Contributor, Group } from "@/features/users/models/contributor";
import type { Evidence, ShExViolation } from "../models/cam";
import { type Edge, type GraphModel, type GraphNode, type Activity, ActivityType, RootTypes } from "../models/cam";
import { Relations } from "@/@noctua.core/models/relations";
import { v4 as uuidv4 } from 'uuid';
import { store } from "@/app/store/store";
import { AnnotationKey } from '../models/operations';
import { buildValidationErrors, emptyValidationErrors } from './violationService';
import { canInsertEntity } from '../data/insertMenuConfig';

const SUBJECT_TYPE_PRIORITY: string[] = [
  RootTypes.MOLECULAR_FUNCTION,
  RootTypes.BIOLOGICAL_PROCESS,
  RootTypes.CELLULAR_COMPONENT,
  RootTypes.CELL_TYPE,
  RootTypes.PROTEIN_CONTAINING_COMPLEX,
  RootTypes.MOLECULAR_ENTITY,
  RootTypes.CHEMICAL_ENTITY,
  RootTypes.ANATOMICAL_ENTITY,
];

function getSubjectType(node: GraphNode): string | null {
  const rootTypes = node.rootTypes ?? [];
  for (const candidate of SUBJECT_TYPE_PRIORITY) {
    if (rootTypes.includes(candidate)) return candidate;
  }
  return null;
}

function isEdgeShapeAllowed(edge: Edge, subject: GraphNode, target: GraphNode): boolean {
  const subjectType = getSubjectType(subject);
  if (!subjectType) return false;
  const allowed = canInsertEntity[subjectType] ?? [];
  for (const entry of allowed) {
    if (entry.predicate.id !== edge.id) continue;
    if (target.rootTypes?.includes(entry.targetType)) return true;
  }
  return false;
}


export function extractActivities(nodes: GraphNode[], edges: Edge[]): Activity[] {
  const activities: Activity[] = [];

  const enabledBySourceIds = new Set(
    edges.filter(edge => edge.id === Relations.ENABLED_BY)
      .map(edge => edge.sourceId)
  );

  const chemicalEntityIds = new Set(
    nodes.filter(node =>
      node.rootTypes?.includes(RootTypes.CHEMICAL_ENTITY) &&
      !node.rootTypes?.includes(RootTypes.MOLECULAR_ENTITY)
    ).map(node => node.uid)
  );

  const activityBoundary = new Set([...enabledBySourceIds, ...chemicalEntityIds]);

  const enabledByEdges = edges.filter(edge => edge.id === Relations.ENABLED_BY);

  enabledByEdges.forEach(enabledByEdge => {
    const molecularFunction = enabledByEdge.source;
    const enabledBy = enabledByEdge.target;

    if (!molecularFunction || !enabledBy) return;

    const activityNodes: GraphNode[] = [];
    const activityEdges: Edge[] = [];
    const visited = new Set<string>();

    exploreSubgraph(
      molecularFunction,
      nodes,
      edges,
      activityNodes,
      activityEdges,
      visited,
      activityBoundary
    );

    const dates = [
      ...activityNodes.map(node => node.date).filter(Boolean),
      ...activityEdges.map(edge => edge.date).filter(Boolean)
    ];

    const latestDate = dates.length > 0
      ? dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : null;

    activities.push({
      uid: molecularFunction.uid,
      type: ActivityType.ACTIVITY,
      rootNode: molecularFunction,
      molecularFunction,
      enabledBy,
      date: latestDate ?? null,
      nodes: activityNodes,
      edges: activityEdges,
      hasViolations: false,
      violations: []
    });
  });

  return activities;
}

export function extractMolecules(nodes: GraphNode[], edges: Edge[], activities: Activity[]): Activity[] {
  const molecules: Activity[] = [];

  const chemicalNodes = nodes.filter(node =>
    node.rootTypes?.includes(RootTypes.CHEMICAL_ENTITY) &&
    !node.rootTypes?.includes(RootTypes.MOLECULAR_ENTITY)
  );

  const activityNodeIds = new Set<string>();
  for (const activity of activities) {
    for (const node of activity.nodes) {
      activityNodeIds.add(node.uid);
    }
  }

  chemicalNodes.forEach(chemicalNode => {
    if (activityNodeIds.has(chemicalNode.uid)) return;

    const moleculeNodes: GraphNode[] = [];
    const moleculeEdges: Edge[] = [];
    const visited = new Set<string>();

    exploreSubgraph(
      chemicalNode,
      nodes,
      edges,
      moleculeNodes,
      moleculeEdges,
      visited,
      activityNodeIds
    );

    if (moleculeNodes.length === 0) return;

    const dates = [
      ...moleculeNodes.map(node => node.date).filter(Boolean),
      ...moleculeEdges.map(edge => edge.date).filter(Boolean)
    ];

    const latestDate = dates.length > 0
      ? dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : null;

    molecules.push({
      uid: chemicalNode.uid,
      type: ActivityType.MOLECULE,
      rootNode: chemicalNode,
      molecularFunction: null,
      enabledBy: null,
      date: latestDate ?? null,
      nodes: moleculeNodes,
      edges: moleculeEdges,
      hasViolations: false,
      violations: []
    });
  });

  return molecules;
}

export function extractActivityConnections(activities: Activity[], edges: Edge[]): Edge[] {
  const activityConnections: Edge[] = [];

  const nodeToActivityMap = new Map<string, Activity>();
  activities.forEach(activity => {
    activity.nodes.forEach(node => {
      nodeToActivityMap.set(node.uid, activity);
    });
  });

  edges.forEach(edge => {
    const sourceActivity = nodeToActivityMap.get(edge.sourceId);
    const targetActivity = nodeToActivityMap.get(edge.targetId);

    if (!sourceActivity || !targetActivity) return;
    if (sourceActivity.uid === targetActivity.uid) return;

    if (edge.id === Relations.HAS_INPUT) {
      edge.isReverseLink = true;
      edge.reverseLinkLabel = 'input of'
    }

    activityConnections.push(edge);
  });

  return activityConnections;
}

export function extractEvidence(evidenceId: string, nodes: GraphNode[]): Evidence | undefined {
  const evidenceNode = nodes.find(node => node.uid === evidenceId);

  if (!evidenceNode) {
    return undefined;
  }

  const sortedSources = [...evidenceNode.sources].sort((a, b) => (a > b ? -1 : 1))
  const reference = sortedSources.join('| ')

  const evidence: Evidence = {
    uid: evidenceNode.uid,
    evidenceCode: {
      id: evidenceNode.id,
      label: evidenceNode.label
    },
    reference,
    referenceUrl: reference,
    with: evidenceNode.with || '',
    groups: evidenceNode.groups,
    contributors: evidenceNode.contributors,
    date: evidenceNode.date
  };

  return evidence;
}

function exploreSubgraph(
  currentNode: GraphNode,
  allNodes: GraphNode[],
  allEdges: Edge[],
  collectedNodes: GraphNode[],
  collectedEdges: Edge[],
  visited: Set<string>,
  boundaryNodeIds: Set<string>
): void {
  visited.add(currentNode.uid);
  collectedNodes.push(currentNode);

  const outgoingEdges = allEdges.filter(edge => edge.sourceId === currentNode.uid);

  for (const edge of outgoingEdges) {
    if (collectedEdges.some(e => e.uid === edge.uid)) continue;

    const targetNodeId = edge.targetId;

    if (visited.has(targetNodeId) || boundaryNodeIds.has(targetNodeId)) continue;

    const targetNode = allNodes.find(node => node.uid === targetNodeId);
    if (!targetNode) continue;

    if (!isEdgeShapeAllowed(edge, currentNode, targetNode)) continue;

    collectedEdges.push(edge);

    exploreSubgraph(
      targetNode,
      allNodes,
      allEdges,
      collectedNodes,
      collectedEdges,
      visited,
      boundaryNodeIds
    );
  }
}

export const transformGraphData = (data: any): GraphModel => {
  if (!data) return { id: '', nodes: [], edges: [], activities: [], activityConnections: [], contributors: [], groups: [], comments: [], violations: [], modified: false, validationErrors: emptyValidationErrors() };

  const nodes: GraphNode[] = [];
  const edges: Edge[] = [];

  if (data.individuals && Array.isArray(data.individuals)) {
    data.individuals.forEach((individual: any) => {
      const rawType = individual.type?.[0]
      const isComplement = rawType?.type === 'complement'
      const resolvedType = isComplement ? rawType?.filler : rawType

      const nodeData: GraphNode = {
        uid: individual.id,
        id: resolvedType?.id,
        label: resolvedType?.label,
        rootTypes: individual['root-type']?.map((rt: any) => rt.id) || [],
        isComplement,
        contributors: [],
        groups: [],
        sources: [],
      };

      if (individual.annotations && Array.isArray(individual.annotations)) {
        individual.annotations.forEach((annotation: any) => {
          if (annotation.key === AnnotationKey.CONTRIBUTOR) {
            nodeData.contributors.push(getContributor(annotation.value));
          } else if (annotation.key === AnnotationKey.DATE) {
            nodeData.date = annotation.value;
          } else if (annotation.key === AnnotationKey.PROVIDED_BY) {
            nodeData.groups.push(getGroup(annotation.value));
          } else if (annotation.key === AnnotationKey.SOURCE) {
            nodeData.sources.push(annotation.value);
          } else if (annotation.key === AnnotationKey.WITH) {
            nodeData.with = annotation.value;
          }
        });
      }

      nodes.push(nodeData);
    });
  }

  if (data.facts && Array.isArray(data.facts)) {
    data.facts.forEach((fact: any) => {
      const source = nodes.find(node => node.uid === fact.subject)
      const target = nodes.find(node => node.uid === fact.object)
      if (source && target) {
        const edgeData: Edge = {
          uid: uuidv4(),
          id: fact['property'],
          label: fact['property-label'] || fact.property,
          sourceId: fact.subject,
          targetId: fact.object,
          source,
          target,
          contributors: [],
          groups: [],
          evidence: [],
        };

        if (fact.annotations && Array.isArray(fact.annotations)) {
          fact.annotations.forEach((annotation: any) => {
            if (annotation.key === AnnotationKey.CONTRIBUTOR) {
              edgeData.contributors.push(getContributor(annotation.value));
            } else if (annotation.key === AnnotationKey.DATE) {
              edgeData.date = annotation.value;
            } else if (annotation.key === AnnotationKey.PROVIDED_BY) {
              edgeData.groups.push(getGroup(annotation.value));
            } else if (annotation.key === AnnotationKey.EVIDENCE) {
              const evidence = extractEvidence(annotation.value, nodes);
              if (evidence) {
                edgeData.evidence?.push(evidence);
              }
            }
          });
        }

        edges.push(edgeData);
      }
    });
  }

  const activities = extractActivities(nodes, edges);
  const molecules = extractMolecules(nodes, edges, activities);
  activities.push(...molecules);

  const activityConnections = extractActivityConnections(activities, edges);

  const graphModel: GraphModel = {
    id: data.id || '',
    nodes,
    edges,
    activities,
    activityConnections,
    contributors: [],
    groups: [],
    comments: [],
    violations: [],
    modified: data['modified-p'] === true,
    validationErrors: emptyValidationErrors(),
  };

  if (data.annotations && Array.isArray(data.annotations)) {
    data.annotations.forEach((annotation: any) => {
      if (annotation.key === AnnotationKey.CONFORMS_TO_GPAD) {
        graphModel.conformsToGPAD = annotation.value === 'true';
      } else if (annotation.key === AnnotationKey.STATE) {
        graphModel.state = annotation.value;
      } else if (annotation.key === AnnotationKey.DATE) {
        graphModel.date = annotation.value;
      } else if (annotation.key === AnnotationKey.TITLE) {
        graphModel.title = annotation.value;
      } else if (annotation.key === AnnotationKey.CONTRIBUTOR) {
        graphModel.contributors.push(getContributor(annotation.value));
      } else if (annotation.key === AnnotationKey.PROVIDED_BY) {
        graphModel.groups.push(getGroup(annotation.value));
      } else if (annotation.key === AnnotationKey.COMMENT) {
        graphModel.comments.push(annotation.value);
      } else if (annotation.key === AnnotationKey.IN_TAXON) {
        graphModel.taxon = annotation.value;
      }
    });
  }

  graphModel.violations = parseValidationResults(data['validation-results']);
  graphModel.validationErrors = buildValidationErrors(graphModel);

  return graphModel;
};

function getContributor(uri: string): Contributor {
  const state = store.getState();
  const contributors = state.metadata.contributors;
  const contributor = contributors.find(c => c.uri === uri);

  return contributor ? contributor : { uri } as Contributor;
};


function getGroup(id: string): Group {
  const state = store.getState();
  const groups = state.metadata.groups;
  const group = groups.find(g => g.id === id);

  return group ? group : { id } as Group;
};


function parseValidationResults(validationResults: any): ShExViolation[] {
  const violations: ShExViolation[] = [];

  if (!validationResults?.['shex-validation']?.violations) return violations;

  for (const violation of validationResults['shex-validation'].violations) {
    for (const explanation of violation.explanations ?? []) {
      const constraints = (explanation.constraints ?? []).map((c: any) => ({
        property: c.property,
        object: c.object,
        cardinality: c.cardinality,
        nobjects: c.nobjects,
      }));

      violations.push({
        node: violation.node,
        shape: explanation.shape ?? '',
        constraints,
      });
    }
  }

  return violations;
}