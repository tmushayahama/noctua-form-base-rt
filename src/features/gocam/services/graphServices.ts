import type { Edge, GraphModel, Contributor, Group, Node, Activity } from "../models/cam";

export function extractActivities(nodes: Node[], edges: Edge[]): any[] {
  const activities: Activity[] = [];

  const enabledByEdges = edges.filter(edge => edge.id === 'RO:0002333');

  enabledByEdges.forEach(enabledByEdge => {
    const molecularFunction = enabledByEdge.source;
    const enabledBy = enabledByEdge.target;

    if (!molecularFunction || !enabledBy) return;

    const activityNodes = [molecularFunction, enabledBy];
    const activityEdges = [enabledByEdge];

    // Find related edges connected to the molecular function
    edges.forEach(edge => {
      if (edge.id === enabledByEdge.id) return; // Skip the enabled by edge itself

      if (edge.sourceId === molecularFunction.uid || edge.targetId === molecularFunction.uid) {
        activityEdges.push(edge);
      }
    });

    // Find latest date across all nodes and edges
    const dates = [
      ...activityNodes.map(node => node.date).filter(Boolean),
      ...activityEdges.map(edge => edge.date).filter(Boolean)
    ];

    const latestDate = dates.length > 0
      ? dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : null;

    activities.push({
      uid: molecularFunction.uid,
      molecularFunction,
      enabledBy,
      date: latestDate ?? null,
      nodes: activityNodes,
      edges: activityEdges
    });
  });

  return activities;
}

export const transformGraphData = (data: any): GraphModel => {
  if (!data) return { id: '', nodes: [], edges: [], activities: [], activityConnections: [] };

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const contributors: Contributor[] = [];
  const groups: Group[] = [];

  // Process individuals (nodes)
  if (data.individuals && Array.isArray(data.individuals)) {
    data.individuals.forEach((individual: any) => {
      const nodeData: Node = {
        uid: individual.id,
        id: individual.type?.[0]?.id,
        label: individual.type?.[0]?.label,
        rootTypes: individual['root-type']?.map((rt: any) => rt.id) || [],
      };

      // Process annotations
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

  // Process facts (edges)
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

        // Process annotations
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

  // Extract activities from the graph
  const activities = extractActivities(nodes, edges);
  const activityConnections: Edge[] = [];

  // Process model annotations
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
    graphModel.contributor = contributors;
  }

  return graphModel;
};

// Helper function to add contributors
function addContributor(contributors: Contributor[], orcid: string): void {
  const existing = contributors.find(c => c.orcid === orcid);
  if (existing) {
    existing.frequency += 1;
  } else {
    contributors.push({
      orcid,
      frequency: 1
    });
  }
}

// Helper function to add groups
function addGroup(groups: Group[], url: string): void {
  if (!groups.some(g => g.url === url)) {
    groups.push({
      url,
      name: url.split('/').pop() || url
    });
  }
}