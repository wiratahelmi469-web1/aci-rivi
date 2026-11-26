const SOUND_KEY = 'aci_rivi_staff_sound_v1';
const AUDIO_EVENT = 'aci-rivi-staff-audio';
const CONFIRM_TTL_MS = 5 * 60 * 1000;

let ctx: AudioContext | null = null;
const confirmedHere = new Map<string, number>();

function emit() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUDIO_EVENT));
  }
}

export function subscribeAudio(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(AUDIO_EVENT, callback);
  return () => window.removeEventListener(AUDIO_EVENT, callback);
}

export function getSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(SOUND_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(SOUND_KEY, on ? '1' : '0');
  } catch {
    // abaikan jika penyimpanan tidak tersedia
  }
  emit();
}

export function isAudioReady(): boolean {
  return ctx?.state === 'running';
}

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    ctx.addEventListener('statechange', emit);
  }
  return ctx;
}

/** Browser hanya mengizinkan suara setelah pengguna menyentuh layar sekali. */
export async function unlockAudio(): Promise<boolean> {
  const c = getContext();
  if (!c) return false;
  if (c.state !== 'running') {
    await Promise.race([
      c.resume().catch(() => undefined),
      new Promise((resolve) => window.setTimeout(resolve, 300)),
    ]);
  }
  emit();
  return c.state === 'running';
}

function beep(c: AudioContext, freq: number, at: number, dur: number, peak: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

async function readyContext(): Promise<AudioContext | null> {
  const ok = await unlockAudio();
  return ok ? ctx : null;
}

/** Bukti bayar baru: dua nada naik, diulang dua kali. */
export async function playPaymentAlert(): Promise<boolean> {
  if (!getSoundEnabled()) return false;
  const c = await readyContext();
  if (!c) return false;
  const t = c.currentTime + 0.02;
  [0, 0.7].forEach((offset) => {
    beep(c, 880, t + offset, 0.28, 0.35);
    beep(c, 1175, t + offset + 0.22, 0.45, 0.35);
  });
  return true;
}

/** Pesanan baru masuk dapur: satu denting lembut. */
export async function playOrderAlert(): Promise<boolean> {
  if (!getSoundEnabled()) return false;
  const c = await readyContext();
  if (!c) return false;
  beep(c, 988, c.currentTime + 0.02, 0.55, 0.25);
  return true;
}

export async function playTestSound(): Promise<void> {
  const c = await readyContext();
  if (!c) return;
  beep(c, 988, c.currentTime + 0.02, 0.55, 0.25);
}

/** Dipakai agar perangkat yang baru mengonfirmasi pembayaran tidak berbunyi untuk pesanan itu. */
export function markConfirmedHere(orderId: string): void {
  confirmedHere.set(orderId, Date.now());
}

export function wasConfirmedHere(orderId: string): boolean {
  const at = confirmedHere.get(orderId);
  return at !== undefined && Date.now() - at < CONFIRM_TTL_MS;
}