export function buildGoogleProxyHeaders(
  sessionAccessToken: string | undefined,
  requestHeaders: Pick<Headers, 'get'>,
): Record<string, string> {
  const authorizationHeader = requestHeaders.get('authorization');
  const requestBearerToken = authorizationHeader?.toLowerCase().startsWith('bearer ')
    ? authorizationHeader.slice(7).trim()
    : undefined;
  const requestGoogleToken = requestHeaders.get('x-google-access-token') ?? undefined;
  const accessToken = sessionAccessToken || requestBearerToken || requestGoogleToken;

  if (!accessToken) {
    return {};
  }

  return {
    Authorization: `Bearer ${accessToken}`,
    'X-Google-Access-Token': accessToken,
  };
}

