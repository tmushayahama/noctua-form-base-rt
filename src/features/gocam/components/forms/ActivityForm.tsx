import { useAppDispatch, useAppSelector } from '@/app/hooks';
import type { RootState } from '@/app/store/store';
import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import type { Aspect, GraphNode, TreeNode } from '../../models/cam';
import { NodeType, RootTypes } from '../../models/cam';
import { setRootTerm, addRootNode } from '../../slices/activityFormSlice';
import { Button } from '@mui/material';
import { convertTreeToJson, findNodeByNodeType } from '../../services/addActivityServices';
import { useUpdateGraphModelMutation } from '../../slices/camApiSlice';
import NodeForm from './NodeForm';
import { getRelationLabel, getTermLabel } from '@/@pango.core/utils/dataUtil';
import { closeDialog, openDialog } from '@/@pango.core/components/dialog/dialogSlice';
import { getAspect } from '../../services/graphServices';
import { Relations } from '@/@pango.core/models/relations';
import SimpleDialog from '@/@pango.core/components/dialog/SimpleDialog';
import SearchAnnotations from './SearchAnnotations';


const ActivityForm: React.FC = () => {
  const dispatch = useAppDispatch();
  const [updateGraphModel] = useUpdateGraphModelMutation();
  const model = useAppSelector((state: RootState) => state.cam.model);
  const tree = useAppSelector((state: RootState) => state.activityForm.tree);
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  const initialized = useRef<boolean>(false);


  useEffect(() => {
    if (!initialized.current && tree.length === 0) {
      initialized.current = true;

      const initialTermId = RootTypes.MOLECULAR_FUNCTION;
      const label = getTermLabel(initialTermId);

      dispatch(setRootTerm({
        id: initialTermId,
        label
      }));

      dispatch(addRootNode({
        rootTypes: [{
          id: initialTermId,
          label
        }],
        initialChildren: [
          {
            relation: {
              id: Relations.ENABLED_BY,
              label: getRelationLabel(Relations.ENABLED_BY)
            },
            rootTypes: [
              {
                id: RootTypes.MOLECULAR_ENTITY,
                label: getTermLabel(RootTypes.MOLECULAR_ENTITY)
              }
            ],
            nodeType: NodeType.MOLECULAR_ENTITY
          },
          {
            relation: {
              id: Relations.PART_OF,
              label: getRelationLabel(Relations.PART_OF)
            },
            rootTypes: [
              {
                id: RootTypes.BIOLOGICAL_PROCESS,
                label: getTermLabel(RootTypes.BIOLOGICAL_PROCESS)
              }
            ]
          },
          {
            relation: {
              id: Relations.OCCURS_IN,
              label: getRelationLabel(Relations.OCCURS_IN)
            },
            rootTypes: [
              {
                id: RootTypes.CELLULAR_COMPONENT,
                label: getTermLabel(RootTypes.CELLULAR_COMPONENT)
              }
            ]
          }]
      }));

    }
  }, [dispatch, tree, tree.length]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model || !model.id) {
      console.error('Model ID is not available');
      return;
    }
    console.log('Form submitted:', tree);
    const json = convertTreeToJson(tree, model?.id ?? 'gomodel:0000000000');
    console.log(JSON.stringify(json, null, 2));

    updateGraphModel(json)
      .unwrap()
      .then(() => {
        console.log('Graph model updated successfully');
      })
      .catch((error) => {
        console.error('Error updating graph model:', error);
      });
    setFormSubmitted(true);

    // Reset form submission status after showing success message
    setTimeout(() => {
      setFormSubmitted(false);
    }, 3000);
  };

  const handleOpenDialog = (node: TreeNode) => {
    const gpNode = findNodeByNodeType(tree, NodeType.MOLECULAR_ENTITY);
    const gpId = gpNode?.term?.id || '';
    if (gpId) {
      dispatch(openDialog({
        component: 'SearchAnnotations',
        title: 'Search',
        customProps: {
          gpId,
          aspect: getAspect(node.rootTypes),
          term: node.term,
        }
      }));
    }
  };

  return (

    <form onSubmit={handleFormSubmit}>
      {tree.length === 0 ? (
        <p>Loading tree...</p>
      ) : (
        <div className="mb-6">
          {tree.map(node => <NodeForm
            key={node.uid}
            node={node}
            onOpenDialog={handleOpenDialog}
          />)}
        </div>
      )}

      {formSubmitted && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
          Form submitted successfully!
        </div>
      )}

      <div className="mt-4">
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={tree.length === 0}
        >
          Save
        </Button>
      </div>

    </form>
  );
};

export default ActivityForm;