import type { User } from "./user";

export const removeBaristaTokenFromUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete('barista_token');
  const newUrl = decodeURIComponent(url.href);
  window.history.replaceState(null, null, newUrl);
};

export const createContributorFromResponse = (response: any): User => {
  return {
    token: response.token,
    uri: response.uri,
    name: response.name,
    initials: response.initials,
    color: response.color,
    frequency: response.frequency,
    groups: response.groups,
  };
};

export const parameterize = (params: Record<string, string | null>) => {
  return Object.entries(params)
    .filter(([_, value]) => value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
};