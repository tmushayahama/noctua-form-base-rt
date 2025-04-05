import { useAppDispatch, useAppSelector } from '@/app/hooks';
import type { RootState } from '@/app/store/store';
import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { RootTypes } from '../../models/cam';
import { setRootTerm, addRootNode } from '../../slices/activityFormSlice';
import { Button } from '@mui/material';
import { convertTreeToJson } from '../../services/addActivityServices';
import { useUpdateGraphModelMutation } from '../../slices/camApiSlice';
import NodeForm from './NodeForm';
import { getTermLabel } from '@/@pango.core/utils/dataUtil';


const ActivityForm: React.FC = () => {
  const dispatch = useAppDispatch();
  const [updateGraphModel] = useUpdateGraphModelMutation();
  const model = useAppSelector((state: RootState) => state.cam.model);
  const { tree } = useAppSelector((state: RootState) => state.activityForm);
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
              id: "RO:0002333",
              label: "enabled by"
            },
            rootTypes: [
              {
                id: "CHEBI:33695",
                label: "information biomacromolecule"
              }
            ]
          },
          {
            relation: {
              id: "BFO:0000050",
              label: "part of"
            },
            rootTypes: [
              {
                id: "GO:0008150",
                label: "biological_process"
              }
            ]
          },
          {
            relation: {
              id: "BFO:0000066",
              label: "occurs in"
            },
            rootTypes: [
              {
                id: "CARO:0000000",
                label: "anatomical entity"
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

  return (

    <form onSubmit={handleFormSubmit}>
      {tree.length === 0 ? (
        <p>Loading tree...</p>
      ) : (
        <div className="mb-6">
          {tree.map(node => <NodeForm key={node.id} node={node} />)}
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