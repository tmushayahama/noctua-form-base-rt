import { v4 as uuidv4 } from 'uuid';
import type { TreeNode, EvidenceForm } from '../models/cam';

type Operation = {
  entity: string;
  operation: string;
  arguments: Record<string, any>;
};

/**
 * Converts a TreeNode structure to the JSON format matching the paste.txt example
 */
export const convertTreeToJson = (
  tree: TreeNode[],
  modelId: string
): Operation[] => {
  const operations: Operation[] = [];
  const nodeVariables = new Map<string, string>();

  processNodes(tree, operations, nodeVariables, modelId);
  processRelationships(tree, operations, nodeVariables, modelId);

  // Add final store operation
  operations.push({
    entity: "model",
    operation: "store",
    arguments: {
      "model-id": modelId
    }
  });

  return operations;
};

/**
 * Process all nodes in the tree and add them as individuals
 */
const processNodes = (
  nodes: TreeNode[],
  operations: Operation[],
  nodeVariables: Map<string, string>,
  modelId: string
): void => {
  nodes.forEach(node => {
    const variableId = uuidv4();
    nodeVariables.set(node.id, variableId);

    // Add the individual (node)
    operations.push({
      entity: "individual",
      operation: "add",
      arguments: {
        expressions: [
          {
            type: "class",
            id: node.term?.id
          }
        ],
        "model-id": modelId,
        "assign-to-variable": variableId
      }
    });

    // If this node has evidence, add evidence individual and annotation
    if (node.evidence) {
      addEvidenceForNode(node.id, node.evidence, operations, nodeVariables, modelId);
    }

    // Process children recursively
    if (node.children?.length > 0) {
      processNodes(node.children, operations, nodeVariables, modelId);
    }
  });
};

/**
 * Add evidence individual and annotation for a node
 */
const addEvidenceForNode = (
  nodeId: string,
  evidence: EvidenceForm,
  operations: Operation[],
  nodeVariables: Map<string, string>,
  modelId: string
): void => {
  // Generate variable for evidence
  const evidenceVarId = uuidv4();

  // Add evidence individual
  operations.push({
    entity: "individual",
    operation: "add",
    arguments: {
      expressions: [
        {
          type: "class",
          id: evidence.evidenceCode.id
        }
      ],
      "model-id": modelId,
      "assign-to-variable": evidenceVarId
    }
  });

  // Add annotation to evidence (source/reference)
  const annotationValues = [
    {
      key: "source",
      value: evidence.reference
    }
  ];

  // Add with/from if provided
  if (evidence.withFrom) {
    annotationValues.push({
      key: "with",
      value: evidence.withFrom
    });
  }

  operations.push({
    entity: "individual",
    operation: "add-annotation",
    arguments: {
      individual: evidenceVarId,
      values: annotationValues,
      "model-id": modelId
    }
  });

  // Store evidence variable ID for the node
  nodeVariables.set(`${nodeId}_evidence`, evidenceVarId);
};

/**
 * Process all relationships in the tree
 */
const processRelationships = (
  nodes: TreeNode[],
  operations: Operation[],
  nodeVariables: Map<string, string>,
  modelId: string
): void => {
  nodes.forEach(node => {
    // Skip if node has no parent (root node)
    if (node.parentId && node.relation) {
      const parentVarId = nodeVariables.get(node.parentId);
      const nodeVarId = nodeVariables.get(node.id);

      if (parentVarId && nodeVarId) {
        // Add the edge between parent and node
        operations.push({
          entity: "edge",
          operation: "add",
          arguments: {
            subject: parentVarId,
            object: nodeVarId,
            predicate: node.relation.id,
            "model-id": modelId
          }
        });

        // If node has evidence, add edge annotation
        const evidenceVarId = nodeVariables.get(`${node.id}_evidence`);
        if (evidenceVarId) {
          operations.push({
            entity: "edge",
            operation: "add-annotation",
            arguments: {
              subject: parentVarId,
              object: nodeVarId,
              predicate: node.relation.id,
              values: [
                {
                  key: "evidence",
                  value: evidenceVarId
                }
              ],
              "model-id": modelId
            }
          });
        }
      }
    }

    // Process children recursively
    if (node.children?.length > 0) {
      processRelationships(node.children, operations, nodeVariables, modelId);
    }
  });
};

