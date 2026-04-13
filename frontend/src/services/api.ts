import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export type User = {
    id: string;
    full_name: string;
    email: string;
    role: string;
    agent_number?: string;
};

export type LoginResponse = {
    access_token: string;
    token_type: string;
};

export const getCurrentUser = () => api.get<User>('/auth/me');
export const login = (credentials: { username: string; password: string }) => 
    api.post<LoginResponse>('/auth/token', credentials);
export const register = (userData: { full_name: string; email: string; password: string; role: string }) => 
    api.post('/auth/register', userData);

export default api;