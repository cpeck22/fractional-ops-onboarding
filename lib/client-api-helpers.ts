/**
 * Helper function to add impersonate parameter to API URLs
 * Used when admin is impersonating a client
 */
export function addImpersonateParam(url: string, impersonateUserId: string | null): string {
  if (!impersonateUserId) return url;
  
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}impersonate=${impersonateUserId}`;
}

