"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export function CenterModal({
  open,
  onClose,
  labelledBy,
  children,
  className = "max-w-xl",
  placement = "sheet",
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  className?: string;
  placement?: "sheet" | "center";
}) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [layerReady, setLayerReady] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    const node = document.createElement("div");
    node.dataset.modalRoot = "";
    document.body.appendChild(node);
    setHost(node);
    return () => {
      node.remove();
      setHost(null);
    };
  }, []);

  useEffect(() => {
    if (!host) return;
    if (open) {
      host.style.position = "fixed";
      host.style.inset = "0";
      host.style.zIndex = "1000";
      host.style.pointerEvents = "auto";
    } else {
      host.style.position = "";
      host.style.inset = "";
      host.style.zIndex = "";
      host.style.pointerEvents = "none";
    }
  }, [host, open]);

  useEffect(() => {
    if (!open) {
      setLayerReady(false);
      return;
    }
    const enable = window.setTimeout(() => setLayerReady(true), 400);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(enable);
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open || !host) return null;

  return createPortal(
    <div
      className={
        placement === "center"
          ? "flex h-full w-full items-center justify-center p-4"
          : "flex h-full w-full items-end justify-center p-0 sm:items-center sm:p-8"
      }
      role="presentation"
    >
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-navy/70 ${layerReady ? "" : "pointer-events-none"}`}
        onClick={() => onCloseRef.current()}
      />
      <div
        aria-labelledby={labelledBy}
        aria-modal="true"
        className={cn(
          "anim-pop relative z-10 max-h-[min(92dvh,100%)] w-full overscroll-contain bg-white shadow-[0_24px_80px_rgba(31,41,51,0.28)] ring-1 ring-slate-200",
          placement === "center"
            ? "rounded-3xl sm:max-h-[min(88vh,44rem)]"
            : "rounded-t-3xl pb-[env(safe-area-inset-bottom,0px)] sm:max-h-[min(88vh,44rem)] sm:rounded-3xl",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        {children}
      </div>
    </div>,
    host,
  );
}
