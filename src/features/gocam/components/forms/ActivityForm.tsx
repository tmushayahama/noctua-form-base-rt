// Menu hook for relation selection
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import type { RootState } from '@/app/store/store';
import TermAutocomplete from '@/features/search/components/Autocomplete';
import { AutocompleteType } from '@/features/search/models/search';
import type React from 'react';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { TreeNode } from '../../models/cam';
import { RootTypes } from '../../models/cam';
import { setRootTerm, addRootNode, addChildNode, updateNode, removeNode } from '../../slices/activityFormSlice';
import shapesData from '@/@pango.core/data/shapes.json';
import termsData from '@/@pango.core/data/shape-terms.json';
import { globalKnownRelations } from '@/@pango.core/data/relations';
import { Menu, MenuItem, Button, IconButton } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import DeleteIcon from '@mui/icons-material/Delete';
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



interface ShexShape {
  subject: string;
  predicate: string;
  object: string[];
  exclude_from_extensions?: boolean;
}

// Generate term lookup map
const termLookupMap = (() => {
  const map = new Map();
  termsData.forEach(term => {
    map.set(term.id, term.label);
  });
  return map;
})();

// Create relation ID to label mapping
const relationLabelMap = new Map();
globalKnownRelations.forEach(relation => {
  relationLabelMap.set(relation.id, relation.label);
});

// Node component with relation menu
const NodeComponent = ({ node }: { node: TreeNode }) => {
  const dispatch = useAppDispatch();
  const { anchorEl, isOpen, openMenu, closeMenu } = useRelationMenu();

  // Get predicates based on rootTypeIds (parent objects)
  const availablePredicates = useMemo(() => {
    // Filter shapes where subject is in node's rootTypeIds

    const matchingShapes = (shapesData.goshapes as ShexShape[]).filter(shape =>
      node.rootTypes.some(rootType => rootType.id === shape.subject)
    );

    // Get unique predicates with their objects
    const predicateMap = new Map();
    matchingShapes.forEach(shape => {
      if (!predicateMap.has(shape.predicate)) {
        predicateMap.set(shape.predicate, []);
      }
      const objects = predicateMap.get(shape.predicate);
      predicateMap.set(shape.predicate, [...new Set([...objects, ...shape.object])]);
    });

    return Array.from(predicateMap.entries()).map(([predId, objects]) => ({
      id: predId,
      label: relationLabelMap.get(predId) || predId,
      objects
    }));
  }, [node.rootTypes]);

  // Handle term selection
  const handleTermChange = useCallback((termId: string | null) => {
    if (!termId) return;
    const termLabel = termLookupMap.get(termId) || termId;

    dispatch(updateNode({
      id: node.id,
      term: { id: termId, label: termLabel },
    }));
  }, [dispatch, node.id]);

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
    ? "Gene Ontology Term"
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
            value={node.term}
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
            value={node.evidence?.evidenceCode}
            onChange={handleTermChange}
            onOpenTermDetails={() => { }}
          />
        </div>
        <div className="flex-1">
          <TermAutocomplete
            label="Reference"
            name={`reference-${node.id}`}
            autocompleteType={AutocompleteType.REFERENCE}
            value={node.evidence?.reference}
            onChange={handleTermChange}
            onOpenTermDetails={() => { }}
          />
        </div>
        <div className="flex-1">
          <TermAutocomplete
            label="With"
            name={`with-${node.id}`}
            autocompleteType={AutocompleteType.WITH}
            value={node.evidence?.withFrom}
            onChange={handleTermChange}
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
  const initialized = useRef(false);

  // Initialize root term
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

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Ontology Tree Form</h2>
      {tree.length === 0 ? (
        <p>Loading tree...</p>
      ) : (
        tree.map(node => <NodeComponent key={node.id} node={node} />)
      )}
    </div>
  );
};

export default OntologyTreeForm;