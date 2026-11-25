'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, UtensilsCrossed } from 'lucide-react';
import { useCustomerAuth } from '@/components/AuthProvider';

const SHOW_ON = ['/', '/akun'];

export function CustomerBottomNav() {
  const pathname = usePathname();
  const { user } = useCustomerAuth();

  if (!SHOW_ON.includes(pathname)) return null;

  const tab = (active: boolean) =>
    `flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-semibold transition-colors ${
      active ? 'text-red-600' : 'text-stone-500 active:bg-stone-100'
    }`;

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
    >
      <div className="grid grid-cols-3 items-center gap-2 px-3 pt-2 pb-2">
        <Link href="/" className={tab(pathname === '/')} aria-current={pathname === '/' ? 'page' : undefined}>
          <Home className="h-5 w-5" aria-hidden="true" />
          <span>Beranda</span>
        </Link>

        <Link
          href={user ? '/pesan' : '/masuk?next=/pesan'}
          className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-2xl bg-red-600 text-xs font-bold text-white active:bg-red-700"
        >
          <UtensilsCrossed className="h-5 w-5" aria-hidden="true" />
          <span>Pesan</span>
        </Link>

        <Link
          href={user ? '/akun' : '/masuk?next=/akun'}
          className={tab(pathname === '/akun')}
          aria-current={pathname === '/akun' ? 'page' : undefined}
        >
          <User className="h-5 w-5" aria-hidden="true" />
          <span>{user ? 'Akun' : 'Masuk'}</span>
        </Link>
      </div>
    </nav>
  );
}