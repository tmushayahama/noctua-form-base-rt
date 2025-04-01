import { useEffect, useState } from 'react';
import type { RootState } from '@/app/store/store';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { removeBaristaTokenFromUrl, createContributorFromResponse } from '../authServices';
import { useGetUserInfoQuery } from '../slices/authApiSlice';
import { setBaristaToken, setUser } from '../slices/authSlice';

export const useAuthSetup = () => {
  const dispatch = useAppDispatch();
  const baristaToken = useAppSelector((state: RootState) => state.auth.baristaToken);
  const user = useAppSelector((state: RootState) => state.auth.user);
  const [isInitialized, setIsInitialized] = useState(false);

  // Parse query parameters - removed useLocation dependency
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const tokenFromUrl = url.searchParams.get('barista_token');

      if (tokenFromUrl) {
        dispatch(setBaristaToken(tokenFromUrl));
        removeBaristaTokenFromUrl();
      } else if (!baristaToken) {
        // Check localStorage if no token in URL
        const storedToken = localStorage.getItem('barista_token');
        if (storedToken) {
          dispatch(setBaristaToken(storedToken));
        }
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('Error processing URL params:', error);
      setIsInitialized(true);
    }
  }, [dispatch, baristaToken]);

  // Fetch user info when we have a token
  const { data: userInfo, isError } = useGetUserInfoQuery(baristaToken || '', {
    skip: !baristaToken || !isInitialized
  });

  useEffect(() => {
    if (userInfo && userInfo.token) {
      dispatch(setUser(userInfo));
    } else if (isError || (userInfo && !userInfo.token)) {
      // Clear auth state if API returns error OR empty response OR response without token
      dispatch(setUser(null));
      dispatch(setBaristaToken(null));
      localStorage.removeItem('barista_token');
    }
  }, [userInfo, isError, dispatch]);

  const isLoggedIn = !!baristaToken && !!user;

  return {
    isLoggedIn,
    isInitialized
  };
};