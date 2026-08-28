'use client';

import { Loading } from '@/components/ui/loading';

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { DownloadIcon, PaperclipIcon, PaperPlaneIcon, SmileyIcon } from '@/components/icons/office-icons';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { downloadFileViaApi, resolveAssetUrl, type ChatMessage } from '@/lib/api';
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

// Palette stable par utilisateur (comme WhatsApp en groupe) — dérivée de son id,
// donc toujours la même couleur pour une même personne, sans état à synchroniser.
const USER_COLORS = [
  '#e11d48', '#ea580c', '#ca8a04', '#16a34a', '#059669',
  '#0891b2', '#2563eb', '#7c3aed', '#c026d3', '#db2777',
];

function colorForUser(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return USER_COLORS[hash % USER_COLORS.length];
}

// Sélection restreinte à des émojis modernes et sobres (pas de doublons datés) —
// pas de librairie externe, ce sont de simples glyphes Unicode rendus par l'OS.
const EMOJI_LIST = [
  '😀', '😁', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😜',
  '🤔', '😎', '🥳', '😴', '😭', '😢', '😅', '😬', '🙄', '😳', '🤯', '🥺',
  '😡', '😱', '🤗', '🤝', '👍', '👎', '👏', '🙏', '💪', '🔥', '✨', '🎉',
  '❤️', '💙', '💚', '💛', '💜', '🖤', '🤍', '💯', '✅', '❌', '⚠️', '👀',
];

function quotePreview(message: { contenu: string | null; fichierNom: string | null }) {
  if (message.contenu) return message.contenu;
  if (message.fichierNom) return `📎 ${message.fichierNom}`;
  return '…';
}

async function downloadFile(url: string, filename: string) {
  try {
    await downloadFileViaApi(url, filename);
  } catch {
    window.open(url, '_blank');
  }
}

