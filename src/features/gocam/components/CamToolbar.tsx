import type React from 'react';
import { useState } from 'react';
import { Button, IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import {
  FaUser,
  FaCalendarDay,
  FaComment,
  FaClone,
  FaDownload,
  FaPen,
  FaTasks,
} from 'react-icons/fa';
import { useAppSelector } from '@/app/hooks';

const CamToolbar: React.FC = () => {
  const cam = useAppSelector(state => state.cam.model);

  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [contributorsMenuAnchor, setContributorsMenuAnchor] = useState<null | HTMLElement>(null);

  const handleExportMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleContributorsMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setContributorsMenuAnchor(event.currentTarget);
  };

  const handleContributorsMenuClose = () => {
    setContributorsMenuAnchor(null);
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
        return 'bg-amber-100 text-amber-800';
      case 'production':
        return 'bg-green-100 text-green-800';
      case 'review':
        return 'bg-yellow-100 text-yellow-800';
      case 'delete':
        return 'bg-red-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!cam) return null;

  const commentCount = cam.comments?.length || 0;
  const contributors = cam.contributors || [];
  const visibleContributors = contributors.slice(0, 2);
  const hiddenContributors = contributors.slice(2);

  return (
    <div className="flex items-center px-2 py-1 h-10 w-full bg-gradient-to-r from-blue-100 via-primary-100 to-blue-200 text-xs">
      {/* Title */}
      {cam.title && (
        <div className="flex items-center h-full px-2 max-w-[250px] border-r border-gray-500">
          <span className="truncate pr-2 flex-grow">
            <span className="font-bold mr-2">Title:</span>{cam.title}
          </span>
          <button
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            onClick={openCamForm}
          >
            <FaPen size={12} />
          </button>
        </div>
      )}

      {/* Comments */}
      <div className="px-1 h-full">
        <Tooltip title={cam.comments || 'No comments'} placement="top">
          <IconButton
            className="text-gray-600 hover:text-gray-800"
            onClick={openCamForm}
          >
            <FaComment size={16} />
            <span className="absolute top-0 right-0 bg-green-800 text-white text-2xs px-1 py-[1px] rounded-md">{commentCount}</span>
          </IconButton>
        </Tooltip>
      </div>

      <div className="px-1 border-r border-gray-500">
        <Tooltip title="Make a copy of this model" placement="top">
          <IconButton
            className=" text-gray-600 hover:text-gray-800"
            onClick={openCopyModel}
          >
            <FaClone size={16} />
          </IconButton>
        </Tooltip>
      </div>

      {/* State */}
      {cam.state && (
        <div className="flex items-center h-full px-2 max-w-[150px] border-r border-gray-500">
          <div className={`flex items-center h-6 px-2 rounded-full border border-gray-400 ${getStateColor(cam.state)}`}>
            <FaTasks size={12} className="mr-1" />
            <span>{cam.state}</span>
            <button
              className="ml-1 text-gray-500 hover:text-gray-700 focus:outline-none"
              onClick={openCamForm}
            >
              <FaPen size={10} />
            </button>
          </div>
        </div>
      )}

      {/* Date */}
      {cam.date && (
        <div className="flex items-center px-2 border-r border-gray-300">
          <div className="flex items-center text-xs h-6 pr-2 rounded-full bg-primary-50 text-primary-600 cursor-pointer border border-primary-300" onClick={openCamForm}>
            <div className="flex items-center justify-center h-full w-6 mr-1 rounded-full bg-primary-100 text-primary-600">
              <FaCalendarDay size={12} className="" />
            </div>
            <span>{cam.date}</span>
          </div>
        </div>
      )}

      {/* Contributors */}
      <div className="flex items-center flex-grow overflow-x-auto">
        <div className="flex flex-nowrap">
          {visibleContributors.map((contributor) => (
            <div key={contributor.uri} className="flex items-center  max-w-[180px] mr-2 truncate text-xs h-6 pr-2 rounded-full bg-primary-50 text-primary-600 border border-primary-300">
              <div className="flex items-center justify-center text-center text-2xs font-bold h-full min-w-6 mr-1 rounded-full bg-primary-100 text-primary-600">
                {contributor.initials}
              </div>
              <span className="flex-grow truncate">{contributor.name}</span>
            </div>
          ))}

          {hiddenContributors.length > 0 && (
            <>
              <button
                className="flex items-center h-6 px-2 rounded-full bg-primary-50 text-primary-600  border border-primary-300 cursor-pointer"
                onClick={handleContributorsMenuOpen}
              >
                <span>...</span>
              </button>
              <Menu
                anchorEl={contributorsMenuAnchor}
                open={Boolean(contributorsMenuAnchor)}
                onClose={handleContributorsMenuClose}
              >
                {hiddenContributors.map((contributor) => (
                  <MenuItem key={contributor.uri} onClick={handleContributorsMenuClose}>
                    <div className="flex items-center">
                      <div className="flex items-center justify-center text-center text-2xs font-bold h-6 w-6 mr-1 rounded-full bg-primary-100 text-primary-600">
                        {contributor.initials}
                      </div>
                      <span>{contributor.name}</span>
                    </div>
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
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