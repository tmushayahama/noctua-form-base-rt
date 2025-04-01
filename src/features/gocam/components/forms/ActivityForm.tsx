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
import DeleteIcon from '@mui/icons-material/Delete';
import { convertTreeToJson } from '../../services/addActivityServices';

// Relation menu hook
const useNestedMenu = () => {
  const [relationMenuAnchor, setRelationAnchorEl] = useState<null | HTMLElement>(null);
  const [mainMenuAnchor, setMainMenuAnchor] = useState<null | HTMLElement>(null);
  const [evidenceMenuAnchor, setEvidenceMenuAnchor] = useState<null | HTMLElement>(null);

  const handleRelationMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setRelationAnchorEl(event.currentTarget);
  };

  const handleCloseRelationMenu = useCallback(() => {
    setRelationAnchorEl(null);
  }, []);

  const handleMainMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMainMenuAnchor(event.currentTarget);
  };

  const handleMainMenuClose = () => {
    setMainMenuAnchor(null);
  };

  // Evidence menu handlers
  const handleEvidenceMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setEvidenceMenuAnchor(event.currentTarget);
  };

  const handleEvidenceMenuClose = () => {
    setEvidenceMenuAnchor(null);
  };

  return {
    mainMenuAnchor,
    relationMenuAnchor,
    evidenceMenuAnchor,
    isMainMenuOpen: Boolean(mainMenuAnchor),
    isRelationMenuOpen: Boolean(relationMenuAnchor),
    isEvidenceMenuOpen: Boolean(evidenceMenuAnchor),
    openMainMenu: handleMainMenuOpen,
    closeMainMenu: handleMainMenuClose,
    openRelationMenu: handleRelationMenuOpen,
    closeRelationMenu: handleCloseRelationMenu,
    openEvidenceMenu: handleEvidenceMenuOpen,
    closeEvidenceMenu: handleEvidenceMenuClose,
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
  const {
    mainMenuAnchor,
    relationMenuAnchor,
    evidenceMenuAnchor,
    isMainMenuOpen,
    isRelationMenuOpen,
    isEvidenceMenuOpen,
    openMainMenu,
    closeMainMenu,
    openRelationMenu,
    closeRelationMenu,
    openEvidenceMenu,
    closeEvidenceMenu,
  } = useNestedMenu();

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

    closeRelationMenu();
    closeMainMenu();
  }, [dispatch, node.id, closeRelationMenu, closeMainMenu]);

  // Create label for autocomplete
  const autocompleteLabel = node.parentId === null
    ? node.rootTypes.map(rt => rt.label).join(', ')
    : `${node.relation?.label} (${node.rootTypes.map(rt => rt.label).join(', ')})`;

  return (
    <div className="pl-4 my-4">
      <div className="flex items-center gap-2 w-full">
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
        <div className="w-[250px]">
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

        <div className="w-[150px]">
          <TermAutocomplete
            label="Reference"
            name={`reference-${node.id}`}
            autocompleteType={AutocompleteType.REFERENCE}
            value={node.evidence?.reference || null}
            onChange={handleReferenceChange}
            onOpenTermDetails={() => { }}
          />
        </div>

        <div className="w-[150px]">
          <TermAutocomplete
            label="With"
            name={`with-${node.id}`}
            autocompleteType={AutocompleteType.WITH}
            value={node.evidence?.withFrom || null}
            onChange={handleWithFromChange}
            onOpenTermDetails={() => { }}
          />
        </div>


        {/* NEW NESTED MENU SYSTEM */}
        <IconButton
          size="small"
          onClick={openMainMenu}
        >
          +
        </IconButton>

        {/* Main Menu */}
        <Menu
          anchorEl={mainMenuAnchor}
          open={isMainMenuOpen}
          onClose={closeMainMenu}
          className=""
        >
          <MenuItem onClick={closeMainMenu}>
            Search Annotations
          </MenuItem>
          <MenuItem onClick={closeMainMenu}>
            NOT Qualifier
          </MenuItem>
          <MenuItem
            onClick={(event) => {
              openRelationMenu(event);
            }}
          >
            Add an Extension
          </MenuItem>
          <MenuItem
            onClick={(event) => {
              openEvidenceMenu(event);
            }}
          >
            Evidence
          </MenuItem>
          <MenuItem onClick={closeMainMenu}>
            Add Root Term
          </MenuItem>
          <MenuItem onClick={closeMainMenu}>
            Clear Values
          </MenuItem>
          {node.parentId !== null && (
            <MenuItem onClick={closeMainMenu}>
              <IconButton
                color="error"
                size="small"
                onClick={() => dispatch(removeNode(node.id))}
              >
                <DeleteIcon />
              </IconButton> Delete Row
            </MenuItem>
          )}
        </Menu>

        {/* Add Extensions Submenu */}
        <Menu
          anchorEl={relationMenuAnchor}
          open={isRelationMenuOpen}
          onClose={closeRelationMenu}
          className=""
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

        {/* Evidence Submenu */}
        <Menu
          anchorEl={evidenceMenuAnchor}
          open={isEvidenceMenuOpen}
          onClose={closeEvidenceMenu}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          className=""
        >
          <MenuItem onClick={closeEvidenceMenu}>
            Add Evidence
          </MenuItem>
          <MenuItem onClick={closeEvidenceMenu}>
            Remove Evidence
          </MenuItem>
          <MenuItem onClick={closeEvidenceMenu}>
            Clone Evidence
          </MenuItem>
        </Menu>
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

const ActivityForm: React.FC = () => {
  const dispatch = useAppDispatch();
  const model = useAppSelector((state: RootState) => state.cam.model);
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
    if (!model || !model.id) {
      console.error('Model ID is not available');
      return;
    }
    console.log('Form submitted:', tree);
    const json = convertTreeToJson(tree, model?.id ?? 'gomodel:0000000000');
    console.log(JSON.stringify(json, null, 2));
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
  );
};

export default ActivityForm;