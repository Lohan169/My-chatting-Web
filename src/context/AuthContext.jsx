import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { loginUser, registerUser, logoutUser } from '../firebase/authService';
import { subscribeToUserDoc } from '../firebase/userService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        unsubDoc = subscribeToUserDoc(
          user.uid,
          (profile) => {
            setUserProfile(profile);
            setLoading(false);
          },
          (err) => {
            console.warn('Error subscribing to user doc:', err);
            setLoading(false);
          }
        );
      } else {
        setUserProfile(null);
        unsubDoc();
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubDoc();
    };
  }, []);

  const login = (email, password) => loginUser(email, password);
  const register = (email, password, displayName) => registerUser(email, password, displayName);
  const logout = () => logoutUser();

  const value = {
    currentUser,
    userProfile,
    isAdmin: userProfile?.isAdmin === true,
    isBlocked: userProfile?.isBlocked === true,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
