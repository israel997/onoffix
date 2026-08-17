'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { resolveAssetUrl, type ChatMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useConfirm } from '@/lib/confirm-context';
import { getSocket } from '@/lib/socket';

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Attachment({ message }: { message: ChatMessage }) {
  const url = resolveAssetUrl(message.fichierUrl);
  if (!url) return null;
  const isImage = message.fichierType?.startsWith('image/');

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-1 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={message.fichierNom ?? 'attachment'} className="max-h-48 rounded-lg object-cover" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-1 flex items-center gap-2 rounded-lg border border-current/15 bg-black/5 px-2.5 py-2 text-xs hover:underline"
    >
      <span aria-hidden>📎</span>
      <span className="min-w-0 flex-1 truncate">{message.fichierNom}</span>
      {message.fichierTailleOctets != null && (
        <span className="shrink-0 opacity-70">{formatFileSize(message.fichierTailleOctets)}</span>
      )}
    </a>
  );
}

export interface ChatProps {
  roomId: string;
  roomKey: 'bureauId' | 'subjectId';
  joinEvent: string;
  leaveEvent: string;
  messageEvent: string;
  fetchHistory: (roomId: string) => Promise<ChatMessage[]>;
  uploadFile: (roomId: string, file: File, contenu?: string) => Promise<ChatMessage>;
  title: string;
  description: string;
}

export function Chat({
  roomId,
  roomKey,
  joinEvent,
  leaveEvent,
  messageEvent,
  fetchHistory,
  uploadFile,
  title,
  description,
}: ChatProps) {
  const { user } = useAuth();
  const confirmDialog = useConfirm();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [draft, setDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages(null);
    fetchHistory(roomId).then((history) => {
      if (active) setMessages(history);
    });

    const socket = getSocket();

    // Réémis à chaque connexion, y compris une reconnexion après coupure — sinon
    // le client reste hors de la room côté serveur et ne reçoit plus rien (pas
    // même l'écho de ses propres messages) jusqu'à un rechargement de page.
    function join() {
      socket.emit(joinEvent, { [roomKey]: roomId });
      // On a pu manquer des messages pendant la coupure : on resynchronise l'historique.
      fetchHistory(roomId).then((history) => {
        if (active) setMessages(history);
      });
    }
    socket.emit(joinEvent, { [roomKey]: roomId });
    socket.on('connect', join);

    function onMessage(message: ChatMessage) {
      if (message.conversationId && active) {
        setMessages((prev) => (prev ? [...prev, message] : [message]));
      }
    }
    socket.on(messageEvent, onMessage);

    function onMessageUpdated(message: ChatMessage) {
      if (active) {
        setMessages((prev) => prev?.map((m) => (m.id === message.id ? message : m)) ?? prev);
      }
    }
    socket.on('message:updated', onMessageUpdated);

    function onMessageDeleted(data: { id: string }) {
      if (active) {
        setMessages((prev) => prev?.filter((m) => m.id !== data.id) ?? prev);
      }
    }
    socket.on('message:deleted', onMessageDeleted);

    return () => {
      active = false;
      socket.emit(leaveEvent, { [roomKey]: roomId });
      socket.off('connect', join);
      socket.off(messageEvent, onMessage);
      socket.off('message:updated', onMessageUpdated);
      socket.off('message:deleted', onMessageDeleted);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage() {
    const contenu = draft.trim();
    if (!contenu) return;
    getSocket().emit(messageEvent, { [roomKey]: roomId, contenu });
    setDraft('');
  }

  function handleSend(event: FormEvent) {
    event.preventDefault();
    sendMessage();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function startEdit(message: ChatMessage) {
    setEditingId(message.id);
    setEditDraft(message.contenu ?? '');
  }

  function saveEdit(messageId: string) {
    const contenu = editDraft.trim();
    if (!contenu) return;
    getSocket().emit('message:edit', { messageId, contenu });
    setEditingId(null);
  }

  async function handleDelete(messageId: string) {
    const ok = await confirmDialog({
      title: 'Delete this message?',
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (ok) getSocket().emit('message:delete', { messageId });
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      await uploadFile(roomId, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <Card className="flex h-[520px] flex-col">
      <div className="mb-4">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {messages === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet — say hello.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => {
              const mine = m.auteurId === user?.id;
              const isEditing = editingId === m.id;
              return (
                <div
                  key={m.id}
                  className={`group flex items-start gap-2 ${mine ? 'flex-row-reverse text-right' : ''}`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white">
                    {initials(m.auteur.nom)}
                  </span>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-brand-blue text-white' : 'bg-surface-muted text-foreground'}`}>
                    {!mine && <p className="mb-0.5 text-xs font-semibold text-muted-foreground">{m.auteur.nom}</p>}
                    {isEditing ? (
                      <div className="flex flex-col gap-1.5">
                        <textarea
                          autoFocus
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              saveEdit(m.id);
                            }
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          rows={2}
                          className="min-w-56 resize-none rounded-lg border border-white/30 bg-white/10 px-2 py-1 text-sm text-inherit outline-none"
                        />
                        <div className="flex gap-1.5 text-right">
                          <button
                            onClick={() => saveEdit(m.id)}
                            className="rounded px-2 py-0.5 text-xs font-medium underline"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded px-2 py-0.5 text-xs underline"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {m.contenu && <p className="whitespace-pre-wrap break-words">{m.contenu}</p>}
                        <Attachment message={m} />
                        <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-muted-foreground'}`}>
                          {formatTime(m.createdAt)}
                          {m.edited && ' · edited'}
                        </p>
                      </>
                    )}
                  </div>
                  {mine && !isEditing && (
                    <div className="flex shrink-0 items-center gap-1 self-center opacity-0 transition-opacity group-hover:opacity-100">
                      {m.contenu && (
                        <button
                          onClick={() => startEdit(m)}
                          aria-label="Edit message"
                          className="rounded px-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          ✎
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(m.id)}
                        aria-label="Delete message"
                        className="rounded px-1 text-xs text-muted-foreground hover:text-status-review"
                      >
                        🗑
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-status-review">{error}</p>}

      <form onSubmit={handleSend} className="mt-4 flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach a file"
        >
          {uploading ? '…' : '📎'}
        </Button>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message… (Shift+Enter for a new line)"
          rows={1}
          className="max-h-40 min-h-10 flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
        />
        <Button type="submit" disabled={!draft.trim()}>
          Send
        </Button>
      </form>
    </Card>
  );
}
