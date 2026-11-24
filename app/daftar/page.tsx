'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useCustomerAuth } from '@/components/AuthProvider';
import { CustomerHeader } from '@/components/CustomerHeader';
import { getWhatsAppValidationError, isValidEmail } from '@/lib/validation';

function sanitizeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/pegawai')) {
    return '/';
  }
  return raw;
}

function DaftarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = sanitizeNextPath(searchParams.get('next'));
  const { user, authReady, refreshProfile } = useCustomerAuth();

  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [nomorWhatsApp, setNomorWhatsApp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    nama?: string;
    email?: string;
    nomorWhatsApp?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  useEffect(() => {
    if (authReady && user && !isSubmitting) {
      router.replace(nextPath);
    }
  }, [authReady, user, isSubmitting, nextPath, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const errors: typeof fieldErrors = {};
    if (!nama.trim()) {
      errors.nama = 'Nama lengkap wajib diisi';
    }
    if (!email.trim()) {
      errors.email = 'Email wajib diisi';
    } else if (!isValidEmail(email)) {
      errors.email = 'Format email tidak valid';
    }
    const waError = getWhatsAppValidationError(nomorWhatsApp);
    if (waError) {
      errors.nomorWhatsApp = waError;
    }
    if (!password) {
      errors.password = 'Kata sandi wajib diisi';
    } else if (password.length < 6) {
      errors.password = 'Kata sandi minimal 6 karakter';
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Ulangi kata sandi wajib diisi';
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'Kata sandi tidak sama';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nama.trim(),
          email: email.trim(),
          nomorWhatsApp: nomorWhatsApp.trim(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error || 'Pendaftaran gagal, coba lagi');
        return;
      }

      const login = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (login?.error) {
        setFormError('Akun dibuat, tetapi gagal masuk otomatis. Silakan masuk manual.');
        return;
      }
      router.replace(nextPath);
    } catch {
      setFormError('Tidak dapat terhubung ke server. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const masukHref =
    nextPath !== '/'
      ? `/masuk?next=${encodeURIComponent(nextPath)}`
      : '/masuk';

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F6F5]">
      <CustomerHeader />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-6">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs sm:p-8">
          <h1 className="text-2xl font-bold text-stone-900">Daftar Akun</h1>
          <p className="mt-1 text-sm text-stone-600">
            Buat akun pelanggan Aci Rivi supaya lebih cepat saat memesan.
          </p>

          <form
            onSubmit={handleSubmit}
            suppressHydrationWarning
            className="mt-6 space-y-4"
          >
            <div>
              <label
                htmlFor="daftar-nama"
                className="block text-sm font-semibold text-stone-800"
              >
                Nama Lengkap <span className="text-red-600">*</span>
              </label>
              <input
                id="daftar-nama"
                type="text"
                autoComplete="name"
                value={nama}
                suppressHydrationWarning
                onChange={(e) => {
                  setNama(e.target.value);
                  if (fieldErrors.nama) {
                    setFieldErrors((p) => ({ ...p, nama: undefined }));
                  }
                }}
                placeholder="Contoh: Nadia Putri"
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
                htmlFor="daftar-email"
                className="block text-sm font-semibold text-stone-800"
              >
                Email <span className="text-red-600">*</span>
              </label>
              <input
                id="daftar-email"
                type="email"
                autoComplete="email"
                value={email}
                suppressHydrationWarning
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((p) => ({ ...p, email: undefined }));
                  }
                }}
                placeholder="nama@email.com"
                className={`mt-1.5 h-12 w-full rounded-xl border bg-white px-4 text-base text-stone-900 focus:outline-none ${
                  fieldErrors.email
                    ? 'border-red-500 ring-1 ring-red-500'
                    : 'border-stone-300 focus:border-red-500'
                }`}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs font-semibold text-red-600">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="daftar-wa"
                className="block text-sm font-semibold text-stone-800"
              >
                Nomor WhatsApp <span className="text-red-600">*</span>
              </label>
              <input
                id="daftar-wa"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={nomorWhatsApp}
                suppressHydrationWarning
                onChange={(e) => {
                  setNomorWhatsApp(e.target.value);
                  if (fieldErrors.nomorWhatsApp) {
                    setFieldErrors((p) => ({ ...p, nomorWhatsApp: undefined }));
                  }
                }}
                placeholder="081234567890"
                className={`mt-1.5 h-12 w-full rounded-xl border bg-white px-4 font-mono text-base text-stone-900 placeholder:font-sans focus:outline-none ${
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

            <div>
              <label
                htmlFor="daftar-password"
                className="block text-sm font-semibold text-stone-800"
              >
                Kata Sandi <span className="text-red-600">*</span>
              </label>
              <div className="relative mt-1.5">
                <input
                  id="daftar-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  suppressHydrationWarning
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((p) => ({ ...p, password: undefined }));
                    }
                  }}
                  placeholder="Minimal 6 karakter"
                  className={`h-12 w-full rounded-xl border bg-white pr-12 pl-4 text-base text-stone-900 focus:outline-none ${
                    fieldErrors.password
                      ? 'border-red-500 ring-1 ring-red-500'
                      : 'border-stone-300 focus:border-red-500'
                  }`}
                />
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword
                      ? 'Sembunyikan kata sandi'
                      : 'Lihat kata sandi'
                  }
                  className="absolute top-1/2 right-1.5 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs font-semibold text-red-600">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="daftar-confirm"
                className="block text-sm font-semibold text-stone-800"
              >
                Ulangi Kata Sandi <span className="text-red-600">*</span>
              </label>
              <div className="relative mt-1.5">
                <input
                  id="daftar-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  suppressHydrationWarning
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors((p) => ({
                        ...p,
                        confirmPassword: undefined,
                      }));
                    }
                  }}
                  placeholder="Ketik ulang kata sandi"
                  className={`h-12 w-full rounded-xl border bg-white pr-12 pl-4 text-base text-stone-900 focus:outline-none ${
                    fieldErrors.confirmPassword
                      ? 'border-red-500 ring-1 ring-red-500'
                      : 'border-stone-300 focus:border-red-500'
                  }`}
                />
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setShowConfirm((prev) => !prev)}
                  aria-label={
                    showConfirm
                      ? 'Sembunyikan ulangi kata sandi'
                      : 'Lihat ulangi kata sandi'
                  }
                  className="absolute top-1/2 right-1.5 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs font-semibold text-red-600">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700"
              >
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              suppressHydrationWarning
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 text-base font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && (
                <Loader2
                  className="h-4 w-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              )}
              <span>{isSubmitting ? 'Mendaftar...' : 'Daftar'}</span>
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-600">
            Sudah punya akun?{' '}
            <Link
              href={masukHref}
              className="font-bold text-red-600 hover:underline"
            >
              Masuk
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function DaftarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F6F5]" />}>
      <DaftarContent />
    </Suspense>
  );
}
