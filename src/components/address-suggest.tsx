"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SuggestItem = { title: string; subtitle?: string };

/** Омск + область (шире города), чтобы подсказки работали по районам. */
const OMSK_BBOX = "70.5,53.4~76.5,57.5";

export function AddressSuggest({
  name = "address",
  defaultValue = "",
  placeholder = "Омск, улица, ориентир",
  required,
  className,
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const apiKey = process.env.NEXT_PUBLIC_YANDEX_SUGGEST_KEY || "";

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const q = value.trim();
    if (!apiKey || q.length < 3) {
      setItems([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const url = new URL("https://suggest-maps.yandex.ru/v1/suggest");
        url.searchParams.set("apikey", apiKey);
        url.searchParams.set("text", q);
        url.searchParams.set("types", "geo");
        url.searchParams.set("bbox", OMSK_BBOX);
        url.searchParams.set("lang", "ru_RU");
        url.searchParams.set("results", "6");

        const res = await fetch(url.toString(), { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as {
          results?: Array<{ title?: { text?: string }; subtitle?: { text?: string } }>;
        };
        setItems(
          (data.results || [])
            .map((item) => ({
              title: item.title?.text?.trim() || "",
              subtitle: item.subtitle?.text?.trim(),
            }))
            .filter((item) => item.title),
        );
        setOpen(true);
        setActive(-1);
      } catch {
        /* ignore abort / network */
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [apiKey, value]);

  function pick(item: SuggestItem) {
    setValue(item.title);
    setItems([]);
    setOpen(false);
  }

  return (
    <div className={cn("relative", className)} ref={wrapRef}>
      <input
        autoComplete="street-address"
        className="h-11 w-full rounded-2xl border border-stone-200 bg-white px-3 text-sm outline-none ring-menu/20 placeholder:text-stone-400 focus:border-menu focus:ring-2"
        name={name}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => items.length && setOpen(true)}
        onKeyDown={(event) => {
          if (!open || !items.length) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((i) => (i + 1) % items.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
          } else if (event.key === "Enter" && active >= 0) {
            event.preventDefault();
            pick(items[active]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        required={required}
        role="combobox"
        type="text"
        value={value}
      />
      {open && items.length ? (
        <ul
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-lg"
          id={listId}
          role="listbox"
        >
          {items.map((item, index) => (
            <li key={`${item.title}-${index}`}>
              <button
                className={cn(
                  "w-full px-3 py-2.5 text-left text-sm transition hover:bg-menu-soft/60",
                  active === index ? "bg-menu-soft/80" : "",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(item)}
                role="option"
                type="button"
              >
                <div className="font-medium text-navy">{item.title}</div>
                {item.subtitle ? <div className="text-xs text-slate-500">{item.subtitle}</div> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
