import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { Entity, EvidenceForm, NodeType, TreeNode } from '../models/cam';
import type { GOlrResponse } from '@/features/search/models/search';
import { Relations } from '@/@noctua.core/models/relations';


interface TreeState {
  rootTerm: Entity | null;
  tree: TreeNode[];
  initialRelations: string[];
}

const initialState: TreeState = {
  rootTerm: null,
  tree: [],
  initialRelations: Object.values(Relations),
};

const removeNodeById = (nodes: TreeNode[], uid: string): TreeNode[] => {
  return nodes.filter(node => {
    if (node.uid === uid) return false;
    node.children = removeNodeById(node.children, uid);
    return true;
  });
};

export const activityFormSlice = createSlice({
  name: 'activityForm',
  initialState,
  reducers: {
    setRootTerm: (state, action: PayloadAction<Entity>) => {
      state.rootTerm = action.payload;
      state.tree = [];
    },


    addRootNode: (state, action: PayloadAction<{
      rootTypes: Entity[];
      initialChildren?: {
        relation: Entity;
        rootTypes: Entity[];
        nodeType?: NodeType;
      }[];
    }>) => {
      const { rootTypes, initialChildren } = action.payload;
      const rootNodeId = uuidv4();

      const newRootNode: TreeNode = {
        uid: rootNodeId,
        parentId: null,
        rootTypes,
        children: initialChildren ? initialChildren.map(child => ({
          uid: uuidv4(),
          relation: child.relation,
          parentId: rootNodeId,
          rootTypes: child.rootTypes,
          nodeType: child.nodeType,
          children: []
        })) : [],
      };

      state.tree.push(newRootNode);
    },

    addChildNode: (state, action: PayloadAction<{
      parentId: string;
      relation: Entity;
      rootTypes: Entity[];
      nodeType?: NodeType;
    }>) => {
      const { parentId, relation, rootTypes, nodeType } = action.payload;

      // Find parent node
      const findAndAddChild = (nodes: TreeNode[]): boolean => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].uid === parentId) {
            nodes[i].children.push({
              uid: uuidv4(),
              relation,
              parentId,
              rootTypes,
              nodeType,
              children: []
            });
            return true;
          }

          if (findAndAddChild(nodes[i].children)) {
            return true;
          }
        }
        return false;
      };

      findAndAddChild(state.tree);
    },

    updateNode: (state, action: PayloadAction<{
      uid: string;
      term?: GOlrResponse;
      evidence?: EvidenceForm;
      relation?: Entity;
      rootTypes?: Entity[];
    }>) => {
      const { uid, relation, rootTypes, term, evidence, } = action.payload;

      // Find and update node
      const updateNodeInTree = (nodes: TreeNode[]): boolean => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].uid === uid) {
            if (term !== undefined) nodes[i].term = term;
            if (relation !== undefined) nodes[i].relation = relation;
            if (rootTypes !== undefined) nodes[i].rootTypes = rootTypes;
            if (evidence !== undefined) nodes[i].evidence = evidence;
            return true;
          }

          if (updateNodeInTree(nodes[i].children)) {
            return true;
          }
        }
        return false;
      };

      updateNodeInTree(state.tree);
    },

    removeNode: (state, action: PayloadAction<string>) => {
      const uid = action.payload;
      state.tree = removeNodeById(state.tree, uid);
    }
  }
});

export const { setRootTerm, addRootNode, addChildNode, updateNode, removeNode } = activityFormSlice.actions;
export default activityFormSlice.reducer;