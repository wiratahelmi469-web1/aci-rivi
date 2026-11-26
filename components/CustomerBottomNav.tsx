'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  ReceiptText,
  User,
  UtensilsCrossed,
} from 'lucide-react';
import { CustomerChatWidget } from '@/components/CustomerChatWidget';
import { useCustomerAuth } from '@/components/AuthProvider';

const SHOW_ON = ['/', '/akun', '/pesanan'];

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
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="relative grid min-h-[76px] grid-cols-5 items-center px-2 pt-2 pb-1">
        <Link
          href="/"
          className={tab(pathname === '/')}
          aria-current={pathname === '/' ? 'page' : undefined}
        >
          <Home className="h-5 w-5" aria-hidden="true" />
          <span>Beranda</span>
        </Link>

        <Link
          href="/pesanan"
          className={tab(pathname === '/pesanan')}
          aria-current={pathname === '/pesanan' ? 'page' : undefined}
        >
          <ReceiptText className="h-5 w-5" aria-hidden="true" />
          <span>Pesanan</span>
        </Link>

        <span aria-hidden="true" />

        <CustomerChatWidget />

        <Link
          href={user ? '/akun' : '/masuk?next=/akun'}
          className={tab(pathname === '/akun')}
          aria-current={pathname === '/akun' ? 'page' : undefined}
        >
          <User className="h-5 w-5" aria-hidden="true" />
          <span>{user ? 'Akun' : 'Masuk'}</span>
        </Link>

        <Link
          href={user ? '/pesan' : '/masuk?next=/pesan'}
          className="absolute top-0 left-1/2 flex -translate-x-1/2 -translate-y-1/3 flex-col items-center gap-0.5"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-md active:bg-red-700">
            <UtensilsCrossed className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-xs font-bold text-red-600">Pesan</span>
        </Link>
      </div>
    </nav>
  );
}