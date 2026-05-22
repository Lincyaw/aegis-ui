/**
 * Live Inspect Zustand store + ``useInspectStream`` hook.
 *
 * Owns one WebSocket at a time, parses frames with ``parseFrame``,
 * folds them via the pure ``reduce`` reducer (testable separately),
 * and exposes derived selectors the React tree needs.
 *
 * Reconnect policy: exponential backoff starting at 500ms, capped at
 * 5s, gives up after the cumulative backoff exceeds ~30s. The user can
 * always click "Reconnect" on the banner to reset and try again.
 */

import { create } from 'zustand';

import {
  emptyState,
  type Frame,
  type InspectState,
  parseFrame,
  reduce,
  type SessionNode,
  type TimelineItem,
} from '../protocol';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'replaying_backlog'
  | 'live'
  | 'closed'
  | 'error';

interface StoreState {
  url: string | null;
  status: ConnectionStatus;
  /** Human-friendly error or close reason. */
  errorMessage: string | null;
  /** Increments on each reconnect attempt (resets on manual ``connect``). */
  connectionAttempts: number;
  /** ms until next auto-reconnect, or null when not pending. */
  reconnectInMs: number | null;
  inspect: InspectState;
}

interface StoreActions {
  connect: (url: string) => void;
  disconnect: () => void;
  /** Cancel pending reconnect and stop further auto-reconnects. */
  giveUp: () => void;
}

type Store = StoreState & StoreActions;

const BACKOFF_START_MS = 500;
const BACKOFF_CAP_MS = 5000;
const BACKOFF_BUDGET_MS = 30_000;

// One-per-store mutable handles. Not part of the state object because
// changes to a WebSocket / timer don't need to trigger re-renders.
let activeSocket: WebSocket | null = null;
let backoffMs = BACKOFF_START_MS;
let cumulativeBackoffMs = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let countdownTimer: ReturnType<typeof setInterval> | null = null;
let currentUrl: string | null = null;
let giveUpFlag = false;

function clearTimers(): void {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (countdownTimer !== null) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function closeSocket(): void {
  if (activeSocket) {
    try {
      activeSocket.close();
    } catch {
      // ignore — best-effort
    }
    activeSocket = null;
  }
}

export const useInspectStore = create<Store>((set) => {
  function applyFrame(frame: Frame): void {
    set((s) => ({ inspect: reduce(s.inspect, frame) }));
    // Status transition: hello → replaying_backlog, backlog_done → live.
    if (frame.type === 'hello') {
      set({ status: 'replaying_backlog' });
    } else if (frame.type === 'backlog_done') {
      set({ status: 'live' });
    }
  }

  function scheduleReconnect(): void {
    if (giveUpFlag) {
      return;
    }
    if (cumulativeBackoffMs >= BACKOFF_BUDGET_MS) {
      set({
        status: 'error',
        errorMessage: `gave up after ${(cumulativeBackoffMs / 1000).toFixed(0)}s of reconnect attempts`,
        reconnectInMs: null,
      });
      return;
    }
    const delay = Math.min(backoffMs, BACKOFF_CAP_MS);
    cumulativeBackoffMs += delay;
    backoffMs = Math.min(backoffMs * 2, BACKOFF_CAP_MS);

    let remaining = delay;
    set({ reconnectInMs: remaining });
    countdownTimer = setInterval(() => {
      remaining -= 250;
      if (remaining <= 0) {
        if (countdownTimer !== null) {
          clearInterval(countdownTimer);
          countdownTimer = null;
        }
        return;
      }
      set({ reconnectInMs: remaining });
    }, 250);

    reconnectTimer = setTimeout(() => {
      if (countdownTimer !== null) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
      set({ reconnectInMs: null });
      if (currentUrl !== null) {
        openSocket(currentUrl);
      }
    }, delay);
  }

  function openSocket(url: string): void {
    clearTimers();
    closeSocket();
    set((s) => ({
      status: 'connecting',
      errorMessage: null,
      connectionAttempts: s.connectionAttempts + 1,
    }));

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      set({
        status: 'error',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      scheduleReconnect();
      return;
    }
    activeSocket = ws;

    ws.onopen = (): void => {
      // Server sends ``hello`` immediately — status flips to
      // ``replaying_backlog`` when we receive it. Until then we stay on
      // ``connecting`` so the banner reads honestly.
    };
    ws.onmessage = (ev: MessageEvent): void => {
      const data = typeof ev.data === 'string' ? ev.data : '';
      const frame = parseFrame(data);
      if (frame !== null) {
        applyFrame(frame);
      }
    };
    ws.onerror = (): void => {
      set({
        status: 'error',
        errorMessage: 'WebSocket error (see browser console)',
      });
    };
    ws.onclose = (ev: CloseEvent): void => {
      activeSocket = null;
      // ``1000`` = normal closure (we called ``.close()`` ourselves).
      if (ev.code === 1000 && giveUpFlag) {
        set({ status: 'closed' });
        return;
      }
      set({
        status: 'closed',
        errorMessage:
          ev.reason || `connection closed (code ${ev.code.toString()})`,
      });
      scheduleReconnect();
    };
  }

  return {
    url: null,
    status: 'disconnected',
    errorMessage: null,
    connectionAttempts: 0,
    reconnectInMs: null,
    inspect: emptyState(),

    connect: (url: string): void => {
      // Fresh connect — reset everything that's request-scoped.
      giveUpFlag = false;
      backoffMs = BACKOFF_START_MS;
      cumulativeBackoffMs = 0;
      currentUrl = url;
      set({
        url,
        connectionAttempts: 0,
        errorMessage: null,
        inspect: emptyState(),
      });
      openSocket(url);
    },

    disconnect: (): void => {
      giveUpFlag = true;
      clearTimers();
      closeSocket();
      currentUrl = null;
      set({
        url: null,
        status: 'disconnected',
        errorMessage: null,
        reconnectInMs: null,
        inspect: emptyState(),
      });
    },

    giveUp: (): void => {
      giveUpFlag = true;
      clearTimers();
      closeSocket();
      set({
        status: 'closed',
        reconnectInMs: null,
        errorMessage: 'reconnect cancelled by user',
      });
    },
  };
});

// ── Selectors ─────────────────────────────────────────────────────────

export function useSessionNode(sessionId: string | null): SessionNode | undefined {
  return useInspectStore((s) =>
    sessionId ? s.inspect.sessions.get(sessionId) : undefined,
  );
}

export function useSessionTimeline(sessionId: string | null): TimelineItem[] {
  return useInspectStore((s) =>
    sessionId ? (s.inspect.timelinesBySession.get(sessionId) ?? []) : [],
  );
}

export function useChildren(parentId: string | null): string[] {
  return useInspectStore((s) => s.inspect.childrenByParent.get(parentId) ?? []);
}

export function useRootSessionId(): string | null {
  return useInspectStore((s) => s.inspect.rootSessionId);
}
