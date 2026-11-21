'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { SplashScreen } from '@/components/SplashScreen';
import { auth, terjemahkanErrorFirebase } from '@/lib/firebase';
import { getPelangganProfile, type PelangganProfile } from '@/lib/pelanggan';

interface AuthContextValue {
  user: User | null;
  profile: PelangganProfile | null;
  authReady: boolean;
  profileLoading: boolean;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  logoutCustomer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  authReady: false,
  profileLoading: false,
  profileError: null,
  refreshProfile: async () => {},
  logoutCustomer: async () => {},
});

export function useCustomerAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PelangganProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [minDelayPassed, setMinDelayPassed] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfileForUser = useCallback(async (uid: string) => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const data = await getPelangganProfile(uid);
      setProfile(data);
    } catch (error) {
      setProfileError(terjemahkanErrorFirebase(error));
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMinDelayPassed(true);
    }, 1000);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);

      if (firebaseUser) {
        void loadProfileForUser(firebaseUser.uid);
      } else {
        setProfile(null);
        setProfileError(null);
        setProfileLoading(false);
      }
    });

    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [loadProfileForUser]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await loadProfileForUser(user.uid);
  }, [user, loadProfileForUser]);

  const logoutCustomer = useCallback(async () => {
    await signOut(auth);
    setProfile(null);
  }, []);

  const showSplash = !authReady || !minDelayPassed;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        authReady,
        profileLoading,
        profileError,
        refreshProfile,
        logoutCustomer,
      }}
    >
      <SplashScreen visible={showSplash} />
      {children}
    </AuthContext.Provider>
  );
}
