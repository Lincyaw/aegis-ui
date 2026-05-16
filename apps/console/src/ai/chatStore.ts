import { useSyncExternalStore } from 'react';

import type { AgentMessage } from '@lincyaw/aegis-ui';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  lastActiveAt: number;
}

interface ChatStoreState {
  sessions: ChatSession[];
  currentId: string | null;
}

const CHATS_KEY = 'aegis.agentm.chats.v1';
const MESSAGES_KEY_PREFIX = 'aegis.agentm.messages.v1:';
const DEFAULT_TITLE = '新对话';

function newId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readChats(): ChatStoreState {
  if (typeof window === 'undefined') {
    return { sessions: [], currentId: null };
  }
  try {
    const raw = window.localStorage.getItem(CHATS_KEY);
    if (!raw) {
      return { sessions: [], currentId: null };
    }
    const parsed = JSON.parse(raw) as Partial<ChatStoreState>;
    const sessions = Array.isArray(parsed.sessions)
      ? parsed.sessions.filter(isChatSession)
      : [];
    const currentId =
      typeof parsed.currentId === 'string' &&
      sessions.some((s) => s.id === parsed.currentId)
        ? parsed.currentId
        : (sessions[0]?.id ?? null);
    return { sessions, currentId };
  } catch {
    return { sessions: [], currentId: null };
  }
}

function isChatSession(value: unknown): value is ChatSession {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.createdAt === 'number' &&
    typeof v.lastActiveAt === 'number'
  );
}

function writeChats(state: ChatStoreState): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(CHATS_KEY, JSON.stringify(state));
  } catch {
    // Why: localStorage may be unavailable / quota-exceeded in some sandboxes.
  }
}

function messagesKey(chatId: string): string {
  return `${MESSAGES_KEY_PREFIX}${chatId}`;
}

export function loadMessages(chatId: string): AgentMessage[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(messagesKey(chatId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (m): m is AgentMessage =>
        typeof m === 'object' &&
        m !== null &&
        typeof (m as AgentMessage).id === 'string' &&
        typeof (m as AgentMessage).role === 'string' &&
        typeof (m as AgentMessage).content === 'string'
    );
  } catch {
    return [];
  }
}

export function saveMessages(chatId: string, messages: AgentMessage[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(messagesKey(chatId), JSON.stringify(messages));
  } catch {
    // Why: best-effort persistence — see writeChats.
  }
}

function removeMessages(chatId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.removeItem(messagesKey(chatId));
  } catch {
    // Why: best-effort cleanup.
  }
}

// ── Module-scoped store ──────────────────────────────────────────────
let state: ChatStoreState = readChats();
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) {
    l();
  }
}

function setState(next: ChatStoreState): void {
  state = next;
  writeChats(state);
  emit();
}

function ensureCurrent(): ChatStoreState {
  return ensureCurrentFrom(state);
}

function sortedSessions(s: ChatSession[]): ChatSession[] {
  return [...s].sort((a, b) => b.lastActiveAt - a.lastActiveAt);
}

// Hydrate immediately so the first useSyncExternalStore snapshot is stable.
const hydrated = ensureCurrent();
if (hydrated !== state) {
  setState(hydrated);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== CHATS_KEY) {
      return;
    }
    const next = ensureCurrentFrom(readChats());
    state = next;
    emit();
  });
}

function ensureCurrentFrom(s: ChatStoreState): ChatStoreState {
  if (s.currentId && s.sessions.some((x) => x.id === s.currentId)) {
    return s;
  }
  const first = s.sessions[0];
  if (first) {
    return { ...s, currentId: first.id };
  }
  const now = Date.now();
  const session: ChatSession = {
    id: newId(),
    title: DEFAULT_TITLE,
    createdAt: now,
    lastActiveAt: now,
  };
  return { sessions: [session], currentId: session.id };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ChatStoreState {
  return state;
}

// ── Public actions ───────────────────────────────────────────────────
function createChat(): ChatSession {
  const now = Date.now();
  const session: ChatSession = {
    id: newId(),
    title: DEFAULT_TITLE,
    createdAt: now,
    lastActiveAt: now,
  };
  setState({
    sessions: [...state.sessions, session],
    currentId: session.id,
  });
  return session;
}

function switchChat(id: string): void {
  if (!state.sessions.some((s) => s.id === id)) {
    return;
  }
  setState({
    sessions: state.sessions.map((s) =>
      s.id === id ? { ...s, lastActiveAt: Date.now() } : s
    ),
    currentId: id,
  });
}

function renameChat(id: string, title: string): void {
  const trimmed = title.trim();
  if (!trimmed) {
    return;
  }
  setState({
    ...state,
    sessions: state.sessions.map((s) =>
      s.id === id ? { ...s, title: trimmed } : s
    ),
  });
}

function deleteChat(id: string): void {
  removeMessages(id);
  const remaining = state.sessions.filter((s) => s.id !== id);
  const first = remaining[0];
  if (!first) {
    const now = Date.now();
    const fresh: ChatSession = {
      id: newId(),
      title: DEFAULT_TITLE,
      createdAt: now,
      lastActiveAt: now,
    };
    setState({ sessions: [fresh], currentId: fresh.id });
    return;
  }
  const nextCurrent = state.currentId === id ? first.id : state.currentId;
  setState({ sessions: remaining, currentId: nextCurrent });
}

function maybeAutoTitle(chatId: string, firstUserMessage: string): void {
  const target = state.sessions.find((s) => s.id === chatId);
  if (!target || target.title !== DEFAULT_TITLE) {
    return;
  }
  const cleaned = firstUserMessage.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return;
  }
  const next = cleaned.length > 40 ? `${cleaned.slice(0, 40)}…` : cleaned;
  setState({
    ...state,
    sessions: state.sessions.map((s) =>
      s.id === chatId ? { ...s, title: next, lastActiveAt: Date.now() } : s
    ),
  });
}

function touchActive(chatId: string): void {
  const target = state.sessions.find((s) => s.id === chatId);
  if (!target) {
    return;
  }
  setState({
    ...state,
    sessions: state.sessions.map((s) =>
      s.id === chatId ? { ...s, lastActiveAt: Date.now() } : s
    ),
  });
}

// ── Hook ─────────────────────────────────────────────────────────────
export interface UseChatStoreResult {
  sessions: ChatSession[];
  currentId: string;
  currentChat: ChatSession;
  createChat: () => ChatSession;
  switchChat: (id: string) => void;
  renameChat: (id: string, title: string) => void;
  deleteChat: (id: string) => void;
  loadMessages: (chatId: string) => AgentMessage[];
  saveMessages: (chatId: string, messages: AgentMessage[]) => void;
  maybeAutoTitle: (chatId: string, firstUserMessage: string) => void;
  touchActive: (chatId: string) => void;
}

export function useChatStore(): UseChatStoreResult {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const sorted = sortedSessions(snapshot.sessions);
  // ensureCurrent() ran at module init, so sorted is guaranteed non-empty.
  const fallback = sorted[0];
  if (!fallback) {
    throw new Error(
      'aegis chat store: no session available — invariant broken'
    );
  }
  const currentId = snapshot.currentId ?? fallback.id;
  const currentChat =
    snapshot.sessions.find((s) => s.id === currentId) ?? fallback;
  return {
    sessions: sorted,
    currentId,
    currentChat,
    createChat,
    switchChat,
    renameChat,
    deleteChat,
    loadMessages,
    saveMessages,
    maybeAutoTitle,
    touchActive,
  };
}
