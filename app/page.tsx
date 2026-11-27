import type { Metadata } from 'next';
import Link from 'next/link';
import { and, asc, desc, eq, gt, inArray, ne, or, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { CaraPesan } from '@/components/home/CaraPesan';
import { BerandaPelanggan } from '@/components/home/BerandaPelanggan';
import { HeroTamu } from '@/components/home/HeroTamu';
import { PratinjauTopping, type ToppingPreview } from '@/components/home/PratinjauTopping';
import { CustomerHeader } from '@/components/CustomerHeader';
import { STAFF_COOKIE_NAME, verifyToken } from '@/lib/staff-session';
import { db } from '@/lib/db';
import { orders, toppings, users } from '@/lib/db/schema';
import { orderCols, toOrder } from '@/lib/orders-server';
import { getBestSellingToppings } from '@/lib/toppings-server';
import { getStoreStatusWib } from '@/lib/time';
import type { Order } from '@/lib/types';
import { JAM_BUKA, JAM_TUTUP } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Seblak Prasmanan Aci Rivi — Pilih Topping, Ambil Tanpa Antre',
  description:
    'Racik topping seblak Aci Rivi sendiri, pilih waktu pengambilan, dan bayar lewat QRIS. Ambil di tempat tanpa antre.',
  openGraph: {
    title: 'Seblak Prasmanan Aci Rivi',
    description:
      'Pilih topping seblak sendiri, tentukan waktu pengambilan, bayar QRIS, lalu ambil tanpa antre.',
    type: 'website',
  },
};

async function loadToppingPreviews(): Promise<{
  toppings: ToppingPreview[];
  error: boolean;
}> {
  try {
    const rows = await db
      .select({
        id: toppings.id,
        nama: toppings.nama,
        emoji: toppings.emoji,
        hasFoto: sql<boolean>`${toppings.foto} IS NOT NULL`,
        fotoVersion: toppings.fotoVersion,
        harga: toppings.harga,
      })
      .from(toppings)
      .where(and(eq(toppings.tersedia, true), gt(toppings.stok, 0)))
      .orderBy(asc(toppings.createdAt), asc(toppings.id))
      .limit(8);

    return {
      toppings: rows.map((row) => ({
        id: row.id,
        nama: row.nama,
        emoji: row.emoji,
        foto: row.hasFoto
          ? `/api/toppings/${encodeURIComponent(row.id)}/foto?v=${row.fotoVersion}`
          : undefined,
        harga: row.harga,
      })),
      error: false,
    };
  } catch (error) {
    console.error('homepage toppings error:', error instanceof Error ? error.message : error);
    return { toppings: [], error: true };
  }
}

async function loadCustomerOrders(uid: string): Promise<{
  active: Order | null;
  recent: Order[];
  error: boolean;
}> {
  try {
    const activeStatus = or(
      inArray(orders.statusBayar, [
        'Menunggu Pembayaran',
        'Menunggu Konfirmasi',
        'Ditolak',
      ]),
      and(eq(orders.statusBayar, 'Lunas'), ne(orders.statusPesanan, 'Selesai'))
    );
    const [activeRows, recentRows] = await Promise.all([
      db
        .select(orderCols)
        .from(orders)
        .where(and(eq(orders.uid, uid), activeStatus))
        .orderBy(desc(orders.waktuDibuat))
        .limit(1),
      db
        .select(orderCols)
        .from(orders)
        .where(eq(orders.uid, uid))
        .orderBy(desc(orders.waktuDibuat))
        .limit(3),
    ]);

    return {
      active: activeRows[0] ? toOrder(activeRows[0]) : null,
      recent: recentRows.map(toOrder),
      error: false,
    };
  } catch (error) {
    console.error('homepage orders error:', error instanceof Error ? error.message : error);
    return { active: null, recent: [], error: true };
  }
}

function InfoGerai() {
  return (
    <section aria-label="Informasi layanan" className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <p className="text-sm font-bold text-stone-900">Ambil di tempat</p>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          Pesanan disiapkan untuk diambil langsung di gerai sesuai waktu pilihanmu.
        </p>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <p className="text-sm font-bold text-stone-900">Bayar dengan QRIS</p>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          Selesaikan pembayaran melalui QRIS setelah pesanan dibuat.
        </p>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isStaffCookie = verifyToken(cookieStore.get(STAFF_COOKIE_NAME)?.value);
  const role = session?.user?.role?.toLowerCase();
  if (
    isStaffCookie ||
    role === 'staff' ||
    role === 'pegawai' ||
    role === 'employee' ||
    role === 'admin'
  ) {
    redirect('/pegawai');
  }

  const status = getStoreStatusWib();
  if (session?.user?.id) {
    const [profile, customerOrders, bestSellerRows] = await Promise.all([
      db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, session.user.id))
        .then((rows) => rows[0]?.name ?? session.user.name ?? 'Pelanggan')
        .catch((error: unknown) => {
          console.error('homepage profile error:', error instanceof Error ? error.message : error);
          return session.user.name ?? 'Pelanggan';
        }),
      loadCustomerOrders(session.user.id),
      getBestSellingToppings()
        .then((rows) => ({ rows, error: false }))
        .catch((error: unknown) => {
          console.error('homepage best sellers error:', error instanceof Error ? error.message : error);
          return { rows: [], error: true };
        }),
    ]);

    return (
      <BerandaPelanggan
        nama={profile}
        initialOpen={status.open}
        statusText={status.text}
        initialActiveOrder={customerOrders.active}
        initialRecentOrders={customerOrders.recent}
        initialLoadError={customerOrders.error}
        bestSellers={bestSellerRows.rows.map((row) => ({
          id: row.id,
          nama: row.nama,
          emoji: row.emoji,
          foto: row.hasFoto
            ? `/api/toppings/${encodeURIComponent(row.id)}/foto?v=${row.fotoVersion}`
            : undefined,
          harga: row.harga,
          terjual: row.terjual,
        }))}
        bestSellersError={bestSellerRows.error}
      />
    );
  }

  const toppingData = await loadToppingPreviews();
  return (
    <div className="min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
      <CustomerHeader />
      <main className="mx-auto w-full max-w-7xl space-y-10 px-4 py-5 sm:px-6 sm:py-8 lg:space-y-14 lg:px-8 lg:py-10">
        <HeroTamu initialOpen={status.open} statusText={status.text} />
        <CaraPesan />
        <PratinjauTopping
          toppings={toppingData.toppings}
          loadError={toppingData.error}
        />
        <InfoGerai />
        <section className="overflow-hidden rounded-3xl bg-stone-900 px-5 py-7 text-center text-white sm:px-8 sm:py-9">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Seblak pilihanmu, siap diambil saat kamu tiba
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-stone-300 sm:text-base">
            Masuk atau daftar untuk menyusun pesanan dan memantau statusnya.
          </p>
          <Link
            href="/masuk?next=%2Fpesan"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-red-600 px-6 text-sm font-bold text-white transition hover:bg-red-700 sm:min-h-14 sm:text-base"
          >
            Masuk atau Daftar
          </Link>
        </section>
      </main>
      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span className="font-bold text-stone-700">Aci Rivi · Seblak Prasmanan</span>
          <span>
            {status.open ? 'Sedang buka' : 'Sedang tutup'} · Operasional {JAM_BUKA}:00–{JAM_TUTUP}:00 WIB · Hanya ambil di tempat
          </span>
        </div>
      </footer>
    </div>
  );
}
