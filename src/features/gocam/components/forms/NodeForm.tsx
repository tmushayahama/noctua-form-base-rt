import { useAppDispatch } from "@/app/hooks";
import TermAutocomplete from "@/features/search/components/Autocomplete";
import type { GOlrResponse } from "@/features/search/models/search";
import { AutocompleteType } from "@/features/search/models/search";
import { IconButton, Menu, MenuItem } from "@mui/material";
import { useMemo, useCallback } from "react";
import type { TreeNode, ShexShape } from "../../models/cam";
import { RootTypes } from "../../models/cam";
import { updateNode, addChildNode, removeNode } from "../../slices/activityFormSlice";
import useNestedMenu from "../../hooks/useNestedMenu";
import shapesData from '@/@pango.core/data/shapes.json';
import { getRelationLabel, getTermLabel } from "@/@pango.core/utils/dataUtil";
import { FiDelete } from "react-icons/fi";

const NodeForm: React.FC<{ node: TreeNode }> = ({ node }) => {
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
      label: getRelationLabel(predId),
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
    const relationLabel = getRelationLabel(predicateId);

    const rootTypes = objects.map(objId => {
      return {
        id: objId,
        label: getTermLabel(objId)
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
                <FiDelete />
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
            <NodeForm key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
};

export default NodeForm;