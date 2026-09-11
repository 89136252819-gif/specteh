"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Globe,
  Play,
  Square,
  Wallet,
  XCircle,
} from "lucide-react";
import { archiveNotifications, markNotificationsRead, markOneRead } from "@/actions/notifications";
import { formatNoticeWhen, noticeHref, type StaffNotice } from "@/lib/notification-ui";
import { cn } from "@/lib/utils";

const POLL_MS = 20_000;

function TypeIcon({ type }: { type: string }) {
  const className = "h-4 w-4";
  if (type === "DRIVER_ACCEPTED") return <CheckCircle2 className={`${className} text-emerald-600`} />;
  if (type === "DRIVER_DECLINED") return <XCircle className={`${className} text-rose-600`} />;
  if (type === "REPORT_SUBMITTED") return <ClipboardCheck className={`${className} text-violet-600`} />;
  if (type === "SHIFT_STARTED") return <Play className={`${className} text-menu-hover`} />;
  if (type === "SHIFT_ENDED") return <Square className={`${className} text-slate-500`} />;
  if (type === "PAYMENT") return <Wallet className={`${className} text-amber-600`} />;
  if (type === "PUBLIC_ORDER") return <Globe className={`${className} text-sky-600`} />;
  return <Bell className={`${className} text-slate-400`} />;
}

const FILTERS = [
  { id: "all", label: "Все" },
  { id: "DRIVER_DECLINED", label: "Отказы" },
  { id: "PUBLIC_ORDER", label: "Сайт" },
  { id: "PAYMENT", label: "Оплаты" },
  { id: "REPORT_SUBMITTED", label: "Отчёты" },
] as const;

export function NotificationsBell({ items }: { items: StaffNotice[] }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(items);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [unread, setUnread] = useState(() => items.filter((item) => !item.read).length);
  const [pending, start] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const visible = useMemo(
    () => (filter === "all" ? list : list.filter((item) => item.type === filter)),
    [list, filter],
  );

  useEffect(() => {
    setList(items);
    setUnread(items.filter((item) => !item.read).length);
  }, [items]);

  useEffect(() => {
    let timer = 0;
    async function pull() {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/staff/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { items?: StaffNotice[]; unreadCount?: number };
        if (Array.isArray(data.items)) setList(data.items);
        if (typeof data.unreadCount === "number") setUnread(data.unreadCount);
      } catch {
        /* сеть могла моргнуть */
      }
    }
    function loop() {
      timer = window.setTimeout(() => {
        void pull().finally(loop);
      }, POLL_MS);
    }
    void pull();
    loop();
    function onVisible() {
      if (!document.hidden) void pull();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: globalThis.MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function markAll() {
    setList((current) => current.map((item) => ({ ...item, read: true })));
    setUnread(0);
    start(() => {
      void markNotificationsRead();
    });
  }

  function archiveRead() {
    const ids = list.filter((item) => item.read).map((item) => item.id);
    setList((current) => current.filter((item) => !item.read));
    start(() => {
      void archiveNotifications(ids);
    });
  }

  function openItem(item: StaffNotice, event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (!item.read) {
      setList((current) => current.map((row) => (row.id === item.id ? { ...row, read: true } : row)));
      setUnread((count) => Math.max(0, count - 1));
      void markOneRead(item.id);
    }
    setOpen(false);
    router.push(noticeHref(item));
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unread ? `Уведомления, ${unread} новых` : "Уведомления"}
        className="relative rounded-full bg-white p-2 text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-menu-soft hover:text-menu-hover active:scale-95"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="pulse-live absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-menu px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          className="anim-pop fixed left-3 right-3 top-[4.75rem] z-50 overflow-hidden rounded-3xl border border-white bg-white shadow-[0_20px_50px_rgba(31,41,51,0.16)] ring-1 ring-slate-200/70 sm:left-auto sm:right-6 sm:w-[min(24rem,calc(100vw-2rem))] lg:right-8"
          role="dialog"
          aria-label="Уведомления"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <div className="text-sm font-bold text-navy">Уведомления</div>
              <div className="text-[11px] text-slate-400">{unread ? `${unread} новых` : "Все прочитаны"}</div>
            </div>
            <div className="flex items-center gap-2">
              {list.some((item) => item.read) ? (
                <button
                  className="text-xs font-semibold text-slate-400 hover:text-navy disabled:opacity-50"
                  disabled={pending}
                  onClick={archiveRead}
                  type="button"
                >
                  В архив
                </button>
              ) : null}
              {unread > 0 ? (
                <button
                  className="text-xs font-semibold text-menu-hover disabled:opacity-50"
                  disabled={pending}
                  onClick={markAll}
                  type="button"
                >
                  Прочитать все
                </button>
              ) : null}
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 py-2">
            {FILTERS.map((item) => (
              <button
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
                  filter === item.id ? "bg-navy text-white" : "bg-slate-100 text-slate-600",
                )}
                key={item.id}
                onClick={() => setFilter(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {visible.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-400">Пока тишина — события появятся здесь</p>
            ) : (
              visible.map((item) => (
                <Link
                  key={item.id}
                  className={cn(
                    "flex gap-3 border-b border-slate-50 px-4 py-3 last:border-0 hover:bg-menu-soft/50",
                    item.type === "DRIVER_DECLINED" ? "bg-rose-50/80" : item.read ? "opacity-70" : "bg-menu-soft/25",
                  )}
                  href={noticeHref(item)}
                  onClick={(event) => openItem(item, event)}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl ring-1",
                      item.type === "DRIVER_DECLINED" ? "bg-rose-100 ring-rose-200" : "bg-slate-50 ring-slate-100",
                    )}
                  >
                    <TypeIcon type={item.type} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          item.type === "DRIVER_DECLINED" ? "text-rose-800" : "text-navy",
                        )}
                      >
                        {item.title}
                      </span>
                      {!item.read ? <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-menu" /> : null}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-slate-500">{item.body}</span>
                    <span className="mt-1 block text-[11px] text-slate-400">{formatNoticeWhen(item.createdAt)}</span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
