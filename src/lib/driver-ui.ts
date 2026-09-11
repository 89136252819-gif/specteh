export const DRIVER_NEXT_ACTION: Record<string, string> = {
  ASSIGNED: "Принять заявку",
  ACCEPTED: "Выехал на объект",
  EN_ROUTE: "Я на объекте",
  ON_SITE: "Сдать отчёт",
  REPORT_SUBMITTED: "Ждёт проверку",
};

export const DRIVER_ADVANCE_LABEL: Record<string, string> = {
  ACCEPTED: "Выехал на объект",
  EN_ROUTE: "Я на объекте",
};

export const DRIVER_STEPS = ["Принял", "Выехал", "На месте", "Отчёт"] as const;

export function driverStepDone(status: string) {
  switch (status) {
    case "ACCEPTED":
      return 1;
    case "EN_ROUTE":
      return 2;
    case "ON_SITE":
      return 3;
    case "REPORT_SUBMITTED":
    case "VERIFIED":
    case "AWAITING_PAYMENT":
    case "PAID":
      return 4;
    default:
      return 0;
  }
}

export function isDriverActionStatus(status: string) {
  return status === "ASSIGNED" || status === "ACCEPTED" || status === "EN_ROUTE" || status === "ON_SITE";
}
