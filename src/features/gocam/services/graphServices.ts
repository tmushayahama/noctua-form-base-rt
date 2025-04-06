import type { Contributor, Group } from "@/features/users/models/contributor";
import type { Entity } from "../models/cam";
import { type Edge, type GraphModel, type GraphNode, type Activity, ActivityType, RootTypes, Aspect } from "../models/cam";
import { Relations } from "@/@pango.core/models/relations";


// TODO Contributor and groups
// TODO is Compliment

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
  const contributors: Contributor[] = [];
  const groups: Group[] = [];

  if (data.individuals && Array.isArray(data.individuals)) {
    data.individuals.forEach((individual: any) => {
      const nodeData: GraphNode = {
        uid: individual.id,
        id: individual.type?.[0]?.id,
        label: individual.type?.[0]?.label,
        rootTypes: individual['root-type']?.map((rt: any) => rt.id) || [],
      };

      if (individual.annotations && Array.isArray(individual.annotations)) {
        individual.annotations.forEach((annotation: any) => {
          if (annotation.key === 'contributor') {
            nodeData.contributor = annotation.value;
            addContributor(contributors, annotation.value);
          } else if (annotation.key === 'date') {
            nodeData.date = annotation.value;
          } else if (annotation.key === 'providedBy') {
            nodeData.group = annotation.value;
            addGroup(groups, annotation.value);
          } else if (annotation.key === 'source') {
            nodeData.source = annotation.value;
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
          id: fact['property'],
          label: fact['property-label'] || fact.property,
          sourceId: fact.subject,
          targetId: fact.object,
          source,
          target
        };

        if (fact.annotations && Array.isArray(fact.annotations)) {
          fact.annotations.forEach((annotation: any) => {
            if (annotation.key === 'contributor') {
              edgeData.contributor = annotation.value;
              addContributor(contributors, annotation.value);
            } else if (annotation.key === 'date') {
              edgeData.date = annotation.value;
            } else if (annotation.key === 'providedBy') {
              edgeData.group = annotation.value;
              addGroup(groups, annotation.value);
            } else if (annotation.key === 'evidence') {
              edgeData.evidence = annotation.value;
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
    groups,
    activities,
    activityConnections
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
      }
    });
  }

  if (contributors.length > 0) {
    graphModel.contributors = contributors;
  }

  return graphModel;
};

function addContributor(contributors: Contributor[], uri: string): void {
  if (!contributors.some(c => c.uri === uri)) {
    contributors.push({
      uri,
    });
  }
}

function addGroup(groups: Group[], id: string): void {
  if (!groups.some(g => g.id === id)) {
    groups.push({
      id,
      name: id.split('/').pop() || id
    });
  }
}

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