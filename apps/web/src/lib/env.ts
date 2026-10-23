export type AuthMode = 'local' | 'cognito';

export const env = {
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api/v1',
  authMode: (import.meta.env.VITE_AUTH_MODE === 'cognito' ? 'cognito' : 'local') as AuthMode,
  cognitoUserPoolId: (import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined) ?? '',
  cognitoClientId: (import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined) ?? '',
};
