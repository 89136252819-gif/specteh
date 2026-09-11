export type PartyByInn = {
  type: "COMPANY" | "INDIVIDUAL";
  name: string;
  inn: string;
  kpp: string | null;
  address: string | null;
  contactName: string;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeInn(value: string) {
  return digitsOnly(value).slice(0, 12);
}

export function isValidInn(value: string) {
  const inn = normalizeInn(value);
  return inn.length === 10 || inn.length === 12;
}

type DadataParty = {
  suggestions?: Array<{
    value?: string;
    data?: {
      inn?: string;
      kpp?: string | null;
      type?: string;
      name?: {
        short_with_opf?: string | null;
        full_with_opf?: string | null;
        full?: string | null;
      };
      fio?: {
        surname?: string | null;
        name?: string | null;
        patronymic?: string | null;
      };
      address?: { value?: string | null; unrestricted_value?: string | null } | null;
      management?: { name?: string | null } | null;
    };
  }>;
};

function attr(node: unknown): Record<string, string> {
  if (!node || typeof node !== "object") return {};
  const attrs = (node as { "@attributes"?: Record<string, string> })["@attributes"];
  return attrs && typeof attrs === "object" ? attrs : {};
}

function firstOf<T>(value: T | T[] | undefined | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatRfAddress(addrNode: unknown): string | null {
  if (!addrNode || typeof addrNode !== "object") return null;
  const rf = (addrNode as { АдресРФ?: unknown }).АдресРФ;
  if (!rf) return null;
  const a = attr(rf);
  const region = attr((rf as { Регион?: unknown }).Регион).НаимРегион;
  const city = attr((rf as { Город?: unknown }).Город);
  const settlement = attr((rf as { НаселПункт?: unknown }).НаселПункт);
  const street = attr((rf as { Улица?: unknown }).Улица);
  const parts = [
    a.Индекс,
    region,
    city.ТипГород && city.НаимГород ? `${city.ТипГород} ${city.НаимГород}` : city.НаимГород,
    settlement.ТипНаселПункт && settlement.НаимНаселПункт
      ? `${settlement.ТипНаселПункт} ${settlement.НаимНаселПункт}`
      : settlement.НаимНаселПункт,
    street.ТипУлица && street.НаимУлица ? `${street.ТипУлица} ${street.НаимУлица}` : street.НаимУлица,
    a.Дом,
    a.Корпус ? `корп. ${a.Корпус}` : null,
    a.Кварт ? `кв. ${a.Кварт}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function parseItsoft(data: Record<string, unknown>, inn: string): PartyByInn | null {
  const ul = data.СвЮЛ as Record<string, unknown> | undefined;
  if (ul) {
    const a = attr(ul);
    const nameNode = ul.СвНаимЮЛ as Record<string, unknown> | undefined;
    const full = attr(nameNode).НаимЮЛПолн;
    const short = attr(nameNode?.СвНаимЮЛСокр).НаимСокр;
    const name = short || full;
    if (!name) return null;

    const mgmt = firstOf(ul.СведДолжнФЛ as unknown);
    const fio = attr((mgmt as { СвФЛ?: unknown } | null)?.СвФЛ);
    const contactName = [fio.Фамилия, fio.Имя, fio.Отчество].filter(Boolean).join(" ");

    return {
      type: "COMPANY",
      name,
      inn: String(a.ИНН || inn),
      kpp: a.КПП || null,
      address: formatRfAddress(ul.СвАдресЮЛ),
      contactName: contactName || name,
    };
  }

  const ip = data.СвИП as Record<string, unknown> | undefined;
  if (ip) {
    const a = attr(ip);
    const fio = attr(ip.СвФЛ || ip.ФИОРус || ip);
    const name =
      [fio.Фамилия, fio.Имя, fio.Отчество].filter(Boolean).join(" ") ||
      attr((ip.СвФЛ as Record<string, unknown> | undefined)?.ФИОРус).Фамилия;
    const fullName = name ? `ИП ${name}` : null;
    if (!fullName) return null;
    return {
      type: "INDIVIDUAL",
      name: fullName,
      inn: String(a.ИНН || inn),
      kpp: null,
      address: formatRfAddress(ip.СвАдрес || ip.СвАдресЮЛ || ip.АдресМЖ),
      contactName: name || fullName,
    };
  }

  return null;
}

async function lookupViaItsoft(inn: string): Promise<{ ok: true; party: PartyByInn } | { ok: false; error: string }> {
  try {
    const res = await fetch(`https://egrul.itsoft.ru/${inn}.json`, {
      headers: { Accept: "application/json", "User-Agent": "RadianceSpetsteh/1.0" },
      cache: "no-store",
      redirect: "follow",
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, error: `Реестр недоступен (${res.status})` };
    }
    if (text.includes("только для подписчиков") || text.trim().startsWith("<")) {
      return { ok: false, error: "По этому ИНН бесплатный реестр не отдал данные. Добавьте DADATA_API_TOKEN." };
    }
    const data = JSON.parse(text) as Record<string, unknown>;
    const party = parseItsoft(data, inn);
    if (!party) {
      return { ok: false, error: "По этому ИНН ничего не найдено" };
    }
    return { ok: true, party };
  } catch {
    return { ok: false, error: "Не удалось запросить данные по ИНН" };
  }
}

async function lookupViaDadata(inn: string, token: string): Promise<{ ok: true; party: PartyByInn } | { ok: false; error: string }> {
  try {
    const res = await fetch("https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify({ query: inn }),
      cache: "no-store",
    });

    if (!res.ok) {
      return { ok: false, error: `DaData недоступна (${res.status})` };
    }

    const data = (await res.json()) as DadataParty;
    const item = data.suggestions?.[0]?.data;
    if (!item?.inn) {
      return { ok: false, error: "По этому ИНН ничего не найдено" };
    }

    const isIp = item.type === "INDIVIDUAL";
    const fio = [item.fio?.surname, item.fio?.name, item.fio?.patronymic].filter(Boolean).join(" ");
    const name =
      (isIp ? fio || item.name?.full_with_opf || item.name?.short_with_opf : item.name?.short_with_opf || item.name?.full_with_opf) ||
      data.suggestions?.[0]?.value ||
      "";
    if (!name) {
      return { ok: false, error: "По этому ИНН ничего не найдено" };
    }

    const contactName = isIp ? fio || name : item.management?.name?.trim() || "";

    return {
      ok: true,
      party: {
        type: isIp ? "INDIVIDUAL" : "COMPANY",
        name,
        inn: item.inn,
        kpp: item.kpp || null,
        address: item.address?.unrestricted_value || item.address?.value || null,
        contactName: contactName || name,
      },
    };
  } catch {
    return { ok: false, error: "Не удалось запросить данные по ИНН" };
  }
}

export async function lookupPartyByInn(rawInn: string): Promise<{ ok: true; party: PartyByInn } | { ok: false; error: string }> {
  const inn = normalizeInn(rawInn);
  if (!isValidInn(inn)) {
    return { ok: false, error: "ИНН должен содержать 10 или 12 цифр" };
  }

  const token = (process.env.DADATA_API_TOKEN || "").trim();
  if (token) {
    const dadata = await lookupViaDadata(inn, token);
    if (dadata.ok) return dadata;
  }

  const free = await lookupViaItsoft(inn);
  if (free.ok) return free;

  if (!token) {
    return {
      ok: false,
      error: free.error.includes("подписчик")
        ? free.error
        : `${free.error} Для ИП и полного покрытия добавьте DADATA_API_TOKEN в .env`,
    };
  }

  return free;
}
