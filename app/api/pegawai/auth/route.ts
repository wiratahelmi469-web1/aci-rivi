import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'aci_rivi_staff_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 jam

// Kunci penanda sesi di memori proses (atau dari env STAFF_SESSION_SECRET jika tersedia)
const globalForAuth = globalThis as unknown as {
  __aciRiviSessionSecret?: string;
};

function getSessionSecret(): string {
  if (process.env.STAFF_SESSION_SECRET) {
    return process.env.STAFF_SESSION_SECRET;
  }
  if (!globalForAuth.__aciRiviSessionSecret) {
    globalForAuth.__aciRiviSessionSecret = crypto
      .randomBytes(32)
      .toString('hex');
  }
  return globalForAuth.__aciRiviSessionSecret;
}

function getConfiguredPin(): string {
  const envPin = process.env.STAFF_PIN?.trim();
  return envPin && envPin.length > 0 ? envPin : '1234';
}

function constantTimeMatch(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function signToken(payload: string): string {
  const hmac = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest('hex');
  return `${payload}.${hmac}`;
}

function verifyToken(token: string | undefined): boolean {
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

function isSameOriginOrCustomHeader(req: NextRequest): boolean {
  const requestedWith = req.headers.get('x-requested-with');
  if (requestedWith === 'XMLHttpRequest') return true;

  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function getCookieOptions(req: NextRequest, maxAge: number) {
  const isHttps =
    req.headers.get('x-forwarded-proto') === 'https' ||
    req.nextUrl.protocol === 'https:';

  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? ('none' as const) : ('lax' as const),
    partitioned: isHttps ? true : undefined,
    path: '/',
    maxAge,
  };
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return NextResponse.json({
    authenticated: verifyToken(token),
  });
}

export async function POST(req: NextRequest) {
  if (!isSameOriginOrCustomHeader(req)) {
    return NextResponse.json(
      { authenticated: false, error: 'Permintaan tidak valid.' },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { authenticated: false, error: 'Format permintaan tidak valid.' },
      { status: 400 }
    );
  }

  const pin =
    typeof body === 'object' &&
    body !== null &&
    'pin' in body &&
    typeof (body as { pin: unknown }).pin === 'string'
      ? (body as { pin: string }).pin.trim()
      : '';

  if (!pin || pin.length > 20) {
    return NextResponse.json(
      { authenticated: false, error: 'PIN wajib diisi.' },
      { status: 400 }
    );
  }

  const configuredPin = getConfiguredPin();
  if (!constantTimeMatch(pin, configuredPin)) {
    return NextResponse.json(
      { authenticated: false, error: 'PIN salah. Coba lagi.' },
      { status: 401 }
    );
  }

  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const token = signToken(String(expiresAt));
  const res = NextResponse.json({ authenticated: true });
  res.cookies.set(COOKIE_NAME, token, getCookieOptions(req, SESSION_TTL_SECONDS));
  return res;
}

export async function DELETE(req: NextRequest) {
  if (!isSameOriginOrCustomHeader(req)) {
    return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 403 });
  }
  const res = NextResponse.json({ authenticated: false });
  res.cookies.set(COOKIE_NAME, '', getCookieOptions(req, 0));
  return res;
}
