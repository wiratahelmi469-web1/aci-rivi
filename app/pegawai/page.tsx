'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ClipboardList,
  FileBarChart2,
  Lock,
  LogOut,
  PackageCheck,
  PlusCircle,
} from 'lucide-react';
import { CatatLangsungView } from '@/components/staff/CatatLangsungView';
import { KelolaStokView } from '@/components/staff/KelolaStokView';
import { LaporanView } from '@/components/staff/LaporanView';
import { PesananMasukView } from '@/components/staff/PesananMasukView';
import { PIN_PEGAWAI } from '@/lib/constants';
import { getStaffOrders, subscribeDataChanges } from '@/lib/storage';

type StaffMenu = 'menu' | 'pesanan' | 'laporan' | 'stok' | 'catat';

const SESSION_KEY = 'aci_rivi_staff_auth';
const AUTH_EVENT = 'aci-rivi-staff-auth-changed';

const subscribeAuth = (callback: () => void) => {
  window.addEventListener(AUTH_EVENT, callback);
  return () => window.removeEventListener(AUTH_EVENT, callback);
};

const getAuthSnapshot = () => window.sessionStorage.getItem(SESSION_KEY) === '1';
const getAuthServerSnapshot = () => false;

const MENU_TITLES: Record<StaffMenu, string> = {
  menu: 'Beranda Pegawai',
  pesanan: 'Pesanan Masuk',
  laporan: 'Riwayat dan Laporan',
  stok: 'Kelola Stok dan Harga',
  catat: 'Catat Pesanan Langsung',
};

export default function PegawaiPage() {
  const isAuthenticated = useSyncExternalStore(
    subscribeAuth,
    getAuthSnapshot,
    getAuthServerSnapshot
  );
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeMenu, setActiveMenu] = useState<StaffMenu>('menu');
  const [activeOrderCount, setActiveOrderCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    const syncCount = () => {
      const orders = getStaffOrders();
      setActiveOrderCount(
        orders.filter((o) => o.statusPesanan !== 'Selesai').length
      );
    };
    syncCount();
    const unsub = subscribeDataChanges(syncCount);
    const interval = window.setInterval(syncCount, 3000);
    return () => {
      unsub();
      window.clearInterval(interval);
    };
  }, [isAuthenticated]);

  const submitPin = (candidate: string) => {
    if (candidate === PIN_PEGAWAI) {
      setPinError('');
      setPinInput('');
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(SESSION_KEY, '1');
        window.dispatchEvent(new Event(AUTH_EVENT));
      }
    } else {
      setPinError('PIN salah. Coba lagi.');
    }
  };

  const handleFormPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitPin(pinInput);
  };

  const handleDigitPress = (digit: string) => {
    if (pinInput.length >= 6) return;
    const next = pinInput + digit;
    setPinInput(next);
    setPinError('');
    if (next.length === PIN_PEGAWAI.length && next === PIN_PEGAWAI) {
      submitPin(next);
    }
  };

  const handleLogout = () => {
    setActiveMenu('menu');
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(SESSION_KEY);
      window.dispatchEvent(new Event(AUTH_EVENT));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F7F6F5]">
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-stone-700 hover:text-red-600"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Beranda</span>
            </Link>
            <span className="text-base font-bold text-red-600">Aci Rivi</span>
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
              Masukkan PIN pegawai untuk membuka dapur &amp; kasir.
            </p>

            <form onSubmit={handleFormPinSubmit} className="mt-6 space-y-4">
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
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

              {/* Keypad sentuh besar */}
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
                  className="flex h-13 items-center justify-center rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700"
                >
                  Masuk
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F5]">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          {activeMenu === 'menu' ? (
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-stone-700 hover:text-red-600"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Beranda</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setActiveMenu('menu')}
              className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-stone-700 hover:text-red-600"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Menu Pegawai</span>
            </button>
          )}

          <h1 className="truncate text-base font-bold text-stone-900">
            {MENU_TITLES[activeMenu]}
          </h1>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {activeMenu === 'menu' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-stone-900">
                Portal Pegawai Aci Rivi
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                Pilih menu yang ingin dikerjakan.
              </p>
            </div>

            {/* 4 Menu Besar Pegawai */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setActiveMenu('pesanan')}
                className="flex min-h-[144px] flex-col justify-between rounded-3xl bg-gradient-to-br from-red-600 to-orange-600 p-6 text-left text-white shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                    <ClipboardList className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <span className="font-mono text-sm font-bold text-orange-50 tabular-nums">
                    {activeOrderCount} aktif
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-xl font-bold">Pesanan Masuk</h3>
                  <p className="mt-1 text-sm text-orange-50">
                    Lihat pesanan yang sudah dibayar dan ubah status masak.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveMenu('laporan')}
                className="flex min-h-[144px] flex-col justify-between rounded-3xl border border-stone-200 bg-white p-6 text-left text-stone-900 transition-colors hover:border-orange-300 active:scale-[0.99]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-red-600">
                  <FileBarChart2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="mt-4">
                  <h3 className="text-xl font-bold">Riwayat dan Laporan</h3>
                  <p className="mt-1 text-sm text-stone-600">
                    Ringkasan harian, mingguan, bulanan, dan unduh PDF.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveMenu('stok')}
                className="flex min-h-[144px] flex-col justify-between rounded-3xl border border-stone-200 bg-white p-6 text-left text-stone-900 transition-colors hover:border-orange-300 active:scale-[0.99]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-red-600">
                  <PackageCheck className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="mt-4">
                  <h3 className="text-xl font-bold">Kelola Stok dan Harga</h3>
                  <p className="mt-1 text-sm text-stone-600">
                    Atur stok porsi, ubah harga, tambah, atau hapus topping.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveMenu('catat')}
                className="flex min-h-[144px] flex-col justify-between rounded-3xl border border-stone-200 bg-white p-6 text-left text-stone-900 transition-colors hover:border-orange-300 active:scale-[0.99]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-red-600">
                  <PlusCircle className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="mt-4">
                  <h3 className="text-xl font-bold">Catat Pesanan Langsung</h3>
                  <p className="mt-1 text-sm text-stone-600">
                    Input pesanan pelanggan prasmanan yang bayar di kasir.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {activeMenu === 'pesanan' && <PesananMasukView />}
        {activeMenu === 'laporan' && <LaporanView />}
        {activeMenu === 'stok' && <KelolaStokView />}
        {activeMenu === 'catat' && (
          <CatatLangsungView
            onBatal={() => setActiveMenu('menu')}
            onLihatPesananMasuk={() => setActiveMenu('pesanan')}
          />
        )}
      </main>
    </div>
  );
}
