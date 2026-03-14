import React, { useState, useEffect } from 'react';
import { AuthContext } from './authContextDefinition';

const API_BASE_URL = 'http://localhost:5000/api'; // Defined API_BASE_URL as it was used in the provider value

export const AuthProvider = ({ children }) => {
    // Account system removed. Providing dummy user for parts of the app that still expect it.
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = () => {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (email, password) => {
        // Simplified mock logic
        if (email.includes('admin')) {
            const adminUser = { role: 'admin', name: 'Admin User', email };
            setUser(adminUser);
            localStorage.setItem('user', JSON.stringify(adminUser));
            return { success: true, user: adminUser };
        }
        const guestUser = { role: 'user', name: 'App User', email };
        setUser(guestUser);
        localStorage.setItem('user', JSON.stringify(guestUser));
        return { success: true, user: guestUser };
    };

    const register = async (name, email, password) => {
        const newUser = { role: 'user', name, email };
        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
        return { success: true, user: newUser };
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, apiBase: API_BASE_URL }}>
            {children}
        </AuthContext.Provider>
    );
};
