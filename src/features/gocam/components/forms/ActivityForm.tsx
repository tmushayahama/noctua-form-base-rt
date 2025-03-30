import { useAppDispatch, useAppSelector } from '@/app/hooks';
import type { RootState } from '@/app/store/store';
import TermAutocomplete from '@/features/search/components/Autocomplete';
import type { GOlrResponse } from '@/features/search/models/search';
import { AutocompleteType } from '@/features/search/models/search';
import type React from 'react';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { TreeNode } from '../../models/cam';
import { RootTypes } from '../../models/cam';
import { setRootTerm, addRootNode, addChildNode, updateNode, removeNode } from '../../slices/activityFormSlice';
import shapesData from '@/@pango.core/data/shapes.json';
import termsData from '@/@pango.core/data/shape-terms.json';
import { globalKnownRelations } from '@/@pango.core/data/relations';
import { Menu, MenuItem, Button, IconButton, Paper } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import DeleteIcon from '@mui/icons-material/Delete';

// Relation menu hook
const useRelationMenu = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpenMenu = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
  }, []);

  return {
    anchorEl,
    isOpen: Boolean(anchorEl),
    openMenu: handleOpenMenu,
    closeMenu: handleCloseMenu
  };
};

// Interface for shape data
interface ShexShape {
  subject: string;
  predicate: string;
  object: string[];
  exclude_from_extensions?: boolean;
}



// Generate term lookup map
const termLookupMap = (() => {
  const map = new Map<string, string>();
  termsData.forEach((term: any) => {
    map.set(term.id, term.label);
  });
  return map;
})();

// Create relation ID to label mapping
const relationLabelMap = new Map<string, string>();
globalKnownRelations.forEach((relation: any) => {
  relationLabelMap.set(relation.id, relation.label);
});

// Node component with relation menu
const NodeComponent: React.FC<{ node: TreeNode }> = ({ node }) => {
  const dispatch = useAppDispatch();
  const { anchorEl, isOpen, openMenu, closeMenu } = useRelationMenu();

  // Get predicates based on rootTypeIds (parent objects)
  const availablePredicates = useMemo(() => {
    // Filter shapes where subject is in node's rootTypeIds
    const matchingShapes = ((shapesData.goshapes || []) as ShexShape[]).filter(shape =>
      node.rootTypes.some(rootType => rootType.id === shape.subject)
    );

    // Get unique predicates with their objects
    const predicateMap = new Map<string, string[]>();
    matchingShapes.forEach(shape => {
      if (!predicateMap.has(shape.predicate)) {
        predicateMap.set(shape.predicate, []);
      }
      const objects = predicateMap.get(shape.predicate) || [];
      predicateMap.set(shape.predicate, [...new Set([...objects, ...shape.object])]);
    });

    return Array.from(predicateMap.entries()).map(([predId, objects]) => ({
      id: predId,
      label: relationLabelMap.get(predId) || predId,
      objects
    }));
  }, [node.rootTypes]);

  // Handle term selection - Fix for controlled/uncontrolled issue
  const handleTermChange = useCallback((term: GOlrResponse | null) => {
    if (!term) return;

    dispatch(updateNode({
      id: node.id,
      term: term,
    }));
  }, [dispatch, node.id]);

  // Handle evidence code selection
  const handleEvidenceCodeChange = useCallback((evidenceCode: GOlrResponse | null) => {
    if (!evidenceCode) return;

    dispatch(updateNode({
      id: node.id,
      evidence: {
        ...(node.evidence || {}),
        evidenceCode
      }
    }));
  }, [dispatch, node.id, node.evidence]);

  // Handle reference selection
  const handleReferenceChange = useCallback((reference: GOlrResponse | null) => {
    if (!reference) return;

    dispatch(updateNode({
      id: node.id,
      evidence: {
        ...(node.evidence || {}),
        reference
      }
    }));
  }, [dispatch, node.id, node.evidence]);

  // Handle withFrom selection
  const handleWithFromChange = useCallback((withFrom: GOlrResponse | null) => {
    if (!withFrom) return;

    dispatch(updateNode({
      id: node.id,
      evidence: {
        ...(node.evidence || {}),
        withFrom
      }
    }));
  }, [dispatch, node.id, node.evidence]);

  // Add child node when relation selected
  const handleRelationSelect = useCallback((predicateId: string, objects: string[]) => {
    const relationLabel = relationLabelMap.get(predicateId) || predicateId;

    const rootTypes = objects.map(objId => {
      return {
        id: objId,
        label: termLookupMap.get(objId) || objId
      }
    });

    dispatch(addChildNode({
      parentId: node.id,
      relation: { id: predicateId, label: relationLabel },
      rootTypes,
    }));

    closeMenu();
  }, [dispatch, node.id, closeMenu]);

  // Create label for autocomplete
  const autocompleteLabel = node.parentId === null
    ? node.rootTypes.map(rt => rt.label).join(', ')
    : `${node.relation?.label} (${node.rootTypes.map(rt => rt.label).join(', ')})`;

  return (
    <div className="border-l-2 border-gray-300 pl-4 my-4">
      <div className="flex items-center gap-3">
        {/* Term Autocomplete */}
        <div className="flex-1">
          <TermAutocomplete
            label={autocompleteLabel}
            name={`term-${node.id}`}
            rootTypeIds={node.rootTypes.map(rt => rt.id)}
            autocompleteType={AutocompleteType.TERM}
            value={node.term || null}
            onChange={handleTermChange}
            onOpenTermDetails={() => { }}
          />
        </div>

        <div className="flex-1">
          <TermAutocomplete
            label="Evidence"
            name={`evidence-${node.id}`}
            rootTypeIds={[RootTypes.EVIDENCE]}
            autocompleteType={AutocompleteType.EVIDENCE_CODE}
            value={node.evidence?.evidenceCode || null}
            onChange={handleEvidenceCodeChange}
            onOpenTermDetails={() => { }}
          />
        </div>

        <div className="flex-1">
          <TermAutocomplete
            label="Reference"
            name={`reference-${node.id}`}
            autocompleteType={AutocompleteType.REFERENCE}
            value={node.evidence?.reference || null}
            onChange={handleReferenceChange}
            onOpenTermDetails={() => { }}
          />
        </div>

        <div className="flex-1">
          <TermAutocomplete
            label="With"
            name={`with-${node.id}`}
            autocompleteType={AutocompleteType.WITH}
            value={node.evidence?.withFrom || null}
            onChange={handleWithFromChange}
            onOpenTermDetails={() => { }}
          />
        </div>

        {/* Relation Menu */}
        <div>
          <Button
            variant="outlined"
            endIcon={<ArrowDropDownIcon />}
            onClick={openMenu}
          >
            Add Relation
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={isOpen}
            onClose={closeMenu}
          >
            {availablePredicates.map(predicate => (
              <MenuItem
                key={predicate.id}
                onClick={() => handleRelationSelect(predicate.id, predicate.objects)}
              >
                {predicate.label}
              </MenuItem>
            ))}
          </Menu>
        </div>

        {/* Remove button (not for root) */}
        {node.parentId !== null && (
          <IconButton
            color="error"
            size="small"
            onClick={() => dispatch(removeNode(node.id))}
          >
            <DeleteIcon />
          </IconButton>
        )}
      </div>

      {/* Children nodes */}
      {node.children.length > 0 && (
        <div className="ml-2 mt-3">
          {node.children.map(child => (
            <NodeComponent key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
};

const OntologyTreeForm: React.FC = () => {
  const dispatch = useAppDispatch();
  const { tree } = useAppSelector((state: RootState) => state.activityForm);
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  const initialized = useRef<boolean>(false);

  useEffect(() => {
    if (!initialized.current && tree.length === 0) {
      initialized.current = true;

      const initialTermId = RootTypes.MOLECULAR_FUNCTION;
      const label = termLookupMap.get(initialTermId) || initialTermId;

      dispatch(setRootTerm({
        id: initialTermId,
        label
      }));

      dispatch(addRootNode(
        [{
          id: initialTermId,
          label
        }],
      ));
    }
  }, [dispatch, tree.length]);


  // Handle form submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', tree);
    setFormSubmitted(true);

    // Reset form submission status after showing success message
    setTimeout(() => {
      setFormSubmitted(false);
    }, 3000);
  };

  // Initialize root term

  return (
    <Paper elevation={3} className="p-6 m-4">
      <h2 className="text-xl font-bold mb-4">Ontology Tree Form</h2>

      <form onSubmit={handleFormSubmit}>
        {tree.length === 0 ? (
          <p>Loading tree...</p>
        ) : (
          <div className="mb-6">
            {tree.map(node => <NodeComponent key={node.id} node={node} />)}
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
    </Paper>
  );
};

export default OntologyTreeForm;