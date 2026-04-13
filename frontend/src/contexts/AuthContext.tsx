import React, { useState, useEffect } from 'react';
import { getCurrentUser, login as apiLogin, register as apiRegister, User } from '../services/api';
import { AuthContext } from './AuthContextValue';

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
        const response = await apiLogin(credentials);
        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);
        await loadUser();
        return response.data;
    };

    const register = async (userData: { full_name: string; email: string; password: string; role: string }) => {
        await apiRegister(userData);
    };

    const logout = (): void => {
        localStorage.removeItem('access_token');
        setUser(null);
    };

    const value = {
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