import { useState, useEffect, useCallback, useRef } from 'react';
import { api, setApiAccessToken } from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './auth-context';

const USER_STORAGE_KEY = 'bugsense_user';
const LEGACY_TOKEN_STORAGE_KEY = 'bugsense_token';
const AUTH_REFRESH_EXCLUDE = [
  '/users/login',
  '/users/register',
  '/users/refresh-token'
];
const REFRESH_RETRY_DELAYS_MS = [1500, 3000, 5000];
let refreshSessionRequest = null;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const decodeJwtPayload = (token) => {
  if (typeof token !== 'string' || token.trim() === '') {
    return null;
  }

  try {
    const [, payload] = token.split('.');

    if (!payload) {
      return null;
    }

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '='
    );
    const decoded =
      typeof window !== 'undefined' && typeof window.atob === 'function'
        ? window.atob(paddedPayload)
        : atob(paddedPayload);

    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const isTokenExpiringSoon = (token, bufferMs = 30_000) => {
  const payload = decodeJwtPayload(token);
  const expirySeconds = payload?.exp;

  if (!expirySeconds || typeof expirySeconds !== 'number') {
    return false;
  }

  return expirySeconds * 1000 <= Date.now() + bufferMs;
};

const readStoredUser = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const savedUser = window.localStorage.getItem(USER_STORAGE_KEY);
    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    return null;
  }
};

const persistUser = (user) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (user) {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    return;
  }

  window.localStorage.removeItem(USER_STORAGE_KEY);
};

const clearLegacyTokenStorage = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
};

const shouldRetryRefresh = (error) => {
  const statusCode = error?.response?.status;

  return (
    error?.code === 'ERR_NETWORK' ||
    statusCode === 429 ||
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504
  );
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [accessToken, setAccessToken] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const navigate = useNavigate();
  const initialUserRef = useRef(readStoredUser());
  const accessTokenRef = useRef(null);
  const userRef = useRef(readStoredUser());

  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const clearAuthState = useCallback((shouldRedirect = false) => {
    refreshSessionRequest = null;
    initialUserRef.current = null;
    userRef.current = null;
    accessTokenRef.current = null;
    setUser(null);
    setAccessToken(null);
    setApiAccessToken(null);
    persistUser(null);
    clearLegacyTokenStorage();

    if (shouldRedirect) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const refreshSession = useCallback(async () => {
    if (!refreshSessionRequest) {
      refreshSessionRequest = (async () => {
        let response;

        for (let attempt = 0; attempt <= REFRESH_RETRY_DELAYS_MS.length; attempt += 1) {
          try {
            response = await api.post('/users/refresh-token');
            break;
          } catch (refreshError) {
            if (attempt === REFRESH_RETRY_DELAYS_MS.length || !shouldRetryRefresh(refreshError)) {
              throw refreshError;
            }

            await wait(REFRESH_RETRY_DELAYS_MS[attempt]);
          }
        }

        const nextAccessToken = response?.data?.data?.accessToken;

        if (!nextAccessToken) {
          throw new Error('Unable to refresh the session.');
        }

        setApiAccessToken(nextAccessToken);
        accessTokenRef.current = nextAccessToken;
        return nextAccessToken;
      })().finally(() => {
        refreshSessionRequest = null;
      });
    }

    const nextAccessToken = await refreshSessionRequest;
    setAccessToken(nextAccessToken);
    return nextAccessToken;
  }, []);

  const logoutContext = useCallback(async () => {
    try {
      if (accessToken) {
        await api.post('/users/logout');
      }
    } catch (error) {
      console.warn('Server logout request failed, clearing local auth state.', error);
    } finally {
      clearAuthState(true);
    }
  }, [accessToken, clearAuthState]);

  useEffect(() => {
    const requestIntercept = api.interceptors.request.use(
      async (config) => {
        const requestUrl = config?.url || '';

        if (
          !config ||
          AUTH_REFRESH_EXCLUDE.some((path) => requestUrl.includes(path)) ||
          !accessTokenRef.current
        ) {
          return config;
        }

        let nextToken = accessTokenRef.current;

        if (isTokenExpiringSoon(nextToken)) {
          try {
            nextToken = await refreshSession();
          } catch (refreshError) {
            clearAuthState(true);
            return Promise.reject(refreshError);
          }
        }

        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${nextToken}`;
        return config;
      }
    );

    const responseIntercept = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        const requestUrl = originalRequest?.url || '';

        if (
          error.response?.status !== 401 ||
          !originalRequest ||
          originalRequest._retry ||
          AUTH_REFRESH_EXCLUDE.some((path) => requestUrl.includes(path)) ||
          (!accessTokenRef.current && !userRef.current)
        ) {
          return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
          const nextAccessToken = await refreshSession();
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          clearAuthState(true);
          return Promise.reject(refreshError);
        }
      }
    );

    return () => {
      api.interceptors.request.eject(requestIntercept);
      api.interceptors.response.eject(responseIntercept);
    };
  }, [clearAuthState, refreshSession]);

  useEffect(() => {
    clearLegacyTokenStorage();

    let isMounted = true;

    const restoreSession = async () => {
      if (!initialUserRef.current) {
        if (isMounted) {
          setIsAuthReady(true);
        }
        return;
      }

      try {
        await refreshSession();
      } catch {
        if (isMounted) {
          clearAuthState(false);
        }
      } finally {
        if (isMounted) {
          setIsAuthReady(true);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [clearAuthState, refreshSession]);

  const loginContext = useCallback((userData, token) => {
    initialUserRef.current = userData;
    userRef.current = userData;
    accessTokenRef.current = token;
    setApiAccessToken(token);
    setUser(userData);
    setAccessToken(token);
    persistUser(userData);
    clearLegacyTokenStorage();
    setIsAuthReady(true);
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, isAuthReady, loginContext, logoutContext }}>
      {children}
    </AuthContext.Provider>
  );
};
