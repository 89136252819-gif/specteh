"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, CloudOff, ImagePlus, Minus, Plus, X } from "lucide-react";
import { submitReport } from "@/actions/driver";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/fields";

const DRAFT_PREFIX = "driver-report-draft:";
const IDB_NAME = "radiance-driver";
const IDB_STORE = "report-photos";

type DraftScalars = {
  deliveryQty: number;
  hours: number;
  idleHours: number;
  km: number;
  weekend: boolean;
  comment: string;
  updatedAt: number;
};

function draftKey(orderId: string) {
  return `${DRAFT_PREFIX}${orderId}`;
}

function openPhotoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function savePhotos(orderId: string, files: File[]) {
  const db = await openPhotoDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(
      files.map((f) => ({ name: f.name, type: f.type, blob: f })),
      orderId,
    );
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function loadPhotos(orderId: string): Promise<File[]> {
  try {
    const db = await openPhotoDb();
    const rows = await new Promise<{ name: string; type: string; blob: Blob }[] | undefined>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(orderId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => new File([row.blob], row.name || "photo.jpg", { type: row.type || "image/jpeg" }));
  } catch {
    return [];
  }
}

async function clearPhotos(orderId: string) {
  try {
    const db = await openPhotoDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(orderId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}

function readScalars(orderId: string): DraftScalars | null {
  try {
    const raw = localStorage.getItem(draftKey(orderId));
    if (!raw) return null;
    return JSON.parse(raw) as DraftScalars;
  } catch {
    return null;
  }
}

function writeScalars(orderId: string, data: Omit<DraftScalars, "updatedAt">) {
  const payload: DraftScalars = { ...data, updatedAt: Date.now() };
  localStorage.setItem(draftKey(orderId), JSON.stringify(payload));
}

function clearScalars(orderId: string) {
  localStorage.removeItem(draftKey(orderId));
}

export function DriverReportForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [deliveryQty, setDeliveryQty] = useState(1);
  const [hours, setHours] = useState(8);
  const [idleHours, setIdleHours] = useState(0);
  const [km, setKm] = useState(0);
  const [weekend, setWeekend] = useState(false);
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [draftNote, setDraftNote] = useState("");
  const [offline, setOffline] = useState(false);
  const hydrated = useRef(false);

  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => {
    return () => {
      for (const preview of previews) URL.revokeObjectURL(preview.url);
    };
  }, [previews]);

  useEffect(() => {
    setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = readScalars(orderId);
      const photos = await loadPhotos(orderId);
      if (cancelled) return;
      if (saved) {
        setDeliveryQty(saved.deliveryQty);
        setHours(saved.hours);
        setIdleHours(saved.idleHours);
        setKm(saved.km);
        setWeekend(saved.weekend);
        setComment(saved.comment || "");
        setDraftNote("Черновик восстановлен с устройства");
      }
      if (photos.length) setFiles(photos);
      hydrated.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    if (!hydrated.current) return;
    writeScalars(orderId, { deliveryQty, hours, idleHours, km, weekend, comment });
    void savePhotos(orderId, files).catch(() => {
      setDraftNote("Числа сохранены; фото не удалось записать в офлайн-хранилище");
    });
    if (files.length || comment || deliveryQty !== 1 || hours !== 8 || idleHours || km || weekend) {
      setDraftNote((prev) => (prev.startsWith("Черновик") ? prev : "Черновик сохранён на устройстве"));
    }
  }, [orderId, deliveryQty, hours, idleHours, km, weekend, comment, files]);

  const clearDraft = useCallback(async () => {
    clearScalars(orderId);
    await clearPhotos(orderId);
    setDraftNote("");
  }, [orderId]);

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
    setError("");
  }

  function submit() {
    setError("");
    if (!navigator.onLine) {
      setError("Нет сети. Черновик сохранён — отправьте, когда появится интернет.");
      setConfirming(false);
      return;
    }
    const fd = new FormData();
    fd.set("deliveryQty", String(deliveryQty));
    fd.set("hours", String(hours));
    fd.set("idleHours", String(idleHours));
    fd.set("km", String(km));
    if (weekend) fd.set("isWeekend", "on");
    if (comment.trim()) fd.set("comment", comment.trim());
    for (const file of files) fd.append("photos", file);
    start(async () => {
      const result = await submitReport(orderId, fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      await clearDraft();
      router.refresh();
      router.push("/driver");
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!files.length) {
          setError("Добавьте хотя бы одно фото объекта или счётчика");
          return;
        }
        setConfirming(true);
      }}
    >
      <h2 className="text-lg font-extrabold text-navy">Отчёт о работе</h2>
      {offline ? (
        <p className="flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950 ring-1 ring-amber-200">
          <CloudOff className="h-4 w-4 shrink-0" />
          Офлайн: данные и фото сохраняются на телефоне, отправка — при появлении сети.
        </p>
      ) : null}
      {draftNote ? <p className="text-xs font-medium text-slate-500">{draftNote}</p> : null}

      <Stepper label="Подача, шт" min={0} onChange={setDeliveryQty} step={1} value={deliveryQty} />
      <Stepper label="Моточасы" min={0} onChange={setHours} step={0.5} value={hours} />
      <Stepper label="Простой, часы" min={0} onChange={setIdleHours} step={0.5} value={idleHours} />
      <Stepper label="Километраж" min={0} onChange={setKm} step={10} value={km} />

      <button
        className={`flex min-h-14 w-full items-center justify-between rounded-2xl px-4 text-left text-base font-semibold ring-1 ${
          weekend ? "bg-menu-soft text-menu-hover ring-menu/30" : "bg-white text-slate-700 ring-slate-200"
        }`}
        onClick={() => setWeekend((v) => !v)}
        type="button"
      >
        Выходной / праздник
        <span className={`rounded-full px-3 py-1 text-sm ${weekend ? "bg-menu text-white" : "bg-slate-100 text-slate-500"}`}>
          {weekend ? "Да" : "Нет"}
        </span>
      </button>

      <div>
        <div className="mb-1 text-sm font-semibold text-stone-700">Комментарий</div>
        <Textarea
          className="text-base"
          name="comment"
          onChange={(e) => setComment(e.target.value)}
          placeholder="Что сделали, особенности объекта"
          value={comment}
        />
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold text-stone-700">Фото объекта и счётчика</div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-navy text-sm font-bold text-white">
            <Camera className="h-5 w-5" />
            Камера
            <input
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
              type="file"
            />
          </label>
          <label className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-navy ring-1 ring-slate-200">
            <ImagePlus className="h-5 w-5" />
            Галерея
            <input
              accept="image/*"
              className="sr-only"
              multiple
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
              type="file"
            />
          </label>
        </div>
        {previews.length ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {previews.map(({ file, url }, index) => (
              <div className="relative" key={`${file.name}-${index}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="" className="report-photo h-24 w-full rounded-xl object-contain bg-slate-100" src={url} />
                <button
                  className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-navy/80 text-white"
                  onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500">
            Нужно минимум одно фото. С iPhone лучше JPEG из галереи — HEIC на компьютере может не открыться.
          </p>
        )}
      </div>

      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

      {confirming ? (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
          <p className="font-semibold">Проверьте перед отправкой</p>
          <p className="mt-1">
            Подача {deliveryQty} · моточасы {hours}
            {idleHours ? ` · простой ${idleHours}` : ""}
            {km ? ` · ${km} км` : ""} · фото {files.length}
          </p>
          <div className="mt-3 flex gap-2">
            <Button className="flex-1" disabled={pending} onClick={submit} type="button" variant="success">
              {pending ? "Отправляем…" : "Подтвердить"}
            </Button>
            <Button className="flex-1" disabled={pending} onClick={() => setConfirming(false)} type="button" variant="secondary">
              Назад
            </Button>
          </div>
        </div>
      ) : null}

      <div className="h-20" />
      <div className="driver-sticky-cta">
        <Button className="h-14 w-full text-lg" disabled={pending || confirming} size="lg" type="submit" variant="success">
          {pending ? "Отправляем…" : offline ? "Сохранить и сдать позже" : "Сдать отчёт"}
        </Button>
      </div>
    </form>
  );
}

function Stepper({
  label,
  value,
  onChange,
  step,
  min,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
  min: number;
}) {
  const shown = Number.isInteger(value) ? String(value) : value.toFixed(1);

  return (
    <div>
      <div className="mb-1 text-sm font-semibold text-stone-700">{label}</div>
      <div className="flex items-center gap-2">
        <button
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-navy"
          onClick={() => onChange(Math.max(min, round(value - step, step)))}
          type="button"
        >
          <Minus className="h-5 w-5" />
        </button>
        <div className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-white text-2xl font-extrabold text-navy ring-1 ring-slate-200">
          {shown}
        </div>
        <button
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-navy"
          onClick={() => onChange(round(value + step, step))}
          type="button"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function round(value: number, step: number) {
  return Math.round(value / step) * step;
}
