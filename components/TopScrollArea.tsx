"use client";

import { useEffect, useRef, useState } from "react";

export function TopScrollArea({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const syncingFrom = useRef<"top" | "bottom" | null>(null);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const update = () => setContentWidth(content.scrollWidth);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(content);
    return () => ro.disconnect();
  }, []);

  return (
    <div>
      <div
        ref={topRef}
        className="overflow-x-auto overflow-y-hidden"
        onScroll={(e) => {
          if (syncingFrom.current === "bottom") {
            syncingFrom.current = null;
            return;
          }
          syncingFrom.current = "top";
          if (bottomRef.current) bottomRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }}
      >
        <div style={{ width: contentWidth, height: 1 }} />
      </div>
      <div
        ref={bottomRef}
        className={className}
        onScroll={(e) => {
          if (syncingFrom.current === "top") {
            syncingFrom.current = null;
            return;
          }
          syncingFrom.current = "bottom";
          if (topRef.current) topRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }}
      >
        <div ref={contentRef}>{children}</div>
      </div>
    </div>
  );
}
