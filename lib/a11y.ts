'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';

// Open dialogs, innermost last: Escape closes only the top one, so a payment
// dialog opened over a bill detail doesn't take the detail down with it.
const escapeStack: { current: () => void }[] = [];

function handleEscape(e: globalThis.KeyboardEvent) {
  if (e.key !== 'Escape' || !escapeStack.length) return;
  escapeStack[escapeStack.length - 1].current();
}

/** Calls `onEscape` when Escape is pressed while this dialog is the topmost open one. */
export function useEscapeKey(onEscape: () => void, enabled = true) {
  const ref = useRef(onEscape);
  useEffect(() => {
    ref.current = onEscape;
  });

  useEffect(() => {
    if (!enabled) return;
    const entry = { current: () => ref.current() };
    escapeStack.push(entry);
    if (escapeStack.length === 1) window.addEventListener('keydown', handleEscape);
    return () => {
      escapeStack.splice(escapeStack.indexOf(entry), 1);
      if (!escapeStack.length) window.removeEventListener('keydown', handleEscape);
    };
  }, [enabled]);
}

/**
 * Props that make a non-button element (a card, a list row) work like a
 * button from the keyboard: focusable with Tab, activated with Enter/Space.
 */
export function pressable(onPress: () => void, label?: string) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': label,
    onClick: onPress,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onPress();
      }
    },
  };
}
