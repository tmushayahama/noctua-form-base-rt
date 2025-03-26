import type React from 'react';
import { useState } from 'react';
import { Button, Chip, Menu, MenuItem, Tooltip } from '@mui/material';
import {
  FaUser,
  FaCalendarDay,
  FaComment,
  FaClone,
  FaDownload,
  FaPen,
  FaTasks,
  FaPlus,
  FaChevronDown
} from 'react-icons/fa';
import { useAppSelector } from '../hooks';


enum ActivityType {
  default = 'default',
  bpOnly = 'bpOnly',
  ccOnly = 'ccOnly'
}

// TODO gpad urls

const CamToolbar: React.FC = () => {
  const cam = useAppSelector(state => state.cam.model);

  console.log('cam', cam);
  const [createMenuAnchor, setCreateMenuAnchor] = useState<null | HTMLElement>(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);

  const handleCreateMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setCreateMenuAnchor(event.currentTarget);
  };

  const handleCreateMenuClose = () => {
    setCreateMenuAnchor(null);
  };

  const handleExportMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const openActivityForm = (type: ActivityType) => {
    console.log(`Opening activity form for type: ${type}`);
    handleCreateMenuClose();
  };

  const openCamForm = () => {
    console.log('Opening CAM form');
  };

  const openCopyModel = () => {
    console.log('Copying model');
  };

  const getStateColor = (stateName?: string) => {
    switch (stateName) {
      case 'development':
        return 'bg-amber-200 text-amber-800';
      case 'production':
        return 'bg-green-200 text-green-800';
      case 'review':
        return 'bg-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  if (!cam) return null;

  const commentCount = cam.comments?.length || 0;

  return (
    <div className="flex items-center px-2 py-1 h-10 w-full bg-gradient-to-r from-blue-100 via-purple-100 to-blue-200 text-xs">
      {/* Title */}
      {cam.title && (
        <div className="flex items-center px-2 max-w-[250px] truncate">
          <span className="font-bold mr-2 truncate">Title:</span>
          <span className="truncate pr-2">{cam.title}</span>
          <button
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            onClick={openCamForm}
          >
            <FaPen size={12} />
          </button>
        </div>
      )}

      {/* Comments */}
      <div className="px-4 border-l border-r border-gray-300">
        <Tooltip title={cam.comments || 'No comments'} placement="top">
          <Button
            variant="text"
            className="min-w-0 p-0 text-gray-600 hover:text-gray-800"
            onClick={openCamForm}
          >
            <FaComment size={16} />
            <span className="ml-1 text-xs">{commentCount}</span>
          </Button>
        </Tooltip>
      </div>

      {/* Clone Button */}
      <div className="px-4 border-r border-gray-300">
        <Tooltip title="Make a copy of this model" placement="top">
          <Button
            variant="text"
            className="min-w-0 p-0 text-gray-600 hover:text-gray-800"
            onClick={openCopyModel}
          >
            <FaClone size={16} />
          </Button>
        </Tooltip>
      </div>

      {/* Model State */}
      {cam.state && (
        <div className="flex items-center px-2 max-w-[150px]">
          <Chip
            icon={<FaTasks size={12} className="ml-2" />}
            label={cam.state}
            className={`h-6 text-xs ${getStateColor(cam.state)}`}
            deleteIcon={<FaPen size={10} />}
            onDelete={openCamForm}
          />
        </div>
      )}

      {/* Date */}
      {cam.date && (
        <div className="flex items-center px-2 max-w-[120px] border-r border-gray-300">
          <Chip
            icon={<FaCalendarDay size={12} className="ml-2" />}
            label={cam.date}
            className="h-6 text-xs bg-purple-100 text-purple-800"
            onClick={openCamForm}
          />
        </div>
      )}

      {/* Contributors */}
      <div className="flex items-center flex-grow overflow-x-auto">
        <div className="flex flex-nowrap">
          {(cam.contributors || []).map((contributor) => (
            <Chip
              key={contributor.orcid}
              icon={<FaUser size={12} className="ml-2" />}
              label={contributor.name}
              className="h-6 text-xs mr-2 bg-purple-100 text-purple-800"
              onClick={openCamForm}
            />
          ))}
        </div>
      </div>

      {/* Export Button */}
      <div className="w-[115px] flex justify-end">
        <Button
          variant="text"
          className="min-w-0 p-0 text-gray-600 hover:text-gray-800"
          onClick={handleExportMenuOpen}
        >
          <FaDownload size={16} />
        </Button>
        <Menu
          anchorEl={exportMenuAnchor}
          open={Boolean(exportMenuAnchor)}
          onClose={handleExportMenuClose}
        >
          <MenuItem onClick={handleExportMenuClose}>
            <a href={cam?.model?.modelInfo?.gpadUrl} target="_blank" rel="noopener noreferrer">
              GPAD
            </a>
          </MenuItem>
          <MenuItem onClick={handleExportMenuClose}>
            <a href={cam?.model?.modelInfo?.owlUrl} target="_blank" rel="noopener noreferrer">
              OWL
            </a>
          </MenuItem>
        </Menu>
      </div>
    </div>
  );
};

export default CamToolbar;