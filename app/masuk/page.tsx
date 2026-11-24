'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ArrowLeft, Eye, EyeOff, Info, Loader2 } from 'lucide-react';
import { useCustomerAuth } from '@/components/AuthProvider';
import { CustomerHeader } from '@/components/CustomerHeader';
import { isValidEmail } from '@/lib/validation';

function sanitizeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/pegawai')) {
    return '/';
  }
  return raw;
}

function MasukContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = sanitizeNextPath(searchParams.get('next'));
  const { user, authReady } = useCustomerAuth();

  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  useEffect(() => {
    if (authReady && user && !isSubmitting) {
      router.replace(nextPath);
    }
  }, [authReady, user, isSubmitting, nextPath, router]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const errors: typeof fieldErrors = {};
    if (!email.trim()) {
      errors.email = 'Email wajib diisi';
    } else if (!isValidEmail(email)) {
      errors.email = 'Format email tidak valid';
    }
    if (!password) {
      errors.password = 'Kata sandi wajib diisi';
    } else if (password.length < 6) {
      errors.password = 'Kata sandi minimal 6 karakter';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setFormError('');
    setIsSubmitting(true);

    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (result?.error) {
        setFormError('Email atau kata sandi salah.');
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch {
      setFormError('Tidak dapat terhubung ke server. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !isValidEmail(email)) {
      setFieldErrors({ email: 'Masukkan format email yang valid' });
      return;
    }
    setFieldErrors({});
    setFormError(
      'Fitur reset kata sandi otomatis belum tersedia. Silakan hubungi pegawai/admin Aci Rivi untuk bantuan reset akun.'
    );
  };

  const daftarHref =
    nextPath !== '/'
      ? `/daftar?next=${encodeURIComponent(nextPath)}`
      : '/daftar';

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F6F5]">
      <CustomerHeader />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-6">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs sm:p-8">
          {mode === 'login' ? (
            <>
              <h1 className="text-2xl font-bold text-stone-900">Masuk</h1>
              <p className="mt-1 text-sm text-stone-600">
                Masuk dengan akunmu untuk memesan seblak Aci Rivi.
              </p>

              <form
                onSubmit={handleLoginSubmit}
                suppressHydrationWarning
                className="mt-6 space-y-4"
              >
                <div>
                  <label
                    htmlFor="masuk-email"
                    className="block text-sm font-semibold text-stone-800"
                  >
                    Email
                  </label>
                  <input
                    id="masuk-email"
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
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="masuk-password"
                      className="block text-sm font-semibold text-stone-800"
                    >
                      Kata Sandi
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('reset');
                        setFormError('');
                        setFieldErrors({});
                      }}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Lupa kata sandi?
                    </button>
                  </div>

                  <div className="relative mt-1.5">
                    <input
                      id="masuk-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      suppressHydrationWarning
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) {
                          setFieldErrors((p) => ({
                            ...p,
                            password: undefined,
                          }));
                        }
                      }}
                      placeholder="Masukkan kata sandi"
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
                  <span>{isSubmitting ? 'Memeriksa...' : 'Masuk'}</span>
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-stone-600">
                Belum punya akun?{' '}
                <Link
                  href={daftarHref}
                  className="font-bold text-red-600 hover:underline"
                >
                  Daftar
                </Link>
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setFormError('');
                  setFieldErrors({});
                }}
                className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-red-600"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Kembali ke Masuk</span>
              </button>

              <h1 className="mt-3 text-2xl font-bold text-stone-900">
                Lupa Kata Sandi
              </h1>
              <p className="mt-1 text-sm text-stone-600">
                Masukkan email akunmu untuk menerima tautan reset kata sandi.
              </p>

              <form
                onSubmit={handleResetSubmit}
                suppressHydrationWarning
                className="mt-6 space-y-4"
              >
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p>
                    Reset kata sandi otomatis lewat email belum tersedia setelah migrasi akun. Hubungi pegawai/admin Aci Rivi untuk bantuan reset.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-sm font-semibold text-stone-800"
                  >
                    Email
                  </label>
                  <input
                    id="reset-email"
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
                  suppressHydrationWarning
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 text-base font-bold text-white transition-colors hover:bg-red-700"
                >
                  <span>Butuh Bantuan Reset</span>
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function MasukPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F6F5]" />}>
      <MasukContent />
    </Suspense>
  );
}
