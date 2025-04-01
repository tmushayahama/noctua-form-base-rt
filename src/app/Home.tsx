import type React from 'react';
import { useState } from 'react';
import { Button } from '@mui/material';
import { useGetGraphModelQuery } from '@/features/gocam/slices/camApiSlice';
import ActivityFlow from '@/features/gocam/components/ActivityFlow';
import { ReactFlowProvider } from 'reactflow';
import { useEffect } from 'react';
import { useAppDispatch } from './hooks';
import { setModel } from '@/features/gocam/slices/camSlice';
import ActivityForm from '@/features/gocam/components/forms/ActivityForm';
import ActivityFormDialog from '@/features/gocam/components/dialogs/ActivityFormDialog';

const Home: React.FC = () => {
  const dispatch = useAppDispatch();
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const handleDialogOpen = () => {
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleActivitySubmit = (data: any) => {
    console.log('Activity submitted:', data);
    handleDialogClose();
    // Handle the submitted activity data here
  };

  if (isLoading) return <div>Loading...</div>;

  if (error) {
    return <div className="text-red-500 p-4">Error loading graph data</div>;
  }

  if (!graphModel || !graphModel.data) {
    return <div className="p-4">No graph data available</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b p-4 flex justify-between items-center">
        <h1 className="text-lg font-medium">Activity Graph Visualization</h1>
        <Button
          variant="contained"
          color="primary"
          onClick={handleDialogOpen}
        >
          Add Activity
        </Button>
      </header>

      <div className="flex-1 p-0 overflow-hidden">
        {graphModel && (
          <ReactFlowProvider>
            <ActivityFlow graphModel={graphModel.data} />
          </ReactFlowProvider>
        )}
      </div>

      <ActivityFormDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        title="Add New Activity"
      >
        <ActivityForm
          onSubmit={handleActivitySubmit}
          onCancel={handleDialogClose}
        />
      </ActivityFormDialog>
    </div>
  );
};

export default Home;