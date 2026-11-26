'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Loader2, LogOut, UserRound } from 'lucide-react';
import { useCustomerAuth } from '@/components/AuthProvider';
import { CustomerHeader } from '@/components/CustomerHeader';
import { ErrorRetryCard, ProfileSkeleton } from '@/components/Skeletons';
import { updatePelangganProfile } from '@/lib/pelanggan';
import { getWhatsAppValidationError } from '@/lib/validation';

export default function AkunSayaPage() {
  const router = useRouter();
  const {
    user,
    profile,
    authReady,
    profileLoading,
    profileError,
    refreshProfile,
    logoutCustomer,
  } = useCustomerAuth();

  const [namaDraft, setNamaDraft] = useState<string | null>(null);
  const [waDraft, setWaDraft] = useState<string | null>(null);
  const nama = namaDraft ?? (profile?.nama || user?.displayName || '');
  const nomorWhatsApp = waDraft ?? (profile?.nomorWhatsApp || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    nama?: string;
    nomorWhatsApp?: string;
  }>({});

  useEffect(() => {
    if (authReady && !user) {
      router.replace('/masuk?next=/akun');
    }
  }, [authReady, user, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSaving) return;

    const errors: typeof fieldErrors = {};
    if (!nama.trim()) {
      errors.nama = 'Nama lengkap wajib diisi';
    }
    const waError = getWhatsAppValidationError(nomorWhatsApp);
    if (waError) {
      errors.nomorWhatsApp = waError;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSaveError('');
    setSavedNotice(false);
    setIsSaving(true);

    try {
      await updatePelangganProfile({
        nama: nama.trim(),
        nomorWhatsApp: nomorWhatsApp.trim(),
      });
      await refreshProfile();
      setSavedNotice(true);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Gagal menyimpan perubahan'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logoutCustomer();
    router.replace('/');
  };

  return (
    <div className="min-h-screen bg-[#F7F6F5]">
      <CustomerHeader />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:py-10 lg:pb-10">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-stone-700 hover:text-red-600"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Beranda</span>
          </Link>
        </div>

        {!authReady || !user || profileLoading ? (
          <ProfileSkeleton />
        ) : profileError ? (
          <ErrorRetryCard message="Gagal memuat" onRetry={refreshProfile} />
        ) : (
          <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start lg:gap-8 lg:space-y-0">
            <section className="hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-xs lg:col-start-1 lg:row-start-1 lg:block">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-red-600">
                <UserRound className="h-7 w-7" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-xl font-bold text-stone-900">
                {profile?.nama || user.displayName || 'Akun Aci Rivi'}
              </h2>
              <p className="mt-1 break-all text-sm text-stone-600">{user.email}</p>
              {profile?.nomorWhatsApp && (
                <p className="mt-3 text-sm font-medium text-stone-700">
                  {profile.nomorWhatsApp}
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs lg:col-start-2 lg:row-start-1 lg:p-7">
              <h1 className="text-2xl font-bold text-stone-900">Akun Saya</h1>
              <p className="mt-1 text-sm text-stone-600">
                Perbarui nama dan nomor WhatsApp untuk pemesanan berikutnya.
              </p>

              <form onSubmit={handleSave} className="mt-5 space-y-4">
                <div>
                <label
                  htmlFor="akun-email"
                  className="block text-sm font-semibold text-stone-800"
                >
                  Email
                </label>
                <input
                  id="akun-email"
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="mt-1.5 h-12 w-full rounded-xl border border-stone-200 bg-stone-100 px-4 text-base text-stone-500"
                />
                </div>

                <div>
                <label
                  htmlFor="akun-nama"
                  className="block text-sm font-semibold text-stone-800"
                >
                  Nama Lengkap <span className="text-red-600">*</span>
                </label>
                <input
                  id="akun-nama"
                  type="text"
                  value={nama}
                  onChange={(e) => {
                    setNamaDraft(e.target.value);
                    setSavedNotice(false);
                    if (fieldErrors.nama) {
                      setFieldErrors((p) => ({ ...p, nama: undefined }));
                    }
                  }}
                  className={`mt-1.5 h-12 w-full rounded-xl border bg-white px-4 text-base text-stone-900 focus:outline-none ${
                    fieldErrors.nama
                      ? 'border-red-500 ring-1 ring-red-500'
                      : 'border-stone-300 focus:border-red-500'
                  }`}
                />
                {fieldErrors.nama && (
                  <p className="mt-1 text-xs font-semibold text-red-600">
                    {fieldErrors.nama}
                  </p>
                )}
                </div>

                <div>
                <label
                  htmlFor="akun-wa"
                  className="block text-sm font-semibold text-stone-800"
                >
                  Nomor WhatsApp <span className="text-red-600">*</span>
                </label>
                <input
                  id="akun-wa"
                  type="tel"
                  inputMode="numeric"
                  value={nomorWhatsApp}
                  onChange={(e) => {
                    setWaDraft(e.target.value);
                    setSavedNotice(false);
                    if (fieldErrors.nomorWhatsApp) {
                      setFieldErrors((p) => ({
                        ...p,
                        nomorWhatsApp: undefined,
                      }));
                    }
                  }}
                  placeholder="081234567890"
                  className={`mt-1.5 h-12 w-full rounded-xl border bg-white px-4 font-mono text-base text-stone-900 focus:outline-none ${
                    fieldErrors.nomorWhatsApp
                      ? 'border-red-500 ring-1 ring-red-500'
                      : 'border-stone-300 focus:border-red-500'
                  }`}
                />
                {fieldErrors.nomorWhatsApp && (
                  <p className="mt-1 text-xs font-semibold text-red-600">
                    {fieldErrors.nomorWhatsApp}
                  </p>
                )}
                </div>

                {saveError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700"
                  >
                    {saveError}
                  </div>
                )}

                {savedNotice && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-800">
                    <CheckCircle2
                      className="h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span>Profil berhasil diperbarui</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 text-base font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving && (
                    <Loader2
                      className="h-4 w-4 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  )}
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-xs lg:col-start-1 lg:row-start-2">
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-6 text-sm font-bold text-red-700 transition-colors hover:bg-red-100"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Keluar</span>
              </button>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
