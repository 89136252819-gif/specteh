"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Maximize2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DispatchToolbar({ kiosk }: { kiosk: boolean }) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    const isNarrow = typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
    const intervalMs = kiosk ? 20_000 : isNarrow ? 60_000 : 30_000;
    const refresh = setInterval(() => {
      if (document.querySelector("[data-dispatch-assign-open='1']")) return;
      router.refresh();
    }, intervalMs);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [router, kiosk]);

  function openWindow() {
    window.open("/dispatch?kiosk=1", "radiance_dispatch", "width=1680,height=960");
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="rounded-full bg-white px-3 py-1.5 text-sm font-bold tabular-nums text-navy ring-1 ring-slate-200">
        {now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
      <span className="hidden text-xs text-slate-500 sm:inline">автообновление</span>
      <Button onClick={() => router.refresh()} size="sm" type="button" variant="secondary">
        <RefreshCw className="h-3.5 w-3.5" />
        <span className="sm:inline">Обновить</span>
      </Button>
      {kiosk ? null : (
        <Button className="hidden md:inline-flex" onClick={openWindow} size="sm" type="button" variant="secondary">
          <Maximize2 className="h-3.5 w-3.5" />
          Отдельное окно
        </Button>
      )}
    </div>
  );
}
