"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { CenterModal } from "@/components/center-modal";

export function RecordEditorModal({
  open,
  onClose,
  title,
  subtitle,
  error,
  labelledBy,
  children,
  className = "max-w-2xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  error?: string;
  labelledBy: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <CenterModal className={className} labelledBy={labelledBy} onClose={onClose} open={open}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
        <div className="min-w-0">
          <h3 className="font-extrabold text-navy" id={labelledBy}>
            {title}
          </h3>
          {subtitle ? <p className="mt-1 text-sm leading-relaxed text-slate-500">{subtitle}</p> : null}
        </div>
        <button
          className="rounded-full p-1.5 text-slate-400 hover:bg-slate-50 hover:text-navy"
          onClick={onClose}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-[min(36rem,75vh)] overflow-y-auto px-6 py-5">
        {error ? (
          <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950 ring-1 ring-amber-200">
            {error}
          </p>
        ) : null}
        {children}
      </div>
    </CenterModal>
  );
}
