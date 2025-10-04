import axios from 'axios';
import { LoginData, RegisterData, LoginResponse, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http:

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token } = response.data;
          localStorage.setItem('access_token', access_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export const authService = {
  async register(data: RegisterData): Promise<User> {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async login(data: LoginData): Promise<LoginResponse> {
    const response = await api.post('/auth/login', data);
    const { access_token, refresh_token } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    return response.data;
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  async getUsers(): Promise<User[]> {
    const response = await api.get('/auth/users');
    return response.data;
  },
};

export const documentService = {
  async uploadDocument(formData: FormData) {
    const response = await api.post('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async searchDocuments(params: any) {
    const response = await api.get('/documents/search', {
      params,
      paramsSerializer: {
        indexes: null 
      }
    });
    return response.data;
  },

  async getDocument(id: string) {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  },

  async getDocumentVersions(id: string) {
    const response = await api.get(`/documents/${id}/versions`);
    return response.data;
  },

  async uploadVersion(id: string, formData: FormData) {
    const response = await api.post(`/documents/${id}/versions`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async downloadDocument(id: string, version?: number) {
    const params = version ? { version } : {};
    const response = await api.get(`/documents/${id}/download`, {
      params,
      responseType: 'blob',
    });
    return response;
  },

  async deleteDocument(id: string) {
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  },

  async getAvailableTags() {
    const response = await api.get('/documents/filters/tags');
    return response.data;
  },

  async getAvailableUploaders() {
    const response = await api.get('/documents/filters/uploaders');
    return response.data;
  },
};

export default api;
