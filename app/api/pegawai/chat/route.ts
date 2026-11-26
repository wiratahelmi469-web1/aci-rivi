import { NextRequest, NextResponse } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { chatConversations, chatMessages, users } from '@/lib/db/schema';
import { staffGuard } from '@/lib/staff-session';

export const dynamic = 'force-dynamic';

const messageSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().trim().min(1).max(2000),
});

async function getMessages(conversationId: string) {
  const rows = await db
    .select({
      id: chatMessages.id,
      senderType: chatMessages.senderType,
      body: chatMessages.body,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, conversationId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(100);
  return rows.reverse();
}

export async function GET(req: NextRequest) {
  const denied = staffGuard(req);
  if (denied) return denied;

  const conversationId = req.nextUrl.searchParams.get('conversationId');
  try {
    if (conversationId) {
      const parsedId = z.string().uuid().safeParse(conversationId);
      if (!parsedId.success) {
        return NextResponse.json({ error: 'Percakapan tidak valid.' }, { status: 400 });
      }

      const [conversation] = await db
        .select({ id: chatConversations.id })
        .from(chatConversations)
        .where(eq(chatConversations.id, parsedId.data))
        .limit(1);

      if (!conversation) {
        return NextResponse.json({ error: 'Percakapan tidak ditemukan.' }, { status: 404 });
      }

      return NextResponse.json(
        { messages: await getMessages(conversation.id) },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const conversations = await db
      .select({
        id: chatConversations.id,
        customerId: chatConversations.customerId,
        customerName: users.name,
        customerEmail: users.email,
        customerWhatsApp: users.nomorWhatsApp,
        updatedAt: chatConversations.updatedAt,
        lastMessage: sql<string | null>`(
          SELECT ${chatMessages.body}
          FROM ${chatMessages}
          WHERE ${chatMessages.conversationId} = ${chatConversations.id}
          ORDER BY ${chatMessages.createdAt} DESC
          LIMIT 1
        )`,
      })
      .from(chatConversations)
      .innerJoin(users, eq(chatConversations.customerId, users.id))
      .orderBy(desc(chatConversations.updatedAt))
      .limit(100);

    return NextResponse.json(
      { conversations },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('staff chat GET error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Gagal memuat percakapan.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = staffGuard(req);
  if (denied) return denied;

  const parsed = messageSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Pesan tidak valid.' }, { status: 400 });
  }

  try {
    const [conversation] = await db
      .select({ id: chatConversations.id })
      .from(chatConversations)
      .where(eq(chatConversations.id, parsed.data.conversationId))
      .limit(1);

    if (!conversation) {
      return NextResponse.json({ error: 'Percakapan tidak ditemukan.' }, { status: 404 });
    }

    const now = new Date();
    const [message] = await db
      .insert(chatMessages)
      .values({
        conversationId: conversation.id,
        senderType: 'staff',
        body: parsed.data.message,
      })
      .returning({
        id: chatMessages.id,
        senderType: chatMessages.senderType,
        body: chatMessages.body,
        createdAt: chatMessages.createdAt,
      });

    await db
      .update(chatConversations)
      .set({ updatedAt: now })
      .where(eq(chatConversations.id, conversation.id));

    return NextResponse.json(
      { message },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('staff chat POST error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Gagal mengirim pesan.' }, { status: 500 });
  }
}
