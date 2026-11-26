import { NextRequest, NextResponse } from 'next/server';
import { asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { chatConversations, chatMessages } from '@/lib/db/schema';
import { badCsrf } from '@/lib/orders-server';

export const dynamic = 'force-dynamic';

const messageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

async function getCustomerId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const customerId = await getCustomerId();
  if (!customerId) {
    return NextResponse.json({ error: 'Masuk dulu untuk membuka chat.' }, { status: 401 });
  }

  try {
    const [conversation] = await db
      .select({ id: chatConversations.id })
      .from(chatConversations)
      .where(eq(chatConversations.customerId, customerId))
      .limit(1);

    if (!conversation) {
      return NextResponse.json(
        { conversationId: null, messages: [] },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const rows = await db
      .select({
        id: chatMessages.id,
        senderType: chatMessages.senderType,
        body: chatMessages.body,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversation.id))
      .orderBy(desc(chatMessages.createdAt))
      .limit(100);

    return NextResponse.json(
      { conversationId: conversation.id, messages: rows.reverse() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('customer chat GET error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Gagal memuat chat.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const csrf = badCsrf(req);
  if (csrf) return csrf;

  const customerId = await getCustomerId();
  if (!customerId) {
    return NextResponse.json({ error: 'Masuk dulu untuk mengirim pesan.' }, { status: 401 });
  }

  const parsed = messageSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Pesan tidak valid.' }, { status: 400 });
  }

  const now = new Date();
  try {
    const [conversation] = await db
      .insert(chatConversations)
      .values({ customerId, updatedAt: now })
      .onConflictDoUpdate({
        target: chatConversations.customerId,
        set: { updatedAt: now },
      })
      .returning({ id: chatConversations.id });

    const [message] = await db
      .insert(chatMessages)
      .values({
        conversationId: conversation.id,
        senderType: 'customer',
        body: parsed.data.message,
      })
      .returning({
        id: chatMessages.id,
        senderType: chatMessages.senderType,
        body: chatMessages.body,
        createdAt: chatMessages.createdAt,
      });

    return NextResponse.json(
      { conversationId: conversation.id, message },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('customer chat POST error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Gagal mengirim pesan.' }, { status: 500 });
  }
}