function ImageLightbox({ url, filename, onClose }: { url: string; filename: string; onClose: () => void }) {
  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={filename} className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
        <div className="absolute right-2 top-2 flex gap-2">
          <button
            onClick={() => downloadFile(url, filename)}
            aria-label="Download image"
            title="Download image"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <DownloadIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function Attachment({ message }: { message: ChatMessage }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const url = resolveAssetUrl(message.fichierUrl);
  if (!url) return null;
  const isImage = message.fichierType?.startsWith('image/');
  const filename = message.fichierNom ?? 'file';

  if (isImage) {
    return (
      <>
        <button type="button" onClick={() => setLightboxOpen(true)} className="mt-1 block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={filename} className="max-h-48 rounded-lg object-cover" />
        </button>
        {lightboxOpen && (
          <ImageLightbox url={url} filename={filename} onClose={() => setLightboxOpen(false)} />
        )}
      </>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-2 rounded-lg border border-current/15 bg-black/5 px-2.5 py-2 text-xs">
      <PaperclipIcon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{filename}</span>
      {message.fichierTailleOctets != null && (
        <span className="shrink-0 opacity-70">{formatFileSize(message.fichierTailleOctets)}</span>
      )}
      <button
        type="button"
        onClick={() => downloadFile(url, filename)}
        aria-label="Download file"
        title="Download file"
        className="shrink-0 opacity-80 hover:opacity-100"
      >
        <DownloadIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export interface ChatProps {
  roomId: string;
  roomKey: 'bureauId' | 'subjectId' | 'conversationId';
  joinEvent: string;
  leaveEvent: string;
  messageEvent: string;
  fetchHistory: (roomId: string) => Promise<ChatMessage[]>;
  uploadFile: (roomId: string, file: File, contenu?: string, replyToId?: string) => Promise<ChatMessage>;
  title: ReactNode;
  description: string;
  /** Personnes qu'on peut @mentionner ici — omis pour un chat sans notion d'équipe (DM, organizer perso). */
  mentionableUsers?: { id: string; nom: string }[];
  /** Couleur de l'office appliquée aux bulles "mine" — omis pour un bleu générique (DM, organizer perso). */
  accentColor?: { bubble: string; bubbleDark: string };
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
  mentionableUsers = [],
  accentColor,
}: ChatProps) {
  const bubbleClass = accentColor?.bubble ?? 'bg-brand-blue';
  const bubbleDarkClass = accentColor?.bubbleDark ?? 'bg-brand-blue-dark';
  const { user } = useAuth();
  const confirmDialog = useConfirm();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [draft, setDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Zone de texte extensible façon WhatsApp : grandit avec le contenu jusqu'à un plafond,
  // au-delà duquel elle défile en interne (voir max-h sur le textarea plus bas).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  // Prévisualisation locale du fichier en attente d'envoi (image uniquement).
  const pendingPreviewUrl = useMemo(
    () => (pendingFile?.type.startsWith('image/') ? URL.createObjectURL(pendingFile) : null),
    [pendingFile],
  );
  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  const mentionMatches =
    mentionQuery === null
      ? []
      : mentionableUsers.filter((u) => u.nom.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6);

  function mentionedUserIdsIn(text: string) {
    return mentionableUsers.filter((u) => text.includes(`@${u.nom}`)).map((u) => u.id);
  }

  function renderWithMentions(text: string, mine: boolean) {
    const names = mentionableUsers.map((u) => u.nom).filter(Boolean);
    if (names.length === 0) return text;
    const pattern = new RegExp(`(@(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}))`, 'g');
    return text.split(pattern).map((part, i) => {
      const nom = part.startsWith('@') ? part.slice(1) : null;
      const match = nom ? mentionableUsers.find((u) => u.nom === nom) : null;
      if (!match) return part;
      return (
        <span
          key={i}
          className="rounded px-1 font-semibold"
          style={{
            backgroundColor: mine ? 'rgba(255,255,255,0.25)' : `${colorForUser(match.id)}26`,
            color: mine ? '#fff' : colorForUser(match.id),
          }}
        >
          {part}
        </span>
      );
    });
  }

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

  async function sendMessage() {
    const contenu = draft.trim();
    if (pendingFile) {
      const file = pendingFile;
      setError(null);
      setUploading(true);
      try {
        await uploadFile(roomId, file, contenu || undefined, replyingTo?.id);
        setPendingFile(null);
        setDraft('');
        setReplyingTo(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
      return;
    }
    if (!contenu) return;
    getSocket().emit(messageEvent, {
      [roomKey]: roomId,
      contenu,
      replyToId: replyingTo?.id,
      mentionedUserIds: mentionedUserIdsIn(contenu),
    });
    setDraft('');
    setReplyingTo(null);
  }

  function handleSend(event: FormEvent) {
    event.preventDefault();
    sendMessage();
  }

  function handleDraftChange(value: string) {
    setDraft(value);
    // Suggestions déclenchées par un "@" suivi d'un mot en cours de frappe, en fin de texte.
    const match = /(?:^|\s)@(\w*)$/.exec(value);
    setMentionQuery(match && mentionableUsers.length > 0 ? match[1] : null);
  }

  function selectMention(nom: string) {
    setDraft((prev) => prev.replace(/(?:^|\s)@(\w*)$/, (whole) => `${whole[0] === '@' ? '' : whole[0]}@${nom} `));
    setMentionQuery(null);
    textareaRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery !== null && mentionMatches.length > 0 && (event.key === 'Enter' || event.key === 'Tab')) {
      event.preventDefault();
      selectMention(mentionMatches[0].nom);
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
    if (event.key === 'Escape') {
      if (mentionQuery !== null) setMentionQuery(null);
      else if (showEmojiPicker) setShowEmojiPicker(false);
      else if (replyingTo) setReplyingTo(null);
    }
  }

  function startReply(message: ChatMessage) {
    setReplyingTo(message);
    textareaRef.current?.focus();
  }

  function jumpToMessage(messageId: string) {
    const el = document.getElementById(`msg-${messageId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedId(messageId);
    setTimeout(() => setHighlightedId((current) => (current === messageId ? null : current)), 1500);
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

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setPendingFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function cancelPendingFile() {
    setPendingFile(null);
  }

  function insertEmoji(emoji: string) {
    const el = textareaRef.current;
    if (!el) {
      setDraft((prev) => prev + emoji);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    setDraft(draft.slice(0, start) + emoji + draft.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + emoji.length;
    });
  }

  return (
    <Card className="flex h-[520px] flex-col">
      <div className="mb-4">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {messages === null ? (
          <Loading className="text-sm" />
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet - say hello.</p>
        ) : (
          <div className="flex flex-col">
            {messages.map((m, index) => {
              const mine = m.auteurId === user?.id;
              const isEditing = editingId === m.id;
              const prev = messages[index - 1];
              // Regroupe les messages consécutifs d'une même personne (< 3 min d'écart) :
              // moins de répétition visuelle d'avatar/nom, comme WhatsApp/iMessage.
              const grouped =
                !!prev &&
                prev.auteurId === m.auteurId &&
                new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 3 * 60 * 1000;
              const color = colorForUser(m.auteurId);
              const highlighted = highlightedId === m.id;

              return (
                <div
                  key={m.id}
                  id={`msg-${m.id}`}
                  className={`group flex items-start gap-2 rounded-lg text-left transition-colors ${mine ? 'flex-row-reverse' : ''} ${grouped ? 'mt-0.5' : 'mt-3'} ${highlighted ? 'bg-brand-blue/10' : ''}`}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: grouped ? 'transparent' : color }}
                  >
                    {!grouped && initials(m.auteur.nom)}
                  </span>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? `${bubbleClass} text-white` : 'bg-surface-muted text-foreground'}`}>
                    {!mine && !grouped && (
                      <p className="mb-0.5 text-xs font-semibold" style={{ color }}>
                        {m.auteur.nom}
                      </p>
                    )}
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
                        {m.replyTo && (
                          <button
                            onClick={() => jumpToMessage(m.replyTo!.id)}
                            style={{ borderLeftColor: colorForUser(m.replyTo.auteur.id) }}
                            className={`mb-1.5 block w-full rounded-lg border-l-4 px-2 py-1.5 text-left text-xs ${mine ? `${bubbleDarkClass} text-white` : 'bg-black/10 text-muted-foreground'}`}
                          >
                            <span className="block font-semibold" style={{ color: mine ? '#fff' : colorForUser(m.replyTo.auteur.id) }}>
                              {m.replyTo.auteur.nom}
                            </span>
                            <span className={`line-clamp-1 ${mine ? 'text-white/85' : ''}`}>{quotePreview(m.replyTo)}</span>
                          </button>
                        )}
                        {m.contenu && (
                          <p className="whitespace-pre-wrap break-words">{renderWithMentions(m.contenu, mine)}</p>
                        )}
                        <Attachment message={m} />
                        <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-muted-foreground'}`}>
                          {formatTime(m.createdAt)}
                          {m.edited && ' · edited'}
                        </p>
                      </>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex shrink-0 items-center gap-1 self-center opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => startReply(m)}
                        aria-label="Reply"
                        className="rounded px-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        ↩
                      </button>
                      {mine && m.contenu && (
                        <button
                          onClick={() => startEdit(m)}
                          aria-label="Edit message"
                          className="rounded px-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          ✎
                        </button>
                      )}
                      {mine && (
                        <button
                          onClick={() => handleDelete(m.id)}
                          aria-label="Delete message"
                          className="rounded px-1 text-xs text-muted-foreground hover:text-status-review"
                        >
                          🗑
                        </button>
                      )}
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

      {replyingTo && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border-l-2 border-brand-blue bg-surface-muted px-3 py-1.5 text-xs">
          <div className="min-w-0">
            <span className="font-semibold" style={{ color: colorForUser(replyingTo.auteurId) }}>
              Replying to {replyingTo.auteur.nom}
            </span>
            <p className="truncate text-muted-foreground">{quotePreview(replyingTo)}</p>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            aria-label="Cancel reply"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      )}

      {pendingFile && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border-l-2 border-brand-blue bg-surface-muted px-3 py-1.5 text-xs">
          {pendingPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pendingPreviewUrl} alt={pendingFile.name} className="h-10 w-10 shrink-0 rounded object-cover" />
          ) : (
            <PaperclipIcon className="h-4 w-4 shrink-0" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{pendingFile.name}</p>
            <p className="text-muted-foreground">{formatFileSize(pendingFile.size)}</p>
          </div>
          <button
            type="button"
            onClick={cancelPendingFile}
            aria-label="Remove attachment"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSend} className={`relative ${replyingTo || pendingFile ? 'mt-2' : 'mt-4'} flex gap-2`}>
        {mentionQuery !== null && mentionMatches.length > 0 && (
          <div className="animate-fade-in-up absolute bottom-full left-11 z-10 mb-1 flex w-48 flex-col overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
            {mentionMatches.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => selectMention(u.nom)}
                className="px-3 py-1.5 text-left text-sm hover:bg-surface-muted"
              >
                <span className="font-medium" style={{ color: colorForUser(u.id) }}>
                  @{u.nom}
                </span>
              </button>
            ))}
          </div>
        )}
        {showEmojiPicker && (
          <div className="animate-fade-in-up absolute bottom-full right-0 z-10 mb-1 grid w-64 grid-cols-8 gap-1 rounded-lg border border-border bg-surface p-2 shadow-lg">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="rounded p-1 text-lg hover:bg-surface-muted"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
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
          size="sm"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach a file"
          title="Attach a file"
          className="shrink-0 !px-2.5"
        >
          <PaperclipIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setShowEmojiPicker((v) => !v)}
          aria-label="Insert an emoji"
          title="Insert an emoji"
          className="shrink-0 !px-2.5"
        >
          <SmileyIcon className="h-4 w-4" />
        </Button>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowEmojiPicker(false)}
          placeholder={mentionableUsers.length > 0 ? 'Write a message… (@ to mention)' : 'Write a message…'}
          rows={1}
          className="max-h-56 min-h-10 min-w-0 flex-1 resize-none overflow-y-auto rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
        />
        <Button
          type="submit"
          size="sm"
          disabled={uploading || (!draft.trim() && !pendingFile)}
          aria-label="Send message"
          title="Send message"
          className="shrink-0 !px-2.5"
        >
          {uploading ? '…' : <PaperPlaneIcon className="h-4 w-4" />}
        </Button>
      </form>
    </Card>
  );
}
