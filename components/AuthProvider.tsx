'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { SplashScreen } from '@/components/SplashScreen';
import { getPelangganProfile, type PelangganProfile } from '@/lib/pelanggan';

export interface CustomerUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextValue {
  user: CustomerUser | null;
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

function AuthState({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<PelangganProfile | null>(null);
  const [minDelayPassed, setMinDelayPassed] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const uid = session?.user?.id ?? null;
  const authReady = status !== 'loading';

  const user = useMemo<CustomerUser | null>(() => {
    if (!uid) return null;
    return {
      uid,
      email: session?.user?.email ?? null,
      displayName: profile?.nama || session?.user?.name || null,
    };
  }, [uid, session, profile]);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      setProfile(await getPelangganProfile());
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : 'Gagal memuat profil'
      );
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setMinDelayPassed(true), 1000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      if (uid) {
        await loadProfile();
      } else {
        if (cancelled) return;
        setProfile(null);
        setProfileError(null);
        setProfileLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authReady, uid, loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!uid) return;
    await loadProfile();
  }, [uid, loadProfile]);

  const logoutCustomer = useCallback(async () => {
    await signOut({ redirect: false });
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthState>{children}</AuthState>
    </SessionProvider>
  );
}