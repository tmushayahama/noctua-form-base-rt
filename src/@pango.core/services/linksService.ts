import { ENVIRONMENT } from '../data/constants'

export const getLoginUrl = (): string => {

  const url = new URL(window.location.href);
  url.searchParams.delete('barista_token');

  const returnUrl = url.href;
  const baseUrl = `${ENVIRONMENT.globalBaristaLocation}/login`;

  const params = new URLSearchParams({ return: returnUrl });
  return `${baseUrl}?${params.toString()}`;
};

export const getLogoutUrl = (baristaToken: string, returnUrl: string): string => {
  const baseUrl = `${ENVIRONMENT.globalBaristaLocation}/logout`;
  const params = new URLSearchParams({ barista_token: baristaToken, return: returnUrl });
  return `${baseUrl}?${params.toString()}`;
};

export const getNoctuaUrl = (baristaToken: string): string => {
  const baseUrl = ENVIRONMENT.noctuaUrl;
  const params = baristaToken ? new URLSearchParams({ barista_token: baristaToken }) : '';
  return `${baseUrl}?${params.toString()}`;
};

export const getHomeUrl = (): string => {
  return window.location.href;
};

export const getGeneAccession = (gene: string) => {
  if (!gene) return null

  const geneId = gene.split(':')
  return geneId.length > 1 ? geneId[1] : null
}

export const getUniprotLink = (gene: string) => {
  if (!gene) return ENVIRONMENT.uniprotUrl

  const geneId = gene.split(':')
  return geneId.length > 1 ? ENVIRONMENT.uniprotUrl + geneId[1] : ENVIRONMENT.uniprotUrl
}


