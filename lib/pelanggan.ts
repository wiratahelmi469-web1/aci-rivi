export interface PelangganProfile {
  uid: string;
  nama: string;
  email: string;
  nomorWhatsApp: string;
}

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data.error || 'Terjadi kesalahan';
  } catch {
    return 'Terjadi kesalahan';
  }
}

export async function getPelangganProfile(): Promise<PelangganProfile> {
  const res = await fetch('/api/profile', { cache: 'no-store' });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function updatePelangganProfile(input: {
  nama: string;
  nomorWhatsApp: string;
}): Promise<void> {
  const res = await fetch('/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
}