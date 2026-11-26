'use client';

import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import type { ChatMessage, ChatSenderType } from '@/lib/types';

interface ChatMessageThreadProps {
  messages: ChatMessage[];
  currentSender: ChatSenderType;
  isSending: boolean;
  error: string;
  onSend: (message: string) => Promise<void>;
  emptyMessage: string;
}

export function ChatMessageThread({
  messages,
  currentSender,
  isSending,
  error,
  onSend,
  emptyMessage,
}: ChatMessageThreadProps) {
  const [draft, setDraft] = useState('');
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || isSending) return;
    try {
      await onSend(message);
      setDraft('');
    } catch {
      return;
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={messagesRef}
        aria-live="polite"
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3"
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-stone-500">{emptyMessage}</p>
        ) : (
          messages.map((message) => {
            const ownMessage = message.senderType === currentSender;
            return (
              <div
                key={message.id}
                className={`flex ${ownMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                    ownMessage
                      ? 'bg-red-600 text-white'
                      : 'bg-stone-100 text-stone-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {message.body}
                  </p>
                  <time
                    dateTime={message.createdAt}
                    className={`mt-1 block text-right text-xs ${
                      ownMessage ? 'text-red-50' : 'text-stone-500'
                    }`}
                  >
                    {new Intl.DateTimeFormat('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(message.createdAt))}
                  </time>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-stone-200 p-3">
        {error && (
          <p role="alert" className="mb-2 text-xs font-semibold text-red-600">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            maxLength={2000}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ketik pesan..."
            aria-label="Ketik pesan"
            className="h-11 min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:border-red-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || isSending}
            aria-label="Kirim pesan"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}
