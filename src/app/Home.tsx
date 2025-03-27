import type React from 'react'
import { useGetGraphModelQuery } from '@/features/gocam/slices/camApiSlice'
import ActivityFlow from '@/features/gocam/components/ActivityFlow'
import { ReactFlowProvider } from 'reactflow'
import { useEffect } from 'react';
import { useAppDispatch } from './hooks';
import { setModel } from '@/features/gocam/slices/camSlice';

const Home: React.FC = () => {
  const dispatch = useAppDispatch();
  const modelId = 'gomodel:61f34dd300001044' //'gomodel:66df835200000000'

  const { data: graphModel, error, isLoading, isSuccess } = useGetGraphModelQuery(modelId);

  useEffect(() => {
    if (isSuccess && graphModel && graphModel.data) {
      dispatch(setModel(graphModel.data))
    }
  }, [graphModel, isSuccess, dispatch])

  if (isLoading) return <div>Loading...</div>;

  if (error) {
    return <div className="text-red-500 p-4">Error loading graph data</div>;
  }

  if (!graphModel || !graphModel.data) {
    return <div className="p-4">No graph data available</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b p-4">
        <h1 className="text-lg font-medium">Activity Graph Visualization</h1>
      </header>

      <div className="flex-1 p-0 overflow-hidden">
        {graphModel && (
          <ReactFlowProvider>
            <ActivityFlow graphModel={graphModel.data} />
          </ReactFlowProvider>
        )}
      </div>
    </div>
    /*    <div className="w-full">
         <div className="bg-white p-4 rounded-lg shadow">
           <div className="mb-4">
             <h2 className="text-xl font-bold">{data.title || `Graph Model: ${data.id}`}</h2>
             <div className="text-sm text-gray-500">
               {data.nodes.length} nodes • {data.edges.length} edges
               {data.date && ` • Updated: ${data.date}`}
             </div>
           </div>
   
           <div className="border-b pb-2 mb-4">
             <div className="flex space-x-4">
               <button className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none">
                 Nodes
               </button>
               <button className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none">
                 Edges
               </button>
               {data.contributor && (
                 <button className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none">
                   Contributors
                 </button>
               )}
             </div>
           </div>
   
           <div className="overflow-x-auto">
             <table className="min-w-full bg-white">
               <thead>
                 <tr className="bg-gray-100 border-b">
                   <th className="p-2 text-left">ID</th>
                   <th className="p-2 text-left">Label</th>
                   <th className="p-2 text-left">Types</th>
                   <th className="p-2 text-left">Date</th>
                   <th className="p-2 text-left">Contributor</th>
                 </tr>
               </thead>
               <tbody>
                 {data.nodes.map(node => (
                   <tr key={node.id} className="border-b hover:bg-gray-50">
                     <td className="p-2 font-mono text-xs">{node.id.split('/').pop()}</td>
                     <td className="p-2">{node.label}</td>
                     <td className="p-2">
                       <div className="flex flex-wrap gap-1">
                         {node.rootTypes.map(type => (
                           <span key={type} className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100">
                             {type.split('#').pop()?.split('/').pop() || type}
                           </span>
                         ))}
                       </div>
                     </td>
                     <td className="p-2 text-sm">{node.date}</td>
                     <td className="p-2 text-sm">{node.contributor?.split('/').pop()}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </div>
       </div> */
  );
};

export default Home
