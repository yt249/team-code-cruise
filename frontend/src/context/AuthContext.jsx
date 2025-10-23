import { createContext, useContext, useState, useEffect } from 'react';
import { authService, isAuthenticated, clearAuthToken } from '../services/authService';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auto-login on app load if token exists
  useEffect(() => {
    const initAuth = async () => {
      if (isAuthenticated()) {
        try {
          const profile = await authService.getProfile();
          setUser(profile);
          setIsLoggedIn(true);
        } catch (err) {
          console.error('Auto-login failed:', err);
          clearAuthToken();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      await authService.login(email, password);
      const profile = await authService.getProfile();
      setUser(profile);
      setIsLoggedIn(true);
      return profile;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsLoggedIn(false);
  };

  const value = {
    user,
    isLoggedIn,
    loading,
    error,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
