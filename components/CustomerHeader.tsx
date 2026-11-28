"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  Home,
  LogOut,
  ReceiptText,
  UtensilsCrossed,
  User,
} from "lucide-react";
import { useCustomerAuth } from "@/components/AuthProvider";
import { CustomerChatWidget } from "@/components/CustomerChatWidget";
import { getFirstName } from "@/lib/validation";

export function CustomerHeader({ desktopOnly = false }: { desktopOnly?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, authReady, logoutCustomer } = useCustomerAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const handleKeluar = async () => {
    setMenuOpen(false);
    await logoutCustomer();
    router.push("/");
  };

  const firstName = getFirstName(profile?.nama || user?.displayName);
  const desktopLink = (active: boolean) =>
    `inline-flex h-20 items-center gap-2 border-b-2 px-2 text-sm font-semibold transition-colors duration-200 ${
      active
        ? "border-red-600 text-red-600"
        : "border-transparent text-stone-600 hover:text-red-600"
    }`;

  return (
    <header
      className={`sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur-sm ${
        desktopOnly ? 'hidden lg:block' : ''
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={32}
            height={32}
            priority
            className="h-8 w-8 rounded-lg"
          />
          <span className="text-xl font-extrabold tracking-tight text-red-600 whitespace-nowrap">
            Aci Rivi
          </span>
        </Link>

        <nav
          aria-label="Navigasi utama"
          className="hidden h-full flex-1 items-center justify-center gap-2 lg:flex xl:gap-4"
        >
          <Link
            href="/"
            className={desktopLink(pathname === "/")}
            aria-current={pathname === "/" ? "page" : undefined}
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            <span>Beranda</span>
          </Link>
          <Link
            href="/pesan"
            className={desktopLink(pathname === "/pesan")}
            aria-current={pathname === "/pesan" ? "page" : undefined}
          >
            <UtensilsCrossed className="h-4 w-4" aria-hidden="true" />
            <span>Menu</span>
          </Link>
          <Link
            href="/pesanan"
            className={desktopLink(pathname.startsWith("/pesanan"))}
          >
            <ReceiptText className="h-4 w-4" aria-hidden="true" />
            <span>Pesanan</span>
          </Link>
          <CustomerChatWidget variant="desktop" />
        </nav>

        {!authReady ? (
          <div
            className="h-9 w-32 rounded-xl bg-stone-100"
            aria-hidden="true"
          />
        ) : !user ? (
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/masuk"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 whitespace-nowrap"
            >
              Masuk
            </Link>
            <Link
              href="/daftar"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-bold text-white transition-colors hover:bg-red-700 whitespace-nowrap"
            >
              Daftar
            </Link>
          </div>
        ) : (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-semibold text-stone-900 transition-colors hover:border-orange-300 hover:bg-orange-50/50 whitespace-nowrap"
            >
              <span className="max-w-[140px] truncate">Halo, {firstName}</span>
              <ChevronDown
                className={`h-4 w-4 text-stone-500 transition-transform ${
                  menuOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-48 overflow-hidden rounded-2xl border border-stone-200 bg-white py-1.5 shadow-lg"
              >
                <Link
                  href="/pesanan"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-[44px] items-center gap-2.5 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-orange-50 hover:text-red-700"
                >
                  <ReceiptText
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>Pesanan Saya</span>
                </Link>
                <Link
                  href="/akun"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-[44px] items-center gap-2.5 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-orange-50 hover:text-red-700"
                >
                  <User className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Akun Saya</span>
                </Link>
                <div className="my-1 border-t border-stone-100" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleKeluar}
                  className="flex min-h-[44px] w-full items-center gap-2.5 px-4 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Keluar</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
