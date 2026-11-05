import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Enable cross-site credentials for session cookies
axios.defaults.withCredentials = true;

// Setup interceptor to attach Bearer token to all outgoing requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('plagialens_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check URL parameters for OAuth token on page load/redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('plagialens_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Clean query parameter from browser address bar
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } else {
      const storedToken = localStorage.getItem('plagialens_token');
      if (storedToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
    }
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`);
      if (response.data.authenticated) {
        setUser(response.data.user);
      } else {
        setUser(null);
        localStorage.removeItem('plagialens_token');
        delete axios.defaults.headers.common['Authorization'];
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/google`);
      if (response.data.auth_url) {
        window.location.href = response.data.auth_url;
      } else {
        window.location.href = `${API_URL}/api/auth/google`;
      }
    } catch (error) {
      console.warn("Direct JSON auth URL fetch failed; redirecting to Google auth endpoint:", error);
      window.location.href = `${API_URL}/api/auth/google`;
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      localStorage.removeItem('plagialens_token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      window.location.href = '/login';
    }
  };

  const deleteAccount = async () => {
    try {
      await axios.delete(`${API_URL}/api/auth/delete-account`);
      localStorage.removeItem('plagialens_token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      window.location.href = '/login';
    } catch (error) {
      console.error("Account deletion failed:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, deleteAccount, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
