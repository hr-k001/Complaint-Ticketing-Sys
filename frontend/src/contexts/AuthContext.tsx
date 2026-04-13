// contexts/AuthContext.tsx
import type { User } from '../services/api';
import { getCurrentUser, login as apiLogin, register as apiRegister } from '../services/api';
import React, { useState, useEffect } from 'react';
import { AuthContext } from './AuthContextValue';
import type { AuthContextType } from '../types/auth.types';
import { AxiosError } from 'axios'; // Import AxiosError type

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            loadUser();
        } else {
            setLoading(false);
        }
    }, []);

    const loadUser = async (): Promise<void> => {
        try {
            const response = await getCurrentUser();
            setUser(response.data);
        } catch (error) {
            console.error('Error loading user:', error);
            localStorage.removeItem('access_token');
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials: { username: string; password: string }) => {
        try {
            const response = await apiLogin(credentials);
            const { access_token } = response.data;
            localStorage.setItem('access_token', access_token);
            await loadUser();
            return response.data;
        } catch (error) {
            // Use unknown type instead of any
            if (error instanceof AxiosError) {
                console.error('Login error:', error.response?.data);
                throw new Error(error.response?.data?.detail || 'Login failed');
            }
            console.error('Login error:', error);
            throw error;
        }
    };

    const register = async (userData: { full_name: string; email: string; password: string; role: string }) => {
        await apiRegister(userData);
        await login({ username: userData.email, password: userData.password });
    };

    const logout = (): void => {
        localStorage.removeItem('access_token');
        setUser(null);
    };

    const value: AuthContextType = {
        user,
        loading,
        login,
        register,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};