import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, ApiClientError } from '../api/client';
import type { User, UserLoginPayload, UserRegisterPayload } from '../api/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: UserLoginPayload) => Promise<User>;
  register: (payload: UserRegisterPayload) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem('access_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    api.setToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const currentToken = api.getToken();
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const profile = await api.auth.getMe();
      setUser(profile);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    // Register automatic session expiration callback on API client
    api.onUnauthorized(() => {
      logout();
    });

    // Check for existing valid session on startup
    if (token) {
      api.setToken(token);
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, [token, refreshUser, logout]);

  const login = async (payload: UserLoginPayload): Promise<User> => {
    setIsLoading(true);
    try {
      const tokenRes = await api.auth.login(payload);
      api.setToken(tokenRes.access_token);
      setTokenState(tokenRes.access_token);

      // Fetch user profile immediately after receiving access token
      const profile = await api.auth.getMe();
      setUser(profile);
      return profile;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: UserRegisterPayload): Promise<User> => {
    setIsLoading(true);
    try {
      const newUser = await api.auth.register(payload);
      return newUser;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

