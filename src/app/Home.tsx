import type React from 'react';
import { useGetGraphModelQuery } from '@/features/gocam/slices/camApiSlice';
import ActivityFlow from '@/features/gocam/components/ActivityFlow';
import { ReactFlowProvider } from 'reactflow';
import { useEffect } from 'react';
import { useAppDispatch } from './hooks';
import { setModel } from '@/features/gocam/slices/camSlice';

const Home: React.FC = () => {
  const dispatch = useAppDispatch();

  const modelId = 'gomodel:66df835200000000';

  const {
    data: graphModel,
    error,
    isLoading,
    isSuccess
  } = useGetGraphModelQuery(modelId);

  useEffect(() => {
    if (isSuccess && graphModel && graphModel.data) {
      dispatch(setModel(graphModel.data));
    }
  }, [graphModel, isSuccess, dispatch]);

  if (isLoading) return <div>Loading...</div>;

  if (error) {
    return <div className="text-red-500 p-4">Error loading graph data</div>;
  }

  if (!graphModel || !graphModel.data) {
    return <div className="p-4">No graph data available</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-0 overflow-hidden">
        {graphModel && (
          <ReactFlowProvider>
            <ActivityFlow graphModel={graphModel.data} />
          </ReactFlowProvider>
        )}
      </div>
    </div>
  );
};

export default Home;