/**
 * Tiny shortcut helper — parses 'mod+shift+p'-style bindings, matches
 * KeyboardEvents, and formats for display.
 *
 * 'mod' resolves to ⌘ on macOS and Ctrl elsewhere. Single-character
 * keys are matched case-insensitively against `event.key`.
 */

interface ParsedBinding {
  mod: boolean;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
}

function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
}

function parseBinding(binding: string): ParsedBinding {
  const parts = binding
    .toLowerCase()
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean);
  const result: ParsedBinding = {
    mod: false,
    ctrl: false,
    shift: false,
    alt: false,
    key: '',
  };
  for (const part of parts) {
    switch (part) {
      case 'mod':
      case 'cmd':
      case 'meta':
        result.mod = true;
        break;
      case 'ctrl':
      case 'control':
        result.ctrl = true;
        break;
      case 'shift':
        result.shift = true;
        break;
      case 'alt':
      case 'option':
        result.alt = true;
        break;
      default:
        result.key = part;
    }
  }
  return result;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  return target.isContentEditable;
}

export function matchShortcut(event: KeyboardEvent, binding: string): boolean {
  const parsed = parseBinding(binding);
  if (!parsed.key) {
    return false;
  }

  if (parsed.mod) {
    const isMac = isMacPlatform();
    const modPressed = isMac ? event.metaKey : event.ctrlKey;
    if (!modPressed) {
      return false;
    }
  } else {
    if (isEditableTarget(event.target)) {
      return false;
    }
    if (event.metaKey || event.ctrlKey) {
      return false;
    }
  }

  if (parsed.ctrl && !event.ctrlKey) {
    return false;
  }
  if (parsed.shift !== event.shiftKey) {
    return false;
  }
  if (parsed.alt !== event.altKey) {
    return false;
  }

  return event.key.toLowerCase() === parsed.key;
}

export function formatShortcut(binding: string): string {
  const parsed = parseBinding(binding);
  const isMac = isMacPlatform();
  const tokens: string[] = [];
  if (parsed.mod) {
    tokens.push(isMac ? '⌘' : 'Ctrl');
  }
  if (parsed.ctrl) {
    tokens.push(isMac ? '⌃' : 'Ctrl');
  }
  if (parsed.alt) {
    tokens.push(isMac ? '⌥' : 'Alt');
  }
  if (parsed.shift) {
    tokens.push(isMac ? '⇧' : 'Shift');
  }
  if (parsed.key) {
    tokens.push(
      parsed.key.length === 1 ? parsed.key.toUpperCase() : parsed.key,
    );
  }
  return isMac ? tokens.join('') : tokens.join('+');
}
