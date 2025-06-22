import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';

interface TwitterUser {
  id: string;
  name: string;
  username: string;
}

interface AuthContextType {
  user: TwitterUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (redirectUrl?: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TwitterUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const checkAuthStatus = async () => {
    try {
      const response = await api.get('/auth/status');
      if (response.data.authenticated) {
        await fetchUser();
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/user');
      setUser(response.data.data);
    } catch (error) {
      console.error('Fetch user failed:', error);
      setUser(null);
    }
  };

  const login = (redirectUrl: string = '/') => {
    const params = new URLSearchParams({ redirect_url: redirectUrl });
    // Redirect to backend OAuth endpoint
    const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3003';
    window.location.href = `${apiBaseUrl}/auth/start?${params.toString()}`;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const refreshUser = async () => {
    if (isAuthenticated) {
      await fetchUser();
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}