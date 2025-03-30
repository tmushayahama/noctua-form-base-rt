import type React from 'react';
import { useEffect, useState } from 'react';
import { useGetAllDataQuery } from '../slices/metadataApiSlice';

interface SplashScreenProps {
  children: React.ReactNode;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ children }) => {
  const { isLoading, isError, error } = useGetAllDataQuery();
  const [displaySplash, setDisplaySplash] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setDisplaySplash(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (displaySplash) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-white">
        <img
          src="/your-logo.png"
          alt="App Logo"
          className="w-32 h-32 mb-6"
        />
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mb-4"></div>
        <p className="text-lg text-gray-600">
          {isError ? `Error loading data: ${error?.message}` : 'Loading application data...'}
        </p>
      </div>
    );
  }

  return children;
};

export default SplashScreen;