import type React from 'react';
import { useAppDispatch } from '@/app/hooks';
import { setRightDrawerOpen } from '@/@pango.core/components/drawer/drawerSlice';
import type { Activity, Edge, GraphNode } from '../models/cam';

import { FaTrash, FaEdit } from 'react-icons/fa';

// TODO Add reference links

interface ActivityDetailProps {
  activity: Activity;
}

const ActivityRow: React.FC<{ node: GraphNode; edge: Edge; level?: number }> = ({ node, edge, level = 0 }) => {
  return (
    <div className='w-full flex gap-2'>
      {/* First box with floating label */}
      <div className="relative flex flex-col flex-1 justify-start px-2 pt-6 text-sm border border-gray-300 rounded-lg group hover:border-primary-500 hover:shadow-md transition-all duration-200">
        <div className="absolute -top-1 left-2 px-2 bg-white text-2xs text-primary-500 font-bold">
          <span>{edge.label}</span>
        </div>
        {/* Delete button - appears on hover */}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button className="p-1 text-red-500 hover:bg-red-50 rounded-full">
            <FaTrash size={14} />
          </button>
        </div>
        {/* Edit button - appears on hover */}
        <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button className="p-1 text-blue-500 hover:bg-blue-50 rounded-full">
            <FaEdit size={14} />
          </button>
        </div>
        <span>
          {node.label} <br />
          <span className="text-gray-500 text-xs">{node.id}</span>
        </span>
      </div>

      {/* Evidence boxes with floating labels */}
      {edge.evidence && edge.evidence.length > 0 ? (
        edge.evidence.map((ev, idx) => (
          <div key={ev.uid} className="flex flex-row gap-2 w-[500px]">
            {/* Evidence Code box */}
            <div className="relative flex-1 pt-6 px-2 text-xs border border-gray-300 rounded-lg group hover:border-primary-500 hover:shadow-md transition-all duration-200">
              <div className="absolute -top-1 left-2 px-2 bg-white text-2xs text-primary-500 font-bold">
                <span>Evidence</span>
              </div>
              {/* Delete button - appears on hover */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button className="p-1 text-red-500 hover:bg-red-50 rounded-full">
                  <FaTrash size={14} />
                </button>
              </div>
              {/* Edit button - appears on hover */}
              <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button className="p-1 text-blue-500 hover:bg-blue-50 rounded-full">
                  <FaEdit size={14} />
                </button>
              </div>
              <span>
                {ev.evidenceCode?.label} <br />
                <span className="text-gray-500 text-xs">{ev.evidenceCode?.id}</span>
              </span>
            </div>

            {/* Reference box */}
            <div className="relative w-[120px] pt-6 px-2 text-xs border border-gray-300 rounded-lg group hover:border-primary-500 hover:shadow-md transition-all duration-200">
              <div className="absolute -top-1 left-2 px-2 bg-white text-2xs text-primary-500 font-bold">
                <span>Reference</span>
              </div>
              {/* Delete button - appears on hover */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button className="p-1 text-red-500 hover:bg-red-50 rounded-full">
                  <FaTrash size={14} />
                </button>
              </div>
              {/* Edit button - appears on hover */}
              <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button className="p-1 text-blue-500 hover:bg-blue-50 rounded-full">
                  <FaEdit size={14} />
                </button>
              </div>
              <span>
                <a href={ev.referenceUrl} target="_blank" rel="noopener noreferrer">
                  {ev.reference}
                </a>
              </span>
            </div>

            {/* With box */}
            <div className="relative w-[120px] pt-6 px-2 text-xs border border-gray-300 rounded-lg group hover:border-primary-500 hover:shadow-md transition-all duration-200">
              <div className="absolute -top-1 left-2 px-2 bg-white text-2xs text-primary-500 font-bold">
                <span>With</span>
              </div>
              {/* Delete button - appears on hover */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button className="p-1 text-red-500 hover:bg-red-50 rounded-full">
                  <FaTrash size={14} />
                </button>
              </div>
              {/* Edit button - appears on hover */}
              <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button className="p-1 text-blue-500 hover:bg-blue-50 rounded-full">
                  <FaEdit size={14} />
                </button>
              </div>
              <span>{ev.with}</span>
            </div>
          </div>
        ))
      ) : (
        <div className="relative px-2 pt-6 text-xs border border-gray-300 flex-1 group hover:border-primary-500 hover:shadow-md transition-all duration-200">
          <div className="absolute -top-1 left-2 px-2 bg-white text-2xs text-primary-500 font-bold">
            <span>Evidence</span>
          </div>
          {/* Delete button - appears on hover */}
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button className="p-1 text-red-500 hover:bg-red-50 rounded-full">
              <FaTrash size={14} />
            </button>
          </div>
          {/* Edit button - appears on hover */}
          <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button className="p-1 text-blue-500 hover:bg-blue-50 rounded-full">
              <FaEdit size={14} />
            </button>
          </div>
          <span>No evidence</span>
        </div>
      )}

      <div className="flex items-center justify-center px-2 w-16">
        <button className="text-gray-500 hover:text-black">⋮</button>
      </div>
    </div>
  );
};


const ActivityDetail: React.FC<ActivityDetailProps> = ({ activity }) => {
  const dispatch = useAppDispatch();

  const handleClose = () => {
    dispatch(setRightDrawerOpen(false));
  };

  if (!activity) return null;

  return (
    <div className="h-full overflow-auto">
      {activity.enabledBy && (
        <div className="text-sm font-semibold text-gray-700 p-2 border-b border-gray-300">
          {activity.enabledBy.label}
        </div>
      )}

      {activity.molecularFunction && (
        <div className="text-xs text-gray-700 p-2 border-b border-gray-300">
          {activity.molecularFunction.label}
        </div>
      )}

      <div className="flex flex-col gap-2 p-2">
        {activity.edges.map((edge) => (
          <ActivityRow key={edge.uid} edge={edge} node={edge.target} level={0} />
        ))}
      </div>
    </div>
  );
};

export default ActivityDetail;
