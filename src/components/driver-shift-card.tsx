"use client";

import { useEffect, useState, useTransition } from "react";
import { Play, Square } from "lucide-react";
import { endShift, startShift } from "@/actions/driver";
import { CenterModal } from "@/components/center-modal";
import { Button } from "@/components/ui/button";
import { formatClock, formatDriverWhen, formatHoursMinutes } from "@/lib/utils";

export function DriverShiftCard({
  startedAt,
  todayMs,
}: {
  startedAt: string | null;
  todayMs: number;
}) {
  const [pending, start] = useTransition();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [liveWarning, setLiveWarning] = useState<string[]>([]);
  const open = Boolean(startedAt);

  function beginShift() {
    start(() => {
      void startShift();
    });
  }

  function finishShift(force = false) {
    start(async () => {
      const result = await endShift(force);
      if (result && "needsConfirm" in result && result.needsConfirm) {
        setLiveWarning(result.live.map((item) => item.number));
        setConfirmEnd(true);
        return;
      }
      setConfirmEnd(false);
      setLiveWarning([]);
    });
  }

  return (
    <section
      className={`overflow-hidden rounded-3xl p-4 shadow-sm ring-1 ${
        open ? "bg-navy text-white ring-navy/20" : "bg-white text-navy ring-slate-200/70"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">Рабочая смена</div>
        {open ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-menu/90 px-2.5 py-1 text-[11px] font-extrabold text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            На линии
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-slate-400">Не начата</span>
        )}
      </div>

      {open && startedAt ? (
        <>
          <ShiftTimer startedAt={startedAt} />
          <p className={`mt-1 text-sm ${open ? "text-white/65" : "text-slate-500"}`}>
            Начало: {formatDriverWhen(startedAt)}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Нажмите, когда выходите на работу</p>
      )}

      <p className={`mt-2 text-sm font-semibold ${open ? "text-white/80" : "text-slate-600"}`}>
        Сегодня: {formatHoursMinutes(todayMs)}
      </p>

      <Button
        className={`mt-4 h-14 w-full text-base ${open ? "bg-white text-navy hover:bg-white/90" : ""}`}
        disabled={pending}
        onClick={() => {
          if (open) {
            finishShift(false);
            return;
          }
          beginShift();
        }}
        size="lg"
        variant={open ? "secondary" : "success"}
      >
        {open ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
        {pending && !confirmEnd ? "Сохраняем…" : open ? "Завершить смену" : "Начать смену"}
      </Button>

      <CenterModal
        className="max-w-md"
        labelledBy="end-shift-title"
        placement="center"
        onClose={() => {
          if (!pending) {
            setConfirmEnd(false);
            setLiveWarning([]);
          }
        }}
        open={confirmEnd}
      >
        <div className="px-5 py-5 sm:px-6">
          <h3 className="text-lg font-extrabold text-navy" id="end-shift-title">
            {liveWarning.length ? "Есть незакрытые заявки" : "Завершить смену?"}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {liveWarning.length
              ? `У вас ещё в работе: ${liveWarning.join(", ")}. Смену всё равно закрыть?`
              : startedAt
                ? `Смена с ${formatDriverWhen(startedAt)} будет закрыта. Время запишется в табель.`
                : "Смена будет закрыта. Время запишется в табель."}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button
              className="h-12 w-full sm:flex-1"
              disabled={pending}
              onClick={() => finishShift(true)}
              type="button"
              variant="danger"
            >
              {pending ? "Сохраняем…" : liveWarning.length ? "Закрыть всё равно" : "Завершить"}
            </Button>
            <Button
              className="h-12 w-full sm:flex-1"
              disabled={pending}
              onClick={() => {
                setConfirmEnd(false);
                setLiveWarning([]);
              }}
              type="button"
              variant="secondary"
            >
              Отмена
            </Button>
          </div>
        </div>
      </CenterModal>
    </section>
  );
}

function ShiftTimer({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="mt-3 font-extrabold tabular-nums tracking-tight text-[clamp(1.6rem,8vw,2.35rem)] leading-none">
      {formatClock(now - new Date(startedAt).getTime())}
    </div>
  );
}
