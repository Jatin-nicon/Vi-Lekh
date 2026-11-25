"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/**
 * Full-screen reading. The whole document goes full screen (so toolbar menus,
 * which render into the body, stay visible) and the reader covers it. Where
 * the browser has no full-screen support (iPhone), the reader just covers the
 * window. Esc leaves; F toggles.
 *
 * `contentRef` is kept at the same relative scroll position across the switch.
 */
export function useFullscreen(
  scrollerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isOnRef = useRef(false);
  const ratioRef = useRef(0);

  const rememberPosition = useCallback(() => {
    const rect = contentRef.current?.getBoundingClientRect();
    ratioRef.current = rect && rect.height > 0 ? Math.max(0, -rect.top / rect.height) : 0;
  }, [contentRef]);

  const set = useCallback((on: boolean) => {
    if (isOnRef.current === on) return;
    isOnRef.current = on;
    setIsFullscreen(on);
  }, []);

  const toggle = useCallback(() => {
    rememberPosition();
    if (isOnRef.current) {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => set(false));
      else set(false);
      return;
    }
    set(true);
    // Optional call: unsupported on iPhone. A refusal still leaves the covering view.
    void document.documentElement.requestFullscreen?.()?.catch(() => {});
  }, [rememberPosition, set]);

  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement && isOnRef.current) {
        rememberPosition();
        set(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      const target = e.composedPath()[0];
      const typing =
        target instanceof HTMLElement && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable);
      // Browsers leave full screen on Esc themselves; this also covers the fallback.
      if (e.key === "Escape" && isOnRef.current) {
        toggle();
      } else if (e.key.toLowerCase() === "f" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      window.removeEventListener("keydown", onKey);
    };
  }, [rememberPosition, set, toggle]);

  // Leaving the note leaves full screen.
  useEffect(
    () => () => {
      if (isOnRef.current && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    },
    [],
  );

  useEffect(() => {
    if (isFullscreen) document.documentElement.style.overflow = "hidden";
    // Restore the position once the new scale has been laid out (the window
    // resizes a moment after the switch).
    const restore = () => {
      const content = contentRef.current;
      if (!content) return;
      const rect = content.getBoundingClientRect();
      const delta = rect.top + ratioRef.current * rect.height;
      if (isFullscreen) scrollerRef.current?.scrollBy(0, delta);
      else if (ratioRef.current > 0) window.scrollBy(0, delta);
    };
    const timers = ratioRef.current > 0 ? [60, 350].map((ms) => setTimeout(restore, ms)) : [];
    return () => {
      timers.forEach(clearTimeout);
      document.documentElement.style.overflow = "";
    };
  }, [isFullscreen, contentRef, scrollerRef]);

  return { isFullscreen, toggleFullscreen: toggle };
}
