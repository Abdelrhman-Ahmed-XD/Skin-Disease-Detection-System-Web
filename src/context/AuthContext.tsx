import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, facebookProvider, db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

// Mirrors the real Firestore user document written by the mobile app
export interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUri: string;
  gender: string;
  skinColor: string;
  darkMode: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  birthDay?: number;
  birthMonth?: number;
  birthYear?: number;
  customizeSettings?: Record<string, any>;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isGuest: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const fetchProfile = async (currentUser: User): Promise<void> => {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        // Document already exists (created by mobile app) — just read it
        setUserProfile(userSnap.data() as UserProfile);
      } else {
        // Brand-new web-only account — create a document matching the real schema
        const nameParts = (currentUser.displayName || '').split(' ');
        const newProfile: UserProfile = {
          uid: currentUser.uid,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          email: currentUser.email || '',
          photoUri: currentUser.photoURL || '',
          gender: '',
          skinColor: '',
          darkMode: true,
          isEmailVerified: currentUser.emailVerified,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (auth.currentUser) await fetchProfile(auth.currentUser);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsGuest(false);
        await fetchProfile(currentUser);
      } else {
        setUserProfile(null);
        const guestFlag = localStorage.getItem('isGuest');
        if (guestFlag === 'true') setIsGuest(true);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Logged in with Google');
    } catch (error: any) {
      toast.error(error.message || 'Failed to login with Google');
    }
  };

  const loginWithFacebook = async () => {
    try {
      await signInWithPopup(auth, facebookProvider);
      toast.success('Logged in with Facebook');
    } catch (error: any) {
      toast.error(error.message || 'Failed to login with Facebook');
    }
  };

  const loginAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem('isGuest', 'true');
    toast.success('Logged in as Guest. 1 Scan allowed.');
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setIsGuest(false);
      setUserProfile(null);
      localStorage.removeItem('isGuest');
      toast.success('Logged out successfully');
    } catch {
      toast.error('Failed to log out');
    }
  };

  return (
      <AuthContext.Provider value={{ user, userProfile, loading, isGuest, loginWithGoogle, loginWithFacebook, loginAsGuest, logout, refreshProfile }}>
        {!loading && children}
      </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};