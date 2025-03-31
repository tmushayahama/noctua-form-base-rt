import { ENVIRONMENT } from '@/@pango.core/data/constants';
import { useAppSelector } from '@/app/hooks';
import { useMemo } from 'react';
import { parameterize } from '../authServices';

export const useAuthUrls = () => {
  const baristaToken = useAppSelector(state => state.auth.baristaToken);

  return useMemo(() => {
    const returnUrl = window.location.href;
    const returnUrlParams: Record<string, string | null> = { 'return': returnUrl };

    // Create a properly typed baristaParams object
    const baristaParams: Record<string, string | null> = {};
    if (baristaToken) {
      baristaParams['barista_token'] = baristaToken;
    }

    return {
      loginUrl: `${ENVIRONMENT.globalBaristaLocation}/login?${parameterize(returnUrlParams)}`,
      logoutUrl: `${ENVIRONMENT.globalBaristaLocation}/logout?${parameterize({
        ...baristaParams,
        ...returnUrlParams
      })}`,
      noctuaUrl: `${ENVIRONMENT.noctuaUrl}?${baristaToken ? parameterize(baristaParams) : ''}`,
      homeUrl: window.location.href,
    };
  }, [baristaToken]);
};