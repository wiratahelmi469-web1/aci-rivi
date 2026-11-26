'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, MessageCircle, X } from 'lucide-react';
import { ChatMessageThread } from '@/components/ChatMessageThread';
import type { ChatMessage } from '@/lib/types';
import { formatTanggalJamWib } from '@/lib/time';

interface StaffConversation {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerWhatsApp: string | null;
  updatedAt: string;
  lastMessage: string | null;
}

const STAFF_HEADERS = { 'X-Requested-With': 'XMLHttpRequest' };

export function StaffChatWidget() {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<StaffConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

  const loadConversations = useCallback(async () => {
    const response = await fetch('/api/pegawai/chat', {
      headers: STAFF_HEADERS,
      cache: 'no-store',
    });
    const data = (await response.json().catch(() => ({}))) as {
      conversations?: StaffConversation[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error || 'Gagal memuat daftar chat.');
    }
    setConversations(data.conversations ?? []);
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const response = await fetch(
      `/api/pegawai/chat?conversationId=${encodeURIComponent(conversationId)}`,
      { headers: STAFF_HEADERS, cache: 'no-store' }
    );
    const data = (await response.json().catch(() => ({}))) as {
      messages?: ChatMessage[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error || 'Gagal memuat pesan.');
    }
    setMessages(data.messages ?? []);
  }, []);

  useEffect(() => {
    if (!open) return;

    let active = true;
    const refresh = async () => {
      try {
        await loadConversations();
        if (selectedId) await loadMessages(selectedId);
        if (active) setError('');
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Gagal memuat chat.');
        }
      }
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), 4000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [open, selectedId, loadConversations, loadMessages]);

  const selectConversation = async (conversationId: string) => {
    setSelectedId(conversationId);
    setMessages([]);
    setError('');
    try {
      await loadMessages(conversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pesan.');
    }
  };

  const sendMessage = async (message: string) => {
    if (!selectedId) return;
    setIsSending(true);
    setError('');
    try {
      const response = await fetch('/api/pegawai/chat', {
        method: 'POST',
        headers: {
          ...STAFF_HEADERS,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId: selectedId, message }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        message?: ChatMessage;
        error?: string;
      };
      const savedMessage = data.message;
      if (!response.ok || !savedMessage) {
        throw new Error(data.error || 'Gagal mengirim pesan.');
      }
      setMessages((current) =>
        [...current.filter((item) => item.id !== savedMessage.id), savedMessage].slice(-100)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim pesan.');
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedId
  );

  return (
    <div className="pointer-events-none fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 h-0">
      {open && (
        <section
          role="dialog"
          aria-labelledby="staff-chat-title"
          className="pointer-events-auto absolute right-0 bottom-16 flex h-[min(38rem,78vh)] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl"
        >
          <header className="flex min-h-14 items-center gap-2 border-b border-stone-200 px-3">
            {selectedConversation && (
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setMessages([]);
                  setError('');
                }}
                aria-label="Kembali ke daftar chat"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-stone-600 hover:bg-stone-100"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <h2 id="staff-chat-title" className="truncate text-base font-bold text-stone-900">
                {selectedConversation?.customerName ?? 'Chat Pelanggan'}
              </h2>
              {selectedConversation && (
                <p className="truncate text-xs text-stone-500">
                  {selectedConversation.customerEmail}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup inbox chat"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-stone-600 hover:bg-stone-100"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          {selectedConversation ? (
            <ChatMessageThread
              messages={messages}
              currentSender="staff"
              isSending={isSending}
              error={error}
              onSend={sendMessage}
              emptyMessage="Belum ada pesan di percakapan ini."
            />
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {error && (
                <p role="alert" className="m-3 text-sm font-semibold text-red-600">
                  {error}
                </p>
              )}
              {conversations.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-stone-500">
                  Belum ada pelanggan yang memulai chat.
                </p>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {conversations.map((conversation) => (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        onClick={() => void selectConversation(conversation.id)}
                        className="min-h-[76px] w-full px-4 py-3 text-left hover:bg-stone-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="truncate text-sm font-bold text-stone-900">
                            {conversation.customerName}
                          </span>
                          <time className="shrink-0 text-xs text-stone-500">
                            {formatTanggalJamWib(conversation.updatedAt)}
                          </time>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-stone-500">
                          {conversation.customerEmail}
                          {conversation.customerWhatsApp
                            ? ` · ${conversation.customerWhatsApp}`
                            : ''}
                        </p>
                        <p className="mt-1 truncate text-sm text-stone-700">
                          {conversation.lastMessage || 'Belum ada pesan'}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? 'Tutup inbox chat' : 'Buka inbox chat pelanggan'}
        aria-expanded={open}
        className="pointer-events-auto absolute right-0 bottom-0 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-colors hover:bg-red-700"
      >
        {open ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
