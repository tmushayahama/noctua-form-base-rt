import type { TreeNode, NodeType } from '../models/cam'

/** Find a node by uid anywhere in the tree. */
export const findNode = (tree: TreeNode[], uid: string): TreeNode | null => {
  for (const node of tree) {
    if (node.uid === uid) return node
    const found = findNode(node.children, uid)
    if (found) return found
  }
  return null
}

/** Remove a node by uid, returning the filtered tree. */
export const removeNode = (tree: TreeNode[], uid: string): TreeNode[] =>
  tree.filter(node => {
    if (node.uid === uid) return false
    node.children = removeNode(node.children, uid)
    return true
  })

/** Walk every node in the tree, calling fn on each. */
export const walkTree = (tree: TreeNode[], fn: (node: TreeNode) => void): void => {
  for (const node of tree) {
    fn(node)
    walkTree(node.children, fn)
  }
}

/** Find the first node matching a given nodeType. */
export const findNodeByType = (tree: TreeNode[], nodeType: NodeType): TreeNode | null => {
  for (const node of tree) {
    if (node.nodeType === nodeType) return node
    const found = findNodeByType(node.children, nodeType)
    if (found) return found
  }
  return null
}
