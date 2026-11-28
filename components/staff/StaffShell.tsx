'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Lock, LogOut } from 'lucide-react';
import { SplashScreen } from '@/components/SplashScreen';
import { StaffChatWidget } from '@/components/staff/StaffChatWidget';
import { StaffNotifier, StaffSoundToggle } from '@/components/staff/StaffNotifier';

interface StaffAuthContextValue {
  authenticated: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const StaffAuthContext = createContext<StaffAuthContextValue>({
  authenticated: false,
  loading: true,
  logout: async () => {},
  refreshAuth: async () => {},
});

export function useStaffAuth() {
  return useContext(StaffAuthContext);
}

const ROUTE_TITLES: Record<string, string> = {
  '/pegawai': 'Beranda Pegawai',
  '/pegawai/pesanan': 'Pesanan Masuk',
  '/pegawai/pembayaran': 'Cek Pembayaran',
  '/pegawai/laporan': 'Riwayat dan Laporan',
  '/pegawai/stok': 'Kelola Stok dan Harga',
  '/pegawai/kasir': 'Catat Pesanan Langsung',
  '/pegawai/pengaturan': 'Pengaturan QRIS Toko',
};

export function StaffShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showStaffSplash, setShowStaffSplash] = useState(false);

  // State form login PIN
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/pegawai/auth', {
        method: 'GET',
        cache: 'no-store',
      });
      const data = (await res.json()) as { authenticated?: boolean };
      setAuthenticated(Boolean(data.authenticated));
    } catch {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/pegawai/auth', { method: 'GET', cache: 'no-store' })
      .then((res) => res.json() as Promise<{ authenticated?: boolean }>)
      .then((data) => {
        if (active) setAuthenticated(Boolean(data.authenticated));
      })
      .catch(() => {
        if (active) setAuthenticated(false);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Redirect akses langsung ke /pegawai/... tanpa login ke halaman PIN /pegawai
  useEffect(() => {
    if (!loading && !authenticated && pathname !== '/pegawai') {
      router.replace('/pegawai');
    }
  }, [loading, authenticated, pathname, router]);

  useEffect(() => {
    if (!showStaffSplash) return;
    const timer = window.setTimeout(() => {
      setShowStaffSplash(false);
    }, 750);
    return () => window.clearTimeout(timer);
  }, [showStaffSplash]);

  const submitPin = async (candidate: string) => {
    if (!candidate.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setPinError('');

    try {
      const res = await fetch('/api/pegawai/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ pin: candidate }),
      });
      const data = (await res.json()) as {
        authenticated?: boolean;
        error?: string;
      };
      if (res.ok && data.authenticated) {
        setPinInput('');
        setPinError('');
        setShowStaffSplash(true);
        setAuthenticated(true);
      } else {
        setPinError(data.error || 'PIN salah. Coba lagi.');
      }
    } catch {
      setPinError('Gagal memeriksa PIN. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitPin(pinInput);
  };

  const handleDigitPress = (digit: string) => {
    if (pinInput.length >= 8 || isSubmitting) return;
    setPinInput((prev) => prev + digit);
    if (pinError) setPinError('');
  };

  const logout = useCallback(async () => {
    try {
      await fetch('/api/pegawai/auth', {
        method: 'DELETE',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
    } finally {
      setAuthenticated(false);
      setPinInput('');
      setPinError('');
      router.replace('/pegawai');
    }
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F6F5] p-6">
        <p className="text-sm text-stone-500">Memeriksa akses pegawai...</p>
      </div>
    );
  }

  if (!authenticated) {
    // Jika mengakses sub-route tanpa login, tampilkan pesan singkat selagi diarahkan ke /pegawai
    if (pathname !== '/pegawai') {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F7F6F5] p-6">
          <p className="text-sm text-stone-500">Mengarahkan ke halaman masuk...</p>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col bg-[#F7F6F5]">
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
            <span className="inline-flex items-center gap-2 text-base font-bold text-red-600">
              <Image src="/icons/icon-192.png" alt="" width={28} height={28} priority className="rounded-lg" />
              Aci Rivi · Pegawai
            </span>
            <span className="text-xs font-medium text-stone-500">
              Area Khusus Pegawai
            </span>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-8">
          <div className="w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-6 shadow-xs sm:p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-red-600">
              <Lock className="h-6 w-6" aria-hidden="true" />
            </div>

            <h1 className="mt-4 text-center text-2xl font-bold text-stone-900">
              Masuk Pegawai
            </h1>
            <p className="mt-1 text-center text-sm text-stone-600">
              Masukkan PIN pegawai untuk membuka area kerja.
            </p>

            <form onSubmit={handleFormSubmit} className="mt-6 space-y-4">
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value.replace(/\D/g, ''));
                  if (pinError) setPinError('');
                }}
                placeholder="••••"
                aria-label="PIN Pegawai"
                className="h-14 w-full rounded-2xl border border-stone-300 bg-stone-50 text-center font-mono text-2xl font-bold tracking-[0.4em] text-stone-900 focus:border-red-500 focus:bg-white focus:outline-none"
              />

              {pinError && (
                <p
                  role="alert"
                  className="text-center text-sm font-semibold text-red-600"
                >
                  {pinError}
                </p>
              )}

              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleDigitPress(digit)}
                    className="flex h-13 items-center justify-center rounded-xl border border-stone-200 bg-white font-mono text-xl font-bold text-stone-900 transition-colors hover:bg-stone-50 active:bg-orange-50"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setPinInput('');
                    setPinError('');
                  }}
                  className="flex h-13 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  Hapus
                </button>
                <button
                  type="button"
                  onClick={() => handleDigitPress('0')}
                  className="flex h-13 items-center justify-center rounded-xl border border-stone-200 bg-white font-mono text-xl font-bold text-stone-900 transition-colors hover:bg-stone-50 active:bg-orange-50"
                >
                  0
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !pinInput}
                  className="flex h-13 items-center justify-center rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Loader2
                      className="h-5 w-5 animate-spin motion-reduce:animate-none"
                      aria-label="Memeriksa PIN"
                    />
                  ) : (
                    'Masuk'
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    );
  }

  const isRootStaff = pathname === '/pegawai';
  const pageTitle = ROUTE_TITLES[pathname] || 'Area Pegawai';

  return (
    <StaffAuthContext.Provider
      value={{ authenticated, loading, logout, refreshAuth }}
    >
      <SplashScreen
        visible={showStaffSplash}
        subtitle="Menyiapkan area pegawai..."
      />
      <div className="min-h-screen bg-[#F7F6F5]">
        <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
            {isRootStaff ? (
              <span className="inline-flex items-center gap-2 text-base font-bold text-red-600 whitespace-nowrap">
                <Image src="/icons/icon-192.png" alt="" width={28} height={28} priority className="rounded-lg" />
                Aci Rivi · Pegawai
              </span>
            ) : (
              <Link
                href="/pegawai"
                className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-stone-700 hover:text-red-600 whitespace-nowrap"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Menu Pegawai</span>
              </Link>
            )}

            <h1 className="truncate text-base font-bold text-stone-900">
              {pageTitle}
            </h1>

            <button
              type="button"
              onClick={logout}
              className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-red-600 whitespace-nowrap"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
      </div>
      <StaffChatWidget />
    </StaffAuthContext.Provider>
  );
}
