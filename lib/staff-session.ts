import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export const STAFF_COOKIE_NAME = 'aci_rivi_staff_session';

const globalForAuth = globalThis as unknown as {
  __aciRiviSessionSecret?: string;
};

export function getSessionSecret(): string {
  if (process.env.STAFF_SESSION_SECRET) {
    return process.env.STAFF_SESSION_SECRET;
  }
  if (!globalForAuth.__aciRiviSessionSecret) {
    globalForAuth.__aciRiviSessionSecret = crypto.randomBytes(32).toString('hex');
  }
  return globalForAuth.__aciRiviSessionSecret;
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(expStr)
    .digest('hex');

  if (sig.length !== expectedSig.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(sig, 'utf8'),
    Buffer.from(expectedSig, 'utf8')
  );
}

/** Mengembalikan response error jika bukan pegawai; null jika boleh lanjut. */
export function staffGuard(req: NextRequest): NextResponse | null {
  const token = req.cookies.get(STAFF_COOKIE_NAME)?.value;
  if (!verifyToken(token)) {
    return NextResponse.json({ error: 'Akses pegawai diperlukan. Masuk ulang.' }, { status: 401 });
  }
  if (req.headers.get('x-requested-with') !== 'XMLHttpRequest') {
    return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 403 });
  }
  return null;
}