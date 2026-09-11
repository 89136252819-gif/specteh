"use client";

import { useEffect, useState } from "react";
import { ExternalLink, MapPinned } from "lucide-react";
import { mapsHref } from "@/lib/utils";

/** База (парк) — центр Омска, если GPS недоступен. */
const OMSK_BASE = { lat: 54.9924, lon: 73.3686 };
/** Средняя скорость по городу/области для грубой оценки, км/ч. */
const AVG_SPEED_KMH = 35;

type Coords = { lat: number; lon: number };

function haversineKm(a: Coords, b: Coords) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function formatEta(minutes: number) {
  if (minutes < 60) return `≈ ${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `≈ ${h} ч ${m} мин` : `≈ ${h} ч`;
}

async function geocodeNominatim(address: string): Promise<Coords | null> {
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ru&q=` +
    encodeURIComponent(address);
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { lat: string; lon: string }[];
  if (!data?.[0]) return null;
  return { lat: Number(data[0].lat), lon: Number(data[0].lon) };
}

export function AddressMap({
  address,
  compact,
}: {
  address: string;
  compact?: boolean;
}) {
  const [eta, setEta] = useState<string | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [fromGps, setFromGps] = useState(false);
  const routeHref = mapsHref(address);
  const embedSrc = `https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(address)}&z=14`;

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const dest = await geocodeNominatim(address);
        if (!dest || cancelled) return;

        let origin = OMSK_BASE;
        let usedGps = false;
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          const pos = await new Promise<GeolocationPosition | null>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (p) => resolve(p),
              () => resolve(null),
              { enableHighAccuracy: false, timeout: 5000, maximumAge: 120_000 },
            );
          });
          if (pos) {
            origin = { lat: pos.coords.latitude, lon: pos.coords.longitude };
            usedGps = true;
          }
        }
        if (cancelled) return;
        const km = haversineKm(origin, dest);
        const minutes = Math.max(5, Math.round((km / AVG_SPEED_KMH) * 60));
        setDistanceKm(Math.round(km * 10) / 10);
        setEta(formatEta(minutes));
        setFromGps(usedGps);
      } catch {
        /* ignore — карта всё равно показывается */
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [address]);

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div
        className={`overflow-hidden ring-1 ring-slate-200/80 ${
          compact ? "rounded-2xl" : "rounded-xl"
        }`}
      >
        <iframe
          allowFullScreen
          className={compact ? "h-44 w-full border-0" : "h-56 w-full border-0 sm:h-64"}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={embedSrc}
          title={`Карта: ${address}`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
        <span className="inline-flex items-center gap-1.5 font-medium text-navy">
          <MapPinned className="h-4 w-4 text-menu-hover" />
          {eta && distanceKm != null
            ? `${distanceKm} км · ${eta}${fromGps ? "" : " от центра Омска"}`
            : "Оценка времени…"}
        </span>
        <a
          className="inline-flex items-center gap-1 font-semibold text-menu-hover hover:underline"
          href={routeHref}
          rel="noreferrer"
          target="_blank"
        >
          Открыть в Яндекс.Картах
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <p className="text-[11px] text-slate-400">
        Время примерное (по прямой, ~{AVG_SPEED_KMH} км/ч), без учёта пробок.
      </p>
    </div>
  );
}
