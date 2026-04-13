import { User, LoginResponse } from '../services/api';

export type AuthContextType = {
    user: User | null;
    loading: boolean;
    login: (credentials: { username: string; password: string }) => Promise<LoginResponse>;
    register: (userData: { full_name: string; email: string; password: string; role: string }) => Promise<void>;
    logout: () => void;
};