'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  refreshAccessToken,
  signup as signupRequest,
  type AuthMeResponse,
  type LoginInput,
  type SignupInput,
} from '../api';
import { ApiError } from '../api/client';

type AuthStatus = 'booting' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthMeResponse | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  signup: (input: SignupInput) => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function hydrateUserFromAccessToken(
  accessToken: string,
): Promise<AuthMeResponse> {
  return getMe(accessToken);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('booting');
  const [user, setUser] = useState<AuthMeResponse | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const refreshResult = await refreshAccessToken();
      const nextAccessToken = refreshResult.accessToken;
      const me = await hydrateUserFromAccessToken(nextAccessToken);

      setAccessToken(nextAccessToken);
      setUser(me);
      setStatus('authenticated');

      return true;
    } catch {
      clearSession();
      return false;
    }
  }, [clearSession]);

  const signup = useCallback(async (input: SignupInput) => {
    const session = await signupRequest(input);
    const me = await hydrateUserFromAccessToken(session.accessToken);

    setAccessToken(session.accessToken);
    setUser(me);
    setStatus('authenticated');
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const session = await loginRequest(input);
    const me = await hydrateUserFromAccessToken(session.accessToken);

    setAccessToken(session.accessToken);
    setUser(me);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapAuth() {
      try {
        const refreshResult = await refreshAccessToken();
        const me = await hydrateUserFromAccessToken(refreshResult.accessToken);

        if (!isMounted) {
          return;
        }

        setAccessToken(refreshResult.accessToken);
        setUser(me);
        setStatus('authenticated');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiError) {
          clearSession();
          return;
        }

        clearSession();
      }
    }

    void bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      accessToken,
      isAuthenticated: status === 'authenticated' && !!user && !!accessToken,
      signup,
      login,
      logout,
      refreshSession,
    }),
    [status, user, accessToken, signup, login, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return value;
}