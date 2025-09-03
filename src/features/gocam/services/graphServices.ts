import type { Contributor, Group } from "@/features/users/models/contributor";
import type { Entity, Evidence } from "../models/cam";
import { type Edge, type GraphModel, type GraphNode, type Activity, ActivityType, RootTypes, Aspect } from "../models/cam";
import { Relations } from "@/@noctua.core/models/relations";
import { v4 as uuidv4 } from 'uuid';
import { store } from "@/app/store/store";

/* const annotationsMap = {
  "contributor": "contributor",
  "date": "date",
  "providedBy": "groups",
  "with": "with",
  "source": "reference",
  "evidence": "evidence",
  "conforms-to-gpad": "conformsToGpad",
  "state": "state",
  "title": "title"
};



// TODO Contributor and groups
// TODO is Compliment

function processAnnotations(nodes: GraphNode[], annotations: Record<string, string>, target: any): void {
  if (!annotations || !Array.isArray(annotations)) return;

  const contributors: Contributor[] = [];
  const groups: Group[] = [];
  const evidence: Evidence[] = [];

  annotations.forEach((annotation: string, value: string) => {
    switch (annotation) {
      case 'contributor':
        contributors.push({ uri: value });
        break
      case 'providedBy':
        groups.push({ id: value });
        break;

      case 'conforms-to-gpad':
        if (target.conformsToGPAD !== undefined) {
          target.conformsToGPAD = value === 'true';
        }
        break;

      case 'evidence':
        evidence.push(extractEvidence(value, nodes));
        break;
      default:
        target[annotationsMap[annotation]] = value;
    }
  })
}

 */




export function extractActivities(nodes: GraphNode[], edges: Edge[]): Activity[] {
  const activities: Activity[] = [];

  // Pre-compute all enabledBy nodes for faster lookup
  const enabledBySourceIds = new Set(
    edges.filter(edge => edge.id === Relations.ENABLED_BY)
      .map(edge => edge.sourceId)
  );

  const enabledByEdges = edges.filter(edge => edge.id === Relations.ENABLED_BY);

  enabledByEdges.forEach(enabledByEdge => {
    const molecularFunction = enabledByEdge.source;
    const enabledBy = enabledByEdge.target;

    if (!molecularFunction || !enabledBy) return;

    const activityNodes: GraphNode[] = [];
    const activityEdges: Edge[] = [];
    const visited = new Set<string>();

    activityEdges.push(enabledByEdge);

    exploreSubgraph(
      molecularFunction,
      nodes,
      edges,
      activityNodes,
      activityEdges,
      visited,
      enabledBySourceIds
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
      edges: activityEdges
    });
  });

  return activities;
}

