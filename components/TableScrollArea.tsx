"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wraps a wide table with a synced scrollbar above it, not just below — the table can run to
 * hundreds of rows, so the bottom (native) scrollbar is often off-screen when a wide table needs
 * horizontal scrolling.
 */
export function TableScrollArea({ children }: { children: React.ReactNode }) {
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const syncingFrom = useRef<"top" | "bottom" | null>(null);
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    const bottom = bottomRef.current;
    if (!bottom) return;
    const update = () => setContentWidth(bottom.scrollWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bottom);
    return () => observer.disconnect();
  }, []);

  function handleTopScroll(e: React.UIEvent<HTMLDivElement>) {
    if (syncingFrom.current === "bottom") return;
    syncingFrom.current = "top";
    if (bottomRef.current) bottomRef.current.scrollLeft = e.currentTarget.scrollLeft;
    syncingFrom.current = null;
  }

  function handleBottomScroll(e: React.UIEvent<HTMLDivElement>) {
    if (syncingFrom.current === "top") return;
    syncingFrom.current = "bottom";
    if (topRef.current) topRef.current.scrollLeft = e.currentTarget.scrollLeft;
    syncingFrom.current = null;
  }

  return (
    <div>
      <div ref={topRef} onScroll={handleTopScroll} className="overflow-x-auto overflow-y-hidden">
        <div style={{ width: contentWidth, height: 1 }} />
      </div>
      <div ref={bottomRef} onScroll={handleBottomScroll} className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}
