import { SMS_TEMPLATE_KEYS } from "./constants";
import { escapeMaxMarkdown, mapsHref, publicAppUrl } from "./utils";
import type { MaxSendOpts } from "./max-types";

export type MaxCardLine = {
  icon?: string;
  value: string;
  href?: string;
  strong?: boolean;
};

function toPublicUrl(value?: string) {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return `${publicAppUrl()}${parsed.pathname}${parsed.search}`;
  } catch {
    return value;
  }
}

export function formatMaxCard(title: string, lines?: MaxCardLine[], emoji = "•", body?: string) {
  const parts = [`${emoji} **${escapeMaxMarkdown(title)}**`];
  if (lines?.length) {
    parts.push("");
    for (const line of lines) {
      if (!line.value) continue;
      const prefix = line.icon ? `${line.icon} ` : "";
      const raw = escapeMaxMarkdown(line.value);
      const text = line.strong ? `**${raw}**` : raw;
      parts.push(line.href ? `${prefix}[${text}](${line.href})` : `${prefix}${text}`);
    }
  } else if (body) {
    parts.push("", escapeMaxMarkdown(body));
  }
  return parts.join("\n");
}

export function personalMaxMessage(
  purpose: string,
  vars: Record<string, string>,
  fallback: string,
): { text: string; opts: MaxSendOpts } {
  const number = vars.number || "";
  const address = vars.address || "";
  const app = publicAppUrl();

  if (purpose === SMS_TEMPLATE_KEYS.ORDER_ASSIGNED_CUSTOMER) {
    return {
      text: formatMaxCard(
        "Техника назначена",
        [
          { value: number, strong: true },
          { icon: "🚚", value: vars.equipment },
          { icon: "👤", value: vars.driver },
          { icon: "🕐", value: vars.datetime },
          { icon: "📍", value: address, href: address ? mapsHref(address) : undefined },
        ],
        "✅",
      ),
      opts: { format: "markdown" },
    };
  }

  if (purpose === SMS_TEMPLATE_KEYS.ORDER_ASSIGNED_DRIVER) {
    return {
      text: formatMaxCard(
        "Новая заявка",
        [
          { value: number, strong: true },
          { icon: "🕐", value: vars.datetime },
          { icon: "📍", value: address, href: address ? mapsHref(address) : undefined },
        ],
        "🚚",
      ),
      opts: {
        format: "markdown",
        button: { text: "Открыть кабинет", url: `${app}/driver` },
      },
    };
  }

  if (purpose === SMS_TEMPLATE_KEYS.ORDER_DOCS_READY) {
    const docsUrl = toPublicUrl(vars.url);
    return {
      text: formatMaxCard(
        "Документы готовы",
        [
          { value: number, strong: true },
          { icon: "📄", value: vars.invoice ? `Счёт ${vars.invoice}` : "" },
          { icon: "📋", value: vars.act ? `Акт ${vars.act}` : "" },
        ],
        "📎",
      ),
      opts: {
        format: "markdown",
        button: docsUrl ? { text: "Открыть документы", url: docsUrl } : undefined,
      },
    };
  }

  if (purpose === SMS_TEMPLATE_KEYS.ORDER_CANCELLED_CUSTOMER) {
    return {
      text: formatMaxCard(
        "Заявка отменена",
        [{ value: number, strong: true }, { icon: "💬", value: vars.reason }],
        "⛔",
      ),
      opts: { format: "markdown" },
    };
  }

  if (purpose === SMS_TEMPLATE_KEYS.ORDER_CANCELLED_DRIVER) {
    return {
      text: formatMaxCard(
        "Заявка отменена",
        [{ value: number, strong: true }, { icon: "💬", value: vars.reason || "Отменил диспетчер" }],
        "⛔",
      ),
      opts: {
        format: "markdown",
        button: { text: "Кабинет", url: `${app}/driver` },
      },
    };
  }

  if (purpose === SMS_TEMPLATE_KEYS.ORDER_CHANGED_CUSTOMER || purpose === SMS_TEMPLATE_KEYS.ORDER_CHANGED_DRIVER) {
    return {
      text: formatMaxCard(
        "Заявка изменена",
        [
          { value: number, strong: true },
          { icon: "🕐", value: vars.datetime },
          { icon: "📍", value: address, href: address ? mapsHref(address) : undefined },
          ...(vars.details ? [{ icon: "💬", value: vars.details }] : []),
        ],
        "✏️",
      ),
      opts: {
        format: "markdown",
        button:
          purpose === SMS_TEMPLATE_KEYS.ORDER_CHANGED_DRIVER
            ? { text: "Открыть кабинет", url: `${app}/driver` }
            : undefined,
      },
    };
  }

  if (purpose === SMS_TEMPLATE_KEYS.PUBLIC_ORDER_CUSTOMER) {
    return {
      text: formatMaxCard(
        "Заявка принята",
        [
          { value: number, strong: true },
          { icon: "📞", value: "Диспетчер перезвонит и подтвердит подачу" },
        ],
        "✅",
      ),
      opts: { format: "markdown" },
    };
  }

  if (purpose === "TEST" || purpose === "TEST_MAX") {
    return {
      text: formatMaxCard("Тест MAX", [{ icon: "✅", value: fallback || "Бот Рэдианс-СпецТех работает." }], "🧪"),
      opts: { format: "markdown" },
    };
  }

  return { text: fallback, opts: { format: "markdown" } };
}
