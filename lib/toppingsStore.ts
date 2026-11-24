import type { Topping } from './types';

export const DATA_CHANGED_EVENT = 'aci-rivi-data-changed';

const POLL_MS = 10_000;
const DEBOUNCE_MS = 400;
const HEADERS = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
};

export type WriteResult = { ok: true } | { ok: false; error: string };
type Patch = Partial<Omit<Topping, 'id'>>;
type Queued = {
  patch: Patch;
  waiters: Array<(r: WriteResult) => void>;
  timer: number;
};

let cache: Topping[] | null = null;
let inflight: Promise<Topping[]> | null = null;
let activeWrites = 0;
const queued = new Map<string, Queued>();

function busy() {
  return activeWrites > 0 || queued.size > 0;
}

function emit() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  }
}

export function getToppings(): Topping[] {
  return cache ?? [];
}

export async function refreshToppings(): Promise<Topping[]> {
  // Jangan menimpa perubahan yang belum tersimpan
  if (busy() && cache) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch('/api/toppings', { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat topping.');
      const data = (await res.json()) as Topping[];
      if (!busy()) {
        cache = data;
        emit();
      }
      return cache ?? data;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export async function loadToppings(): Promise<Topping[]> {
  return cache ?? refreshToppings();
}

async function request(url: string, init: RequestInit): Promise<void> {
  const res = await fetch(url, { ...init, headers: HEADERS });
  if (res.ok) return;
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  throw new Error(
    data.error ||
      (res.status === 401
        ? 'Sesi pegawai berakhir. Masuk ulang.'
        : 'Gagal menyimpan perubahan.')
  );
}

function toError(err: unknown): string {
  return err instanceof Error ? err.message : 'Gagal menyimpan perubahan.';
}

export async function addTopping(input: {
  nama: string;
  emoji: string;
  foto?: string;
  harga: number;
  stok: number;
}): Promise<WriteResult> {
  activeWrites++;
  try {
    await request('/api/toppings', {
      method: 'POST',
      body: JSON.stringify({
        nama: input.nama.trim(),
        emoji: input.emoji.trim() || '🍲',
        foto: input.foto,
        harga: Math.max(0, Math.round(input.harga)),
        stok: Math.max(0, Math.round(input.stok)),
      }),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toError(err) };
  } finally {
    activeWrites--;
    await refreshToppings().catch(() => {});
  }
}

async function flush(id: string): Promise<void> {
  const entry = queued.get(id);
  if (!entry) return;
  queued.delete(id);

  activeWrites++;
  let result: WriteResult = { ok: true };
  try {
    await request(`/api/toppings/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(entry.patch),
    });
  } catch (err) {
    result = { ok: false, error: toError(err) };
  } finally {
    activeWrites--;
  }

  // Samakan dengan data server (membatalkan perubahan sementara jika gagal)
  await refreshToppings().catch(() => {});
  entry.waiters.forEach((w) => w(result));
}

export function updateTopping(
  id: string,
  patch: Patch,
  opts: { immediate?: boolean } = {}
): Promise<WriteResult> {
  const clean: Patch = { ...patch };
  if (clean.stok !== undefined) clean.stok = Math.max(0, Math.round(clean.stok));
  if (clean.harga !== undefined) clean.harga = Math.max(0, Math.round(clean.harga));

  // Tampilkan perubahan langsung, simpan ke server sesudahnya
  if (cache) {
    cache = cache.map((t) => (t.id === id ? { ...t, ...clean } : t));
    emit();
  }

  return new Promise<WriteResult>((resolve) => {
    const prev = queued.get(id);
    if (prev) window.clearTimeout(prev.timer);

    const entry: Queued = {
      patch: { ...(prev?.patch ?? {}), ...clean },
      waiters: [...(prev?.waiters ?? []), resolve],
      timer: 0,
    };
    queued.set(id, entry);

    if (opts.immediate) {
      void flush(id);
    } else {
      entry.timer = window.setTimeout(() => void flush(id), DEBOUNCE_MS);
    }
  });
}

export async function deleteTopping(id: string): Promise<WriteResult> {
  if (cache) {
    cache = cache.filter((t) => t.id !== id);
    emit();
  }
  activeWrites++;
  try {
    await request(`/api/toppings/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toError(err) };
  } finally {
    activeWrites--;
    await refreshToppings().catch(() => {});
  }
}

// ---- Sinkronisasi otomatis antar perangkat ----
let syncUsers = 0;
let pollTimer: number | null = null;
let cleanupListeners: (() => void) | null = null;

export function startToppingsSync(): () => void {
  if (typeof window === 'undefined') return () => {};

  syncUsers++;
  if (syncUsers === 1) {
    const tick = () => {
      if (document.visibilityState === 'visible') {
        void refreshToppings().catch(() => {});
      }
    };
    tick();
    pollTimer = window.setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    cleanupListeners = () => {
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }

  return () => {
    syncUsers--;
    if (syncUsers === 0) {
      if (pollTimer !== null) window.clearInterval(pollTimer);
      pollTimer = null;
      cleanupListeners?.();
      cleanupListeners = null;
    }
  };
}