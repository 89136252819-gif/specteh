"use client";

import { photoSrc } from "@/lib/utils";

export function ReportPhotos({ photos }: { photos: string[] }) {
  if (!photos.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-3">
      {photos.map((src) => {
        const href = photoSrc(src);
        return (
          <a
            className="block overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200"
            href={href}
            key={src}
            rel="noopener noreferrer"
            target="_blank"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="Фото из отчёта" className="report-photo h-36 w-36 object-contain" src={href} />
          </a>
        );
      })}
    </div>
  );
}
