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
  forceRefreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TwitterUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const checkAuthStatus = async () => {
    try {
      // Check for sync token in URL first
      const urlParams = new URLSearchParams(window.location.search);
      const syncToken = urlParams.get('sync');
      
      if (syncToken) {
        console.log('Found sync token, syncing session...');
        try {
          await api.post('/auth/sync', { syncToken });
          console.log('Session synced successfully');
          // Remove sync token from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (syncError) {
          console.error('Session sync failed:', syncError);
        }
      }

      console.log('Checking authentication status...');
      const response = await api.get('/auth/status');
      console.log('Auth status response:', response.data);
      
      if (response.data.authenticated) {
        console.log('User is authenticated, fetching user data...');
        await fetchUser();
      } else {
        console.log('User is not authenticated');
        setUser(null);
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/user');
      console.log('User auth response:', response.data);
      
      // The new /auth/user endpoint just returns auth status, not user data
      // Set a placeholder user object to indicate authentication
      if (response.data.authenticated) {
        setUser({ id: 'authenticated', name: 'Authenticated User', username: 'user' });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Fetch user failed:', error);
      setUser(null);
    }
  };

  const login = (redirectUrl: string = '/') => {
    const params = new URLSearchParams({ redirect_url: redirectUrl });
    // Use tunnel URL for OAuth to maintain session consistency
    const oauthBaseUrl = process.env.REACT_APP_OAUTH_URL || window.location.origin;
    window.location.href = `${oauthBaseUrl}/auth/start?${params.toString()}`;
  };

  const logout = async () => {
    try {
      console.log('Logging out...');
      await api.post('/auth/logout');
      setUser(null);
      console.log('Logout successful, redirecting...');
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout API fails, clear local state
      setUser(null);
      window.location.href = '/';
    }
  };

  const forceRefreshAuth = () => {
    console.log('Manually refreshing authentication status...');
    setIsLoading(true);
    checkAuthStatus();
  };

  const refreshUser = async () => {
    if (isAuthenticated) {
      await fetchUser();
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Re-check auth status when the page becomes visible (useful after OAuth redirects)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page became visible, re-checking auth status...');
        checkAuthStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
    forceRefreshAuth,
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