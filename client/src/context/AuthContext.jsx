import React, { createContext, useState, useContext, useEffect } from 'react';

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('userData');
    const storedRole = localStorage.getItem('userRole');
    if (storedUser && storedRole) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser({ ...parsed, role: storedRole });
      } catch (e) {
        localStorage.removeItem('userData');
        localStorage.removeItem('userRole');
      }
    }
    setLoading(false);

    const handleCreditUpdate = (e) => {
      if (e.detail && e.detail.newCredit !== undefined) {
        updateUserCredit(e.detail.newCredit);
      }
    };
    window.addEventListener('skillchain-credit-updated', handleCreditUpdate);
    return () => window.removeEventListener('skillchain-credit-updated', handleCreditUpdate);
  }, []);

  const updateUserCredit = (newCredit) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, credit: Number(newCredit) };
      localStorage.setItem('userData', JSON.stringify(updated));
      return updated;
    });
  };

  const login = (userData, role, token) => {
    setUser({ ...userData, role });
    localStorage.setItem('userData', JSON.stringify(userData));
    localStorage.setItem('userRole', role);
    localStorage.setItem('authToken', token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userData');
    localStorage.removeItem('userRole');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
  };

  const isAuthenticated = () => {
    return user !== null && localStorage.getItem('authToken') !== null;
  };

  const isAdmin = () => {
    return user?.role === 'admin' || localStorage.getItem('userRole') === 'admin';
  };

  const isParticipant = () => {
    return user?.role === 'participant' || localStorage.getItem('userRole') === 'participant';
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser: login,
      updateUserCredit,
      login,
      logout,
      loading,
      isAuthenticated,
      isAdmin,
      isParticipant
    }}>
      {children}
    </AuthContext.Provider>
  );
};
