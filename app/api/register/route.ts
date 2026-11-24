import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getWhatsAppValidationError } from "@/lib/validation";

const schema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  nomorWhatsApp: z.string().trim(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success)
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });

    const waError = getWhatsAppValidationError(parsed.data.nomorWhatsApp);
    if (waError) return NextResponse.json({ error: waError }, { status: 400 });

    const email = parsed.data.email.toLowerCase();
    const [exists] = await db.select().from(users).where(eq(users.email, email));
    if (exists)
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });

    await db.insert(users).values({
      name: parsed.data.name,
      email,
      nomorWhatsApp: parsed.data.nomorWhatsApp,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
    });
    return NextResponse.json({ ok: true }, { status: 201 });
    } catch (err) {
    const cause = (err as { cause?: { message?: string; code?: string } })?.cause;
    console.error(
      "register error:",
      err instanceof Error ? err.message : String(err),
      "| db message:",
      cause?.message,
      "| db code:",
      cause?.code
    );
    return NextResponse.json(
      { error: "Gagal menyimpan akun", detail: cause?.message ?? String(err) },
      { status: 500 }
    );
  }
}