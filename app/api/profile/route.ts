import { config } from "dotenv";
config({ path: ".env.local" });

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getWhatsAppValidationError } from "@/lib/validation";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Belum masuk" }, { status: 401 });

  const [u] = await db.select().from(users).where(eq(users.id, session.user.id));
  if (!u) return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });

  return NextResponse.json({
    uid: u.id,
    nama: u.name,
    email: u.email,
    nomorWhatsApp: u.nomorWhatsApp,
  });
}

const patchSchema = z.object({
  nama: z.string().trim().min(1),
  nomorWhatsApp: z.string().trim(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Belum masuk" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });

  const waError = getWhatsAppValidationError(parsed.data.nomorWhatsApp);
  if (waError) return NextResponse.json({ error: waError }, { status: 400 });

  await db
    .update(users)
    .set({ name: parsed.data.nama, nomorWhatsApp: parsed.data.nomorWhatsApp })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ ok: true });
}