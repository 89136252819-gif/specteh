export type StaffNotice = {
  id: string;
  type: string;
  title: string;
  body: string;
  orderId: string | null;
  read: boolean;
  createdAt: string;
};

export function toStaffNotice(item: {
  id: string;
  type: string;
  title: string;
  body: string;
  orderId: string | null;
  read: boolean;
  createdAt: Date | string;
}): StaffNotice {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    body: item.body,
    orderId: item.orderId,
    read: item.read,
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
  };
}

export function noticeHref(item: { type: string; orderId: string | null }) {
  if (item.orderId) return `/orders/${item.orderId}`;
  if (item.type === "SHIFT_STARTED" || item.type === "SHIFT_ENDED") return "/dispatch#on-shift";
  return "/dispatch";
}

export function formatNoticeWhen(value: Date | string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 45_000) return "только что";
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.max(1, Math.round(diff / 60_000));
    return `${minutes} мин назад`;
  }
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.max(1, Math.round(diff / 3_600_000));
    return `${hours} ч назад`;
  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
