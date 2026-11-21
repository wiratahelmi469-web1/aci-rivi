'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Utensils } from 'lucide-react';
import { OrderDetailModal } from '@/components/OrderDetailModal';
import { ErrorRetryCard, OrderListSkeleton } from '@/components/Skeletons';
import { playNewOrderChime } from '@/lib/sound';
import {
  advanceOrderStatus,
  getStaffOrders,
  subscribeDataChanges,
} from '@/lib/storage';
import { getPickupSortMinutes } from '@/lib/time';
import type { Order, StatusPesanan } from '@/lib/types';

const STATUS_TABS: StatusPesanan[] = [
  'Baru',
  'Sedang Dibuat',
  'Siap Diambil',
  'Selesai',
];

const NEXT_STATUS_ACTION: Record<
  Exclude<StatusPesanan, 'Selesai'>,
  { label: string; next: StatusPesanan }
> = {
  Baru: { label: 'Mulai Buat', next: 'Sedang Dibuat' },
  'Sedang Dibuat': { label: 'Tandai Siap Diambil', next: 'Siap Diambil' },
  'Siap Diambil': { label: 'Selesai', next: 'Selesai' },
};

export function PesananMasukView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState<StatusPesanan>('Baru');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const knownBaruIdsRef = useRef<Set<string> | null>(null);

  const sync = useCallback(() => {
    try {
      const staffOrders = getStaffOrders();
      setOrders(staffOrders);
      setLoadError(false);

      const currentBaruIds = new Set(
        staffOrders
          .filter((o) => o.statusPesanan === 'Baru')
          .map((o) => o.id)
      );

      if (knownBaruIdsRef.current !== null) {
        let hasNew = false;
        for (const id of currentBaruIds) {
          if (!knownBaruIdsRef.current.has(id)) {
            hasNew = true;
            break;
          }
        }
        if (hasNew) {
          playNewOrderChime();
        }
      }
      knownBaruIdsRef.current = currentBaruIds;
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initTimer = window.setTimeout(sync, 0);
    const unsubscribe = subscribeDataChanges(sync);
    const interval = window.setInterval(sync, 3000);

    return () => {
      window.clearTimeout(initTimer);
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [sync]);

  const counts = useMemo(() => {
    const map: Record<StatusPesanan, number> = {
      Baru: 0,
      'Sedang Dibuat': 0,
      'Siap Diambil': 0,
      Selesai: 0,
    };
    for (const o of orders) {
      map[o.statusPesanan] += 1;
    }
    return map;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => o.statusPesanan === activeTab)
      .sort((a, b) => {
        if (activeTab === 'Selesai') {
          return Date.parse(b.waktuDibuat) - Date.parse(a.waktuDibuat);
        }
        const diff = getPickupSortMinutes(a) - getPickupSortMinutes(b);
        if (diff !== 0) return diff;
        return Date.parse(a.waktuDibuat) - Date.parse(b.waktuDibuat);
      });
  }, [orders, activeTab]);

  return (
    <div className="space-y-5">
      {/* Tab Filter Status */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-stone-200/70 p-1.5 sm:grid-cols-4">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span className="truncate">{tab}</span>
              <span
                className={`font-mono text-xs tabular-nums ${
                  isActive ? 'text-red-600' : 'text-stone-500'
                }`}
              >
                ({counts[tab]})
              </span>
            </button>
          );
        })}
      </div>

      {/* Daftar Kartu Pesanan */}
      {isLoading ? (
        <OrderListSkeleton count={4} />
      ) : loadError ? (
        <ErrorRetryCard message="Gagal memuat" onRetry={sync} />
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-10 text-center">
          <Utensils
            className="mx-auto h-10 w-10 text-stone-300"
            aria-hidden="true"
          />
          <p className="mt-3 text-base font-semibold text-stone-700">
            Belum ada pesanan
          </p>
          <p className="mt-1 text-sm text-stone-500">
            Pesanan dengan status &ldquo;{activeTab}&rdquo; akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredOrders.map((order) => {
            const action =
              order.statusPesanan !== 'Selesai'
                ? NEXT_STATUS_ACTION[order.statusPesanan]
                : null;

            return (
              <div
                key={order.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedOrder(order)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedOrder(order);
                  }
                }}
                className={`flex cursor-pointer flex-col justify-between rounded-3xl border bg-white p-5 transition-colors hover:border-orange-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${
                  order.statusPesanan === 'Baru'
                    ? 'border-red-300'
                    : 'border-stone-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-2xl font-bold text-red-600 tabular-nums">
                          {order.nomorPesanan}
                        </span>
                        {order.statusPesanan === 'Baru' && (
                          <span className="rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold tracking-wide text-white">
                            BARU
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 text-lg font-bold text-stone-900">
                        {order.nama}
                      </h3>
                    </div>

                    <div className="text-right text-xs text-stone-600">
                      <p className="font-semibold text-stone-900">
                        {order.sumber}
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1 font-medium text-orange-700">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {order.waktuAmbil === 'Langsung'
                            ? 'Langsung'
                            : `${order.waktuAmbil} WIB`}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-stone-100 pt-3">
                    <p className="text-xs font-semibold text-stone-500">
                      Topping ({order.daftarTopping.length})
                    </p>
                    <p className="mt-1 text-sm font-medium leading-relaxed text-stone-800">
                      {order.daftarTopping
                        .map((t) => `${t.emoji ? `${t.emoji} ` : ''}${t.nama}`)
                        .join(' · ')}
                    </p>
                  </div>

                  {order.catatan && (
                    <div className="mt-3 rounded-xl bg-orange-50/70 px-3 py-2 text-sm text-stone-800">
                      <span className="font-semibold text-orange-800">
                        Catatan:{' '}
                      </span>
                      {order.catatan}
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-stone-100 pt-4">
                  <span className="text-xs font-medium text-stone-500">
                    Ketuk kartu untuk detail
                  </span>

                  {action ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        advanceOrderStatus(order.id, action.next);
                      }}
                      className="min-h-[44px] rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 active:scale-[0.98] whitespace-nowrap shrink-0"
                    >
                      {action.label}
                    </button>
                  ) : (
                    <span className="text-sm font-semibold text-emerald-700">
                      Selesai
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}
