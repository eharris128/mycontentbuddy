import axios from 'axios';

// Use environment variable or default to localhost
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3003';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// List API methods
export const listApi = {
  // Get user's owned lists
  getUserLists: async (userId?: string) => {
    const params = userId ? { userId } : {};
    const response = await api.get('/api/lists', { params });
    return response.data;
  },

  // Get lists the user is a member of
  getUserListMemberships: async (userId?: string) => {
    const params = userId ? { userId } : {};
    const response = await api.get('/api/lists/memberships', { params });
    return response.data;
  },

  // Get tweets from a specific list
  getListTweets: async (listId: string, limit?: number) => {
    const params = limit ? { limit } : {};
    const response = await api.get(`/api/lists/${listId}/tweets`, { params });
    return response.data;
  },

  // Get members of a specific list
  getListMembers: async (listId: string, limit?: number) => {
    const params = limit ? { limit } : {};
    const response = await api.get(`/api/lists/${listId}/members`, { params });
    return response.data;
  },

  // Cache management
  getCacheStatus: async () => {
    const response = await api.get('/auth/lists/cache/status');
    return response.data;
  },

  clearCache: async () => {
    const response = await api.post('/auth/lists/cache/clear');
    return response.data;
  },
};

export default api;