import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    roles: string[];
  };
}

export interface User {
  id: string;
  username: string;
  roles: string[];
}

export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async getCurrentUser(): Promise<User> {
    // For now, decode user from token or return mock data
    // In a real implementation, this would call an API endpoint
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    // Mock user data - in real implementation, decode JWT or call API
    return {
      id: 'mock-user-id',
      username: 'developer',
      roles: ['developer'],
    };
  },
};

export { api };

