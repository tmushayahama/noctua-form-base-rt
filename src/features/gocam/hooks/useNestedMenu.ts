import { useState, useCallback } from "react";

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

export default useNestedMenu;