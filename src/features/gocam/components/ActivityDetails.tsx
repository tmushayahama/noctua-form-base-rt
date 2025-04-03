import type React from 'react';
import type { Activity, Edge, Evidence, Node } from '../models/cam';
import { setRightDrawerOpen } from '@/@pango.core/components/drawer/drawerSlice';
import { useAppDispatch } from '@/app/hooks';

interface ActivityDetailProps {
  activity: Activity
}

const ActivityDetail: React.FC<ActivityDetailProps> = ({ activity }) => {
  const dispatch = useAppDispatch();

  const handleClose = () => {
    dispatch(setRightDrawerOpen(false));
  };

  if (!activity) {
    return null;
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-4">
        {/* Header with close button */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Activity Details</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Activity Type */}
        <div className="mb-4">
          <span className="text-xs font-medium text-gray-500 uppercase">Activity Type</span>
          <div className="mt-1">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {activity.type}
            </span>
          </div>
        </div>

        {/* Root Node */}
        <div className="mb-4">
          <span className="text-xs font-medium text-gray-500 uppercase">Root Node</span>
          <div className="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200">
            <div className="font-medium">{activity.rootNode.label}</div>
            <div className="text-sm text-gray-500">{activity.rootNode.id}</div>
          </div>
        </div>

        {/* Molecular Function */}
        {activity.molecularFunction && (
          <div className="mb-4">
            <span className="text-xs font-medium text-gray-500 uppercase">Molecular Function</span>
            <div className="mt-1 p-3 bg-indigo-50 rounded-md border border-indigo-100">
              <div className="font-medium">{activity.molecularFunction.label}</div>
              <div className="text-sm text-gray-500">{activity.molecularFunction.id}</div>
            </div>
          </div>
        )}

        {/* Enabled By */}
        {activity.enabledBy && (
          <div className="mb-4">
            <span className="text-xs font-medium text-gray-500 uppercase">Enabled By</span>
            <div className="mt-1 p-3 bg-green-50 rounded-md border border-green-100">
              <div className="font-medium">{activity.enabledBy.label}</div>
              <div className="text-sm text-gray-500">{activity.enabledBy.id}</div>
            </div>
          </div>
        )}

        {/* Edges/Relationships */}
        {activity.edges && activity.edges.length > 0 && (
          <div className="mb-4">
            <span className="text-xs font-medium text-gray-500 uppercase">
              Relationships ({activity.edges.length})
            </span>
            <div className="mt-2 border border-gray-200 rounded-md divide-y">
              {activity.edges?.map((edge: Edge) => (
                <div key={edge.id} className="p-3">
                  <div className="flex items-center">
                    <div className="font-medium text-sm">{edge.source.label}</div>
                    <svg className="h-4 w-4 mx-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <div className="text-sm text-gray-700">{edge.label}</div>
                    <svg className="h-4 w-4 mx-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <div className="font-medium text-sm">{edge.target.label}</div>
                  </div>

                  {/* Evidence */}
                  {edge.evidence && edge.evidence.length > 0 && (
                    <div className="mt-2 pl-4">
                      {edge.evidence.map((ev: Evidence) => (
                        <div key={ev.uuid} className="text-xs p-2 bg-amber-50 rounded mt-1 border border-amber-100">
                          <div className="flex items-center mb-1">
                            <span className="font-medium">Evidence:</span>
                            <span className="ml-1 px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded-full">
                              {ev.evidenceCode.label}
                            </span>
                          </div>

                          {ev.reference && (
                            <div className="flex items-center">
                              <span className="font-medium mr-1">Reference:</span>
                              {ev.referenceUrl ? (
                                <a
                                  href={ev.referenceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  {ev.reference}
                                </a>
                              ) : (
                                <span>{ev.reference}</span>
                              )}
                            </div>
                          )}

                          {ev.with && (
                            <div>
                              <span className="font-medium mr-1">With:</span>
                              <span>{ev.with}</span>
                            </div>
                          )}

                          {ev.date && (
                            <div className="text-gray-500 mt-1">
                              {new Date(ev.date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nodes */}
        {activity.nodes && activity.nodes.length > 0 && (
          <div className="mb-4">
            <span className="text-xs font-medium text-gray-500 uppercase">
              Nodes ({activity.nodes.length})
            </span>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {activity.nodes.map((node: Node) => (
                <div key={node.uid} className="p-2 bg-gray-50 rounded border border-gray-200">
                  <div className="font-medium">{node.label}</div>
                  <div className="text-xs text-gray-500">{node.id}</div>
                  {node.rootTypes && node.rootTypes.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {node.rootTypes.map((type: string) => (
                        <span
                          key={type}
                          className="px-1.5 py-0.5 text-xs rounded-full bg-gray-200 text-gray-700"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityDetail;