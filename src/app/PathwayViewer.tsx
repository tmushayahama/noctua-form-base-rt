import type React from 'react';
import { useGetGraphModelQuery } from '@/features/gocam/slices/camApiSlice';
import { useEffect } from 'react';
import { useAppDispatch } from './hooks';
import { setModel } from '@/features/gocam/slices/camSlice';
import { useSearchParams } from 'react-router-dom';

const PathwayEditor: React.FC = () => {
  const dispatch = useAppDispatch();

  const [searchParams] = useSearchParams();
  const modelId = searchParams.get('model_id')

  const {
    data: graphModel,
    error,
    isLoading,
    isSuccess
  } = useGetGraphModelQuery(modelId || '', { skip: !modelId });

  useEffect(() => {
    if (isSuccess && graphModel && graphModel.data) {
      dispatch(setModel(graphModel.data));
    }
  }, [graphModel, isSuccess, dispatch]);

  if (!modelId) {
    return <div className="p-4">No model ID provided</div>;
  }

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
          /* The new Pathway Diagram */
          <></>
        )}
      </div>
    </div>
  );
};

export default PathwayEditor;