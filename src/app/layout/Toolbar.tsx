import type React from 'react';
import { useState } from 'react';
import { Button, IconButton, Menu, MenuItem } from '@mui/material';
import { FaGithub, FaTwitter, FaFacebook } from 'react-icons/fa';
import { IoApps, IoChevronDown } from 'react-icons/io5';
import { useAuth } from '@/features/auth/authProvider';
import { useAppSelector } from '../hooks';
import type { RootState } from '../store/store';
import { ENVIRONMENT } from '@/@pango.core/data/constants';

const Toolbar: React.FC = () => {
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [aboutMenuAnchor, setAboutMenuAnchor] = useState<null | HTMLElement>(null);
  const [helpMenuAnchor, setHelpMenuAnchor] = useState<null | HTMLElement>(null);

  const { isLoggedIn, loginUrl, logoutUrl, noctuaUrl } = useAuth();
  const user = useAppSelector((state: RootState) => state.auth.user);

  const openApps = () => {
    console.log('Opening apps panel');
  };

  const logout = () => {
    window.location.href = logoutUrl;
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleAboutMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAboutMenuAnchor(event.currentTarget);
  };

  const handleAboutMenuClose = () => {
    setAboutMenuAnchor(null);
  };

  const handleHelpMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setHelpMenuAnchor(event.currentTarget);
  };

  const handleHelpMenuClose = () => {
    setHelpMenuAnchor(null);
  };

  return (
    <>
      <div className="relative flex h-full items-center px-1 md:px-2">
        <div className="flex flex-row items-center h-full border-r pr-4">
          <a href="http://geneontology.org/" target="_blank" rel="noreferrer">
            <img src="assets/images/logos/go-logo.large.png" alt="GO Logo" className="h-8" />
          </a>
        </div>

        <div className="flex flex-row items-center h-full pl-0 border-r pr-4" >
          <IconButton
            onClick={openApps}
            className="border-r h-[50px] w-[50px] rounded-none"
            title="Open Workbenches Menu"
          >
            <IoApps className="text-2xl" />
          </IconButton>
          <a className="mr-1 text-xl font-bold hover:text-blue-900" href={noctuaUrl} target="_blank" rel="noreferrer">
            Noctua
          </a>
          <a className="mr-1 text-xl hover:text-blue-900"
            href="/"
            onClick={(e) => {
              e.preventDefault(); // Prevent default anchor behavior
              window.location.reload(); // Refresh the page
            }}
          >
            Pathway Editor
          </a>
          {ENVIRONMENT.isDev && (
            <small className="text-xs">(dev)</small>
          )}
        </div>

        <div className="flex flex-row items-center justify-end flex-1">
          <div className="flex flex-row items-center border-r pr-4">
            <IconButton
              href="https://github.com/geneontology" target="_blank" rel="noreferrer"
              color="inherit"
              className="!w-8 !h-8"
              size="small"
            ><FaGithub />
            </IconButton>

            <IconButton
              href="https://twitter.com/news4go" target="_blank" rel="noreferrer"
              color="inherit"
              className="!w-8 !h-8"
              size="small"
            ><FaTwitter />
            </IconButton>
            <IconButton
              href="https://www.facebook.com/pages/Gene-Ontology/305908656519" target="_blank" rel="noreferrer"
              color="inherit"
              className="!w-8 !h-8"
              size="small"
            >
              <FaFacebook />
            </IconButton>

          </div>

          <div className="flex flex-row items-center border-r pl-12 pr-12">
            <Button onClick={handleAboutMenuOpen}>
              About
            </Button>
            <Menu
              anchorEl={aboutMenuAnchor}
              open={Boolean(aboutMenuAnchor)}
              onClose={handleAboutMenuClose}
            >
              <MenuItem onClick={handleAboutMenuClose}>
                <a href="http://geneontology.org/docs/introduction-to-go-resource/" target="_blank" rel="noreferrer" className="w-full">
                  About The GO
                </a>
              </MenuItem>
              <MenuItem onClick={handleAboutMenuClose}>
                <a href="http://geneontology.org/docs/gocam-overview/" target="_blank" rel="noreferrer" className="w-full">
                  About GO-CAM
                </a>
              </MenuItem>
            </Menu>

            <Button onClick={handleHelpMenuOpen}>
              Help
            </Button>
            <Menu
              anchorEl={helpMenuAnchor}
              open={Boolean(helpMenuAnchor)}
              onClose={handleHelpMenuClose}
            >
              <MenuItem onClick={handleHelpMenuClose}>
                <a href="http://wiki.geneontology.org/index.php/Noctua" target="_blank" rel="noreferrer" className="w-full">
                  Noctua User's Guide
                </a>
              </MenuItem>
            </Menu>
          </div>

          <div className="flex flex-row items-center pr-12">
            {isLoggedIn && user ? (
              <>
                <Button
                  className="text-left h-10 normal-case"
                  onClick={handleUserMenuOpen}
                >
                  <div className="flex flex-row items-center">
                    <div className="flex flex-col items-start mr-1 max-w-[150px] overflow-hidden">
                      <div className="truncate">{user.name}</div>
                      <div className="text-xs truncate">{user.group?.label}</div>
                    </div>
                    <IoChevronDown />
                  </div>
                </Button>
                <Menu
                  anchorEl={userMenuAnchor}
                  open={Boolean(userMenuAnchor)}
                  onClose={handleUserMenuClose}
                >
                  <MenuItem onClick={logout} className="text-red-500 w-full" data-pw="noc-logout-button">
                    Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <div>
                <Button
                  href={loginUrl}
                  className="bg-green-600 text-white hover:bg-green-700"
                  data-pw="noc-login-button"
                >
                  Login
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="border-l">
          <a href="https://www.alliancegenome.org" target="_blank" rel="noreferrer">
            <img src="assets/images/logos/alliance-logo.png" alt="Alliance Logo" className="h-8" />
          </a>
        </div>
      </div>
    </>
  );
};

export default Toolbar;