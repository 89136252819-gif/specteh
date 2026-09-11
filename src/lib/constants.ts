export const ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  ACCOUNTANT: "ACCOUNTANT",
  DRIVER: "DRIVER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Главный менеджер",
  MANAGER: "Менеджер",
  ACCOUNTANT: "Бухгалтер",
  DRIVER: "Водитель",
};

export const STAFF_ROLES: Role[] = ["ADMIN", "MANAGER", "ACCOUNTANT"];

/** Единственный пользователь с доступом к полному журналу действий. */
export const AUDIT_VIEWER_NAME = "Клочков Максим Игоревич";

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  ASSIGN: "Назначение",
  CANCEL: "Отмена",
  FORCE_STATUS: "Смена статуса",
  VERIFY_REPORT: "Проверка отчёта",
  GENERATE_DOCS: "Документы",
  EDIT_DOCS: "Правка документов",
  ADVANCE: "Статус с канбана",
  PAYMENT: "Оплата",
  REPEAT: "Повтор",
};

export const PAYMENT_METHODS = {
  CASH: "CASH",
  CASHLESS_NO_VAT: "CASHLESS_NO_VAT",
  CASHLESS_VAT: "CASHLESS_VAT",
} as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Наличные",
  CASHLESS_NO_VAT: "Безнал без НДС",
  CASHLESS_VAT: "Безнал с НДС",
};

export const ORDER_STATUSES = {
  NEW: "NEW",
  ASSIGNED: "ASSIGNED",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
  EN_ROUTE: "EN_ROUTE",
  ON_SITE: "ON_SITE",
  REPORT_SUBMITTED: "REPORT_SUBMITTED",
  VERIFIED: "VERIFIED",
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
} as const;

export type OrderStatus = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Новая",
  ASSIGNED: "Назначена",
  ACCEPTED: "Водитель принял",
  DECLINED: "Отказ водителя",
  EN_ROUTE: "Выехал",
  ON_SITE: "На объекте",
  REPORT_SUBMITTED: "Отчёт сдан",
  VERIFIED: "Проверено",
  AWAITING_PAYMENT: "Ожидает оплаты",
  PAID: "Оплачено",
  CANCELLED: "Отменена",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  NEW: "bg-sky-100 text-sky-900",
  ASSIGNED: "bg-indigo-100 text-indigo-900",
  ACCEPTED: "bg-violet-100 text-violet-900",
  DECLINED: "bg-stone-100 text-stone-700",
  EN_ROUTE: "bg-amber-50 text-amber-800",
  ON_SITE: "bg-slate-100 text-slate-800",
  REPORT_SUBMITTED: "bg-yellow-50 text-yellow-800",
  VERIFIED: "bg-teal-50 text-teal-800",
  AWAITING_PAYMENT: "bg-amber-50 text-amber-900",
  PAID: "bg-emerald-100 text-emerald-900",
  CANCELLED: "bg-stone-200 text-stone-600",
};

export const EQUIPMENT_STATUSES = {
  AVAILABLE: "AVAILABLE",
  BUSY: "BUSY",
  REPAIR: "REPAIR",
} as const;

export const EQUIPMENT_STATUS_LABELS = {
  AVAILABLE: "Свободна",
  BUSY: "Занята",
  REPAIR: "Ремонт",
} as const;

export const PRICE_KINDS = {
  DELIVERY: "DELIVERY",
  DELIVERY_REGION: "DELIVERY_REGION",
  HOUR: "HOUR",
  IDLE: "IDLE",
  KM: "KM",
  WEEKEND: "WEEKEND",
  MIN_HOURS: "MIN_HOURS",
} as const;

export const PRICE_KIND_LABELS: Record<string, string> = {
  DELIVERY: "Подача",
  DELIVERY_REGION: "Подача, область",
  HOUR: "Моточас",
  IDLE: "Простой, час",
  KM: "Километр",
  WEEKEND: "Выходной (надбавка/час)",
  MIN_HOURS: "Минимум часов",
};

export const CUSTOMER_TYPES = {
  COMPANY: "COMPANY",
  INDIVIDUAL: "INDIVIDUAL",
} as const;

export const SMS_TEMPLATE_KEYS = {
  ORDER_ASSIGNED_CUSTOMER: "ORDER_ASSIGNED_CUSTOMER",
  ORDER_ASSIGNED_DRIVER: "ORDER_ASSIGNED_DRIVER",
  ORDER_DOCS_READY: "ORDER_DOCS_READY",
  ORDER_CANCELLED_CUSTOMER: "ORDER_CANCELLED_CUSTOMER",
  ORDER_CANCELLED_DRIVER: "ORDER_CANCELLED_DRIVER",
  ORDER_CHANGED_CUSTOMER: "ORDER_CHANGED_CUSTOMER",
  ORDER_CHANGED_DRIVER: "ORDER_CHANGED_DRIVER",
  PUBLIC_ORDER_CUSTOMER: "PUBLIC_ORDER_CUSTOMER",
} as const;

export const INVOICE_STATUSES = {
  UNPAID: "UNPAID",
  PARTIAL: "PARTIAL",
  PAID: "PAID",
} as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[keyof typeof INVOICE_STATUSES];

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Не оплачен",
  PARTIAL: "Частично оплачен",
  PAID: "Оплачен",
};

export function invoiceStatusLabel(status: string) {
  return INVOICE_STATUS_LABELS[status] || status;
}

export const SMS_STATUS_LABELS: Record<string, string> = {
  MOCK: "Журнал (тест)",
  SENT: "Отправлено",
  OK: "Отправлено",
  ERROR: "Ошибка",
  FAIL: "Ошибка",
  SKIPPED: "Пропущено",
};

export function smsStatusLabel(status: string) {
  return SMS_STATUS_LABELS[status] || status;
}