export function extractMolecules(nodes: GraphNode[], edges: Edge[], activities: Activity[]): Activity[] {
  const molecules: Activity[] = [];

  // Find all chemical nodes that are not molecular entities
  const chemicalNodes = nodes.filter(node =>
    node.rootTypes?.includes(RootTypes.CHEMICAL_ENTITY) &&
    !node.rootTypes?.includes(RootTypes.MOLECULAR_ENTITY)
  );

  // Create a set of nodes already in activities to avoid duplication
  const activityNodeIds = new Set(
    activities.map(activity => activity.rootNode.uid)
  );

  // Track visited nodes to prevent infinite recursion
  const visited = new Set<string>();

  // Process each chemical node that isn't already in an activity
  chemicalNodes.forEach(chemicalNode => {
    if (activityNodeIds.has(chemicalNode.uid)) return;

    // Reset visited set for each molecule
    visited.clear();

    const moleculeNodes: GraphNode[] = [];
    const moleculeEdges: Edge[] = [];

    // Recursively explore the subgraph
    exploreSubgraph(
      chemicalNode,
      nodes,
      edges,
      moleculeNodes,
      moleculeEdges,
      visited,
      activityNodeIds
    );

    // Skip if no nodes or edges were found
    if (moleculeNodes.length === 0) return;

    // Find latest date across all nodes and edges
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
      edges: moleculeEdges
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

  // Create evidence object from the node
  const evidence: Evidence = {
    uid: evidenceNode.uid,
    evidenceCode: {
      id: evidenceNode.id,
      label: evidenceNode.label
    },
    reference: evidenceNode.source || '',
    referenceUrl: evidenceNode.source || '',
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
  moleculeNodes: GraphNode[],
  moleculeEdges: Edge[],
  visited: Set<string>,
  activityNodeIds: Set<string>
): void {

  visited.add(currentNode.uid);
  moleculeNodes.push(currentNode);

  const connectedEdges = allEdges.filter(edge =>
    edge.sourceId === currentNode.uid || edge.targetId === currentNode.uid
  );

  for (const edge of connectedEdges) {
    if (moleculeEdges.some(e => e.id === edge.id)) continue;

    const connectedNodeId = edge.sourceId === currentNode.uid ? edge.targetId : edge.sourceId;

    if (visited.has(connectedNodeId) || activityNodeIds.has(connectedNodeId)) continue;

    moleculeEdges.push(edge);

    const connectedNode = allNodes.find(node => node.uid === connectedNodeId);
    if (!connectedNode) continue;

    exploreSubgraph(
      connectedNode,
      allNodes,
      allEdges,
      moleculeNodes,
      moleculeEdges,
      visited,
      activityNodeIds
    );
  }
}

export const transformGraphData = (data: any): GraphModel => {
  if (!data) return { id: '', nodes: [], edges: [], activities: [], activityConnections: [] };

  const nodes: GraphNode[] = [];
  const edges: Edge[] = [];

  if (data.individuals && Array.isArray(data.individuals)) {
    data.individuals.forEach((individual: any) => {
      const nodeData: GraphNode = {
        uid: individual.id,
        id: individual.type?.[0]?.id,
        label: individual.type?.[0]?.label,
        rootTypes: individual['root-type']?.map((rt: any) => rt.id) || [],
        contributors: [],
        groups: [],
      };

      if (individual.annotations && Array.isArray(individual.annotations)) {
        individual.annotations.forEach((annotation: any) => {


          if (annotation.key === 'contributor') {
            nodeData.contributors.push(getContributor(annotation.value));
          } else if (annotation.key === 'date') {
            nodeData.date = annotation.value;
          } else if (annotation.key === 'providedBy') {
            nodeData.groups.push(getGroup(annotation.value));
          } else if (annotation.key === 'source') {
            nodeData.source = annotation.value;
          } else if (annotation.key === 'with') {
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
            if (annotation.key === 'contributor') {
              edgeData.contributors.push(getContributor(annotation.value));
            } else if (annotation.key === 'date') {
              edgeData.date = annotation.value;
            } else if (annotation.key === 'providedBy') {
              edgeData.groups.push(getGroup(annotation.value));
            } else if (annotation.key === 'evidence') {
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
  };

  if (data.annotations && Array.isArray(data.annotations)) {
    data.annotations.forEach((annotation: any) => {
      if (annotation.key === 'conforms-to-gpad') {
        graphModel.conformsToGPAD = annotation.value === 'true';
      } else if (annotation.key === 'state') {
        graphModel.state = annotation.value;
      } else if (annotation.key === 'date') {
        graphModel.date = annotation.value;
      } else if (annotation.key === 'title') {
        graphModel.title = annotation.value;
      } else if (annotation.key === 'contributor') {
        graphModel.contributors.push(getContributor(annotation.value));
        graphModel.contributors.push(getContributor("https://orcid.org/0000-0001-9969-8610"));
        graphModel.contributors.push(getContributor("https://orcid.org/0000-0001-8682-8754"));
        graphModel.contributors.push(getContributor("https://orcid.org/0000-0003-3212-6364"));
      } else if (annotation.key === 'providedBy') {
        graphModel.groups.push(getGroup(annotation.value));
      }
    });
  }

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


const rootTypeToAspectMap: Partial<Record<RootTypes, Aspect>> = {
  [RootTypes.MOLECULAR_FUNCTION]: Aspect.MOLECULAR_FUNCTION,
  [RootTypes.BIOLOGICAL_PROCESS]: Aspect.BIOLOGICAL_PROCESS,
  [RootTypes.CELLULAR_COMPONENT]: Aspect.CELLULAR_COMPONENT,
};

export function getAspect(rootTypes: Entity[]): Aspect | null {
  for (const rootType of rootTypes) {
    const aspect = rootTypeToAspectMap[rootType.id as RootTypes];
    if (aspect) return aspect;
  }
  return null;
}