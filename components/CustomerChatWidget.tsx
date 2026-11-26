'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useCustomerAuth } from '@/components/AuthProvider';
import { ChatMessageThread } from '@/components/ChatMessageThread';
import type { ChatMessage } from '@/lib/types';

interface CustomerChatResponse {
  conversationId: string | null;
  messages: ChatMessage[];
  error?: string;
}

interface CustomerChatWidgetProps {
  variant?: 'bottom' | 'desktop';
}

export function CustomerChatWidget({
  variant = 'bottom',
}: CustomerChatWidgetProps) {
  const router = useRouter();
  const { user } = useCustomerAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatOpen = Boolean(user && open);
  const isDesktop = variant === 'desktop';

  const loadMessages = useCallback(async () => {
    const response = await fetch('/api/chat', { cache: 'no-store' });
    const data = (await response.json().catch(() => ({}))) as CustomerChatResponse;
    if (!response.ok) {
      throw new Error(data.error || 'Gagal memuat chat.');
    }
    setMessages(data.messages);
  }, []);

  useEffect(() => {
    if (!open || !user) return;

    let active = true;
    const refresh = async () => {
      try {
        await loadMessages();
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
  }, [open, user, loadMessages]);

  const sendMessage = async (message: string) => {
    setIsSending(true);
    setError('');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ message }),
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

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!user) {
            router.push('/masuk?next=/');
            return;
          }
          setOpen((current) => !current);
        }}
        aria-label={
          user
            ? chatOpen
              ? 'Tutup chat pegawai'
              : 'Chat dengan pegawai'
            : 'Masuk untuk membuka chat'
        }
        aria-expanded={chatOpen}
        className={
          isDesktop
            ? `inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${
                chatOpen
                  ? 'bg-red-50 text-red-600'
                  : 'text-stone-700 hover:bg-stone-100'
              }`
            : `flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-semibold transition-colors ${
                chatOpen ? 'text-red-600' : 'text-stone-500 active:bg-stone-100'
              }`
        }
      >
        {chatOpen ? (
          <X
            className={isDesktop ? 'h-4 w-4' : 'h-5 w-5'}
            aria-hidden="true"
          />
        ) : (
          <MessageCircle
            className={isDesktop ? 'h-4 w-4' : 'h-5 w-5'}
            aria-hidden="true"
          />
        )}
        <span>Chat</span>
      </button>

      {chatOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={`pointer-events-none fixed inset-x-0 z-50 mx-auto w-full ${
              isDesktop
                ? 'hidden max-w-[1280px] px-8 lg:bottom-6 lg:block'
                : 'bottom-[calc(5rem+env(safe-area-inset-bottom))] max-w-[480px] px-4 lg:hidden'
            }`}
          >
            <section
              role="dialog"
              aria-labelledby="customer-chat-title"
              className="pointer-events-auto ml-auto flex h-[min(34rem,70vh)] w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl"
            >
              <header className="flex min-h-14 items-center justify-between gap-3 border-b border-stone-200 px-4">
                <h2
                  id="customer-chat-title"
                  className="truncate text-base font-bold text-stone-900"
                >
                  Chat dengan Pegawai
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Tutup chat"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-stone-600 hover:bg-stone-100"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </header>

              <ChatMessageThread
                messages={messages}
                currentSender="customer"
                isSending={isSending}
                error={error}
                onSend={sendMessage}
                emptyMessage="Belum ada pesan. Tulis pesan untuk memulai chat."
              />
            </section>
          </div>,
          document.body
        )}
    </>
  );
}
