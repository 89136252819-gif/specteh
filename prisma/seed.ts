import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { formatOrderNumber } from "../src/lib/order-number";

const prisma = new PrismaClient();

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

function pick<T>(rand: () => number, items: T[]) {
  return items[Math.floor(rand() * items.length)];
}

function token() {
  return randomBytes(12).toString("hex");
}

function atHour(date: Date, hour: number, minute = 0) {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

type Line = { name: string; qty: number; unit: string; price: number; sum: number };

function calc(
  prices: { typeId: string; kind: string; amount: number; label: string }[],
  typeId: string,
  report: { deliveryQty: number; hours: number; idleHours: number; km: number; isWeekend: boolean },
  vatRate: number,
) {
  const byKind = (kind: string) => prices.find((p) => p.typeId === typeId && p.kind === kind);
  const lines: Line[] = [];
  const add = (kind: string, qty: number, unit: string) => {
    if (!qty) return;
    const p = byKind(kind);
    const price = p?.amount ?? 0;
    lines.push({
      name: p?.label || kind,
      qty,
      unit,
      price,
      sum: Math.round(qty * price * 100) / 100,
    });
  };
  add("DELIVERY", report.deliveryQty, "подача");
  add("HOUR", report.hours, "час");
  add("IDLE", report.idleHours, "час");
  add("KM", report.km, "км");
  if (report.isWeekend) add("WEEKEND", report.hours, "час");
  const subtotal = Math.round(lines.reduce((s, l) => s + l.sum, 0) * 100) / 100;
  const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;
  return { lines, vatAmount, total };
}

async function main() {
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.act.deleteMany();
  await prisma.workReport.deleteMany();
  await prisma.order.deleteMany();
  await prisma.priceItem.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.equipmentType.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.smsLog.deleteMany();
  await prisma.smsTemplate.deleteMany();
  await prisma.appSequence.deleteMany();
  await prisma.user.deleteMany();

  const hash = (p: string) => bcrypt.hash(p, 10);
  const rand = rng(20260821);

  const admin = await prisma.user.create({
    data: {
      login: "admin",
      passwordHash: await hash("admin123"),
      name: "Литке Татьяна Сергеевна",
      phone: "+79010101011",
      role: "ADMIN",
    },
  });
  const manager = await prisma.user.create({
    data: {
      login: "manager",
      passwordHash: await hash("manager123"),
      name: "Соколов Дмитрий",
      phone: "+79002223344",
      role: "MANAGER",
    },
  });
  const accountant = await prisma.user.create({
    data: {
      login: "accountant",
      passwordHash: await hash("accountant123"),
      name: "Новикова Ольга",
      phone: "+79003334455",
      role: "ACCOUNTANT",
    },
  });

  await prisma.user.create({
    data: {
      login: "ylitke",
      passwordHash: await hash("admin123"),
      name: "Литке Юрий Эдуардович",
      phone: "+79010101010",
      role: "ADMIN",
    },
  });
  await prisma.user.create({
    data: {
      login: "tlitke",
      passwordHash: await hash("admin123"),
      name: "Литке Татьяна Сергеевна",
      phone: "+79010101011",
      role: "ADMIN",
    },
  });
  await prisma.user.create({
    data: {
      login: "mklochkov",
      passwordHash: await hash("admin123"),
      name: "Клочков Максим Игоревич",
      phone: "+79010101012",
      role: "ADMIN",
    },
  });

  const driverUsers = await Promise.all([
    prisma.user.create({
      data: {
        login: "ivanov",
        passwordHash: await hash("driver123"),
        name: "Иванов Сергей",
        phone: "+79005556677",
        role: "DRIVER",
      },
    }),
    prisma.user.create({
      data: {
        login: "petrov",
        passwordHash: await hash("driver123"),
        name: "Петров Андрей",
        phone: "+79006667788",
        role: "DRIVER",
      },
    }),
    prisma.user.create({
      data: {
        login: "sidorov",
        passwordHash: await hash("driver123"),
        name: "Сидоров Павел",
        phone: "+79007778899",
        role: "DRIVER",
      },
    }),
    prisma.user.create({
      data: {
        login: "kuznetsov",
        passwordHash: await hash("driver123"),
        name: "Кузнецов Игорь",
        phone: "+79008889900",
        role: "DRIVER",
      },
    }),
    prisma.user.create({
      data: {
        login: "ezaruchatsky",
        passwordHash: await hash("driver123"),
        name: "Заручатский Евгений",
        phone: "+79009990011",
        role: "DRIVER",
      },
    }),
    prisma.user.create({
      data: {
        login: "vplotnikov",
        passwordHash: await hash("driver123"),
        name: "Плотников Виктор",
        phone: "+79009990022",
        role: "DRIVER",
      },
    }),
    prisma.user.create({
      data: {
        login: "fgimalov",
        passwordHash: await hash("driver123"),
        name: "Гималов Фарид",
        phone: "+79009990033",
        role: "DRIVER",
      },
    }),
  ]);

  const ipKlochkov = {
    name: "ИП Клочков Максим Игоревич",
    shortName: "ИП Клочков М.И.",
    inn: "550336005658",
    ogrn: "320554300041181",
    legalAddress: "644007, г. Омск, ул. 5-я Северная, 193/1, 119",
    phone: "+79507862923",
    email: "zaruchatskaia@mail.ru",
    bankName: "Омское отделение №8634 ПАО Сбербанк",
    bik: "045209673",
    account: "40802810445000030234",
    corrAccount: "30101810900000000673",
    directorName: "Литке Ю.Э.",
    directorTitle: "ИП",
    vatRate: 0,
  } as const;

  const orgCash = await prisma.organization.create({
    data: {
      ...ipKlochkov,
      paymentMethod: "CASH",
      invoicePrefix: "СЧ-Н",
      actPrefix: "АКТ-Н",
    },
  });
  const orgNoVat = await prisma.organization.create({
    data: {
      ...ipKlochkov,
      paymentMethod: "CASHLESS_NO_VAT",
      invoicePrefix: "СЧ-Б",
      actPrefix: "АКТ-Б",
    },
  });
  const orgVat = await prisma.organization.create({
    data: {
      name: 'ООО "Рэдианс"',
      shortName: "Рэдианс",
      inn: "5503237742",
      kpp: "550701001",
      ogrn: "1125543050027",
      legalAddress: "644103, г. Омск, ул. Авиационная, д. 146",
      phone: "+79507862923",
      email: "zaruchatskaia@mail.ru",
      bankName: "Омское отделение №8634 ПАО Сбербанк",
      bik: "045209673",
      account: "40702810345000000299",
      corrAccount: "30101810900000000673",
      directorName: "Гуреев С.В.",
      directorTitle: "Директор",
      vatRate: 22,
      paymentMethod: "CASHLESS_VAT",
      invoicePrefix: "СЧ-Т",
      actPrefix: "АКТ-Т",
    },
  });
  const orgByPay = {
    CASH: orgCash,
    CASHLESS_NO_VAT: orgNoVat,
    CASHLESS_VAT: orgVat,
  } as const;

  const excavator = await prisma.equipmentType.create({ data: { name: "Экскаватор-погрузчик" } });
  const dump = await prisma.equipmentType.create({ data: { name: "Самосвал 8х4" } });
  const crane = await prisma.equipmentType.create({ data: { name: "Автокран" } });
  const manip = await prisma.equipmentType.create({ data: { name: "Автоманипулятор" } });
  const mini = await prisma.equipmentType.create({ data: { name: "Мини-трактор" } });
  const gazelle = await prisma.equipmentType.create({ data: { name: "Газель" } });

  const units = await Promise.all([
    prisma.equipment.create({
      data: { typeId: excavator.id, name: "Hidromek 102B", plateNumber: "55МУ5519", status: "AVAILABLE" },
    }),
    prisma.equipment.create({
      data: { typeId: dump.id, name: "Shacman SX33186T366 SX33", plateNumber: "В866НМ155", status: "AVAILABLE" },
    }),
    prisma.equipment.create({
      data: { typeId: manip.id, name: "Shacman KGSG04-14", plateNumber: "А165ВХ155", status: "AVAILABLE" },
    }),
    prisma.equipment.create({
      data: { typeId: gazelle.id, name: "2824DH", plateNumber: "А937АС155", status: "AVAILABLE" },
    }),
    prisma.equipment.create({
      data: { typeId: mini.id, name: "R10-5Eco", plateNumber: "БЕЗ НОМЕРА", status: "AVAILABLE" },
    }),
  ]);
  const workUnits = units.filter((u) => u.status !== "REPAIR");
  const unitsByType: Record<string, typeof workUnits> = {};
  for (const u of workUnits) {
    (unitsByType[u.typeId] ||= []).push(u);
  }

  const drivers = await Promise.all([
    prisma.driver.create({
      data: { userId: driverUsers[0].id, licenseNumber: "77 АА 123456", defaultEquipmentId: units[0].id },
    }),
    prisma.driver.create({
      data: { userId: driverUsers[1].id, licenseNumber: "77 ВВ 654321", defaultEquipmentId: units[1].id },
    }),
    prisma.driver.create({
      data: { userId: driverUsers[2].id, licenseNumber: "77 СС 111222", defaultEquipmentId: units[2].id },
    }),
    prisma.driver.create({
      data: { userId: driverUsers[3].id, licenseNumber: "77 ЕЕ 333444", defaultEquipmentId: units[3].id },
    }),
    prisma.driver.create({
      data: { userId: driverUsers[4].id, licenseNumber: "77 КК 555666" },
    }),
    prisma.driver.create({
      data: { userId: driverUsers[5].id, licenseNumber: "77 ММ 777888" },
    }),
    prisma.driver.create({
      data: { userId: driverUsers[6].id, licenseNumber: "77 НН 999000" },
    }),
  ]);
  const driverByType: Record<string, (typeof drivers)[0]> = {
    [excavator.id]: drivers[0],
    [dump.id]: drivers[1],
    [manip.id]: drivers[2],
    [gazelle.id]: drivers[3],
    [mini.id]: drivers[4],
  };
  const driverUser = Object.fromEntries(drivers.slice(0, 4).map((d, i) => [d.id, driverUsers[i]]));

  const prices = [
    { typeId: dump.id, kind: "HOUR", amount: 2500, label: "Моточас самосвала 8х4" },
    { typeId: dump.id, kind: "DELIVERY", amount: 2000, label: "Подача самосвала 8х4" },
    { typeId: dump.id, kind: "MIN_HOURS", amount: 3, label: "Минимум часов" },
    { typeId: dump.id, kind: "IDLE", amount: 1200, label: "Простой самосвала, час" },
    { typeId: manip.id, kind: "HOUR", amount: 3000, label: "Моточас автоманипулятора" },
    { typeId: manip.id, kind: "DELIVERY", amount: 2000, label: "Подача автоманипулятора" },
    { typeId: manip.id, kind: "MIN_HOURS", amount: 3, label: "Минимум часов" },
    { typeId: manip.id, kind: "IDLE", amount: 1500, label: "Простой автоманипулятора, час" },
    { typeId: excavator.id, kind: "HOUR", amount: 2500, label: "Моточас экскаватора-погрузчика" },
    { typeId: excavator.id, kind: "DELIVERY", amount: 3000, label: "Подача экскаватора-погрузчика" },
    { typeId: excavator.id, kind: "MIN_HOURS", amount: 3, label: "Минимум часов" },
    { typeId: excavator.id, kind: "IDLE", amount: 1200, label: "Простой экскаватора-погрузчика, час" },
    { typeId: mini.id, kind: "HOUR", amount: 2500, label: "Моточас мини-трактора" },
    { typeId: mini.id, kind: "DELIVERY", amount: 3000, label: "Подача мини-трактора, город" },
    { typeId: mini.id, kind: "DELIVERY_REGION", amount: 5000, label: "Подача мини-трактора, область" },
    { typeId: mini.id, kind: "MIN_HOURS", amount: 3, label: "Минимум часов" },
    { typeId: crane.id, kind: "DELIVERY", amount: 12000, label: "Подача автокрана" },
    { typeId: crane.id, kind: "HOUR", amount: 6500, label: "Моточас автокрана" },
    { typeId: crane.id, kind: "IDLE", amount: 2500, label: "Простой автокрана, час" },
    { typeId: gazelle.id, kind: "HOUR", amount: 2000, label: "Моточас газели" },
    { typeId: gazelle.id, kind: "DELIVERY", amount: 1500, label: "Подача газели" },
    { typeId: gazelle.id, kind: "MIN_HOURS", amount: 3, label: "Минимум часов" },
    { typeId: gazelle.id, kind: "IDLE", amount: 800, label: "Простой газели, час" },
  ];
  await prisma.priceItem.createMany({
    data: prices.map((p) => ({
      equipmentTypeId: p.typeId,
      kind: p.kind,
      amount: p.amount,
      label: p.label,
    })),
  });

  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        type: "COMPANY",
        name: 'ООО "СтройАльянс"',
        inn: "7734567890",
        kpp: "773401001",
        address: "г. Москва, ул. Строителей, д. 8",
        contactName: "Орлов Павел",
        phone: "+79011223344",
        email: "orlov@stroyalliance.local",
        defaultPaymentMethod: "CASHLESS_VAT",
      },
    }),
    prisma.customer.create({
      data: {
        type: "COMPANY",
        name: 'ООО "ДорСтрой"',
        inn: "7745678901",
        kpp: "774501001",
        address: "МО, г. Подольск, ул. Ленина, д. 15",
        contactName: "Васильева Елена",
        phone: "+79022334455",
        email: "info@dorstroy.local",
        defaultPaymentMethod: "CASHLESS_NO_VAT",
      },
    }),
    prisma.customer.create({
      data: {
        type: "INDIVIDUAL",
        name: "Козлов Николай",
        address: "МО, д. Иваново",
        contactName: "Козлов Николай",
        phone: "+79033445566",
        defaultPaymentMethod: "CASH",
        notes: "Частный заказчик, наличные",
      },
    }),
    prisma.customer.create({
      data: {
        type: "COMPANY",
        name: 'ООО "ЖилСтрой МСК"',
        inn: "7756789012",
        kpp: "775601001",
        address: "г. Москва, Рязанский пр-т, д. 42",
        contactName: "Белов Артём",
        phone: "+79044556677",
        email: "belov@zilstroy.local",
        defaultPaymentMethod: "CASHLESS_VAT",
      },
    }),
    prisma.customer.create({
      data: {
        type: "COMPANY",
        name: "ИП Морозов С.Н.",
        inn: "771122334455",
        address: "МО, г. Видное, ул. Заводская, д. 3",
        contactName: "Морозов Сергей",
        phone: "+79055667788",
        defaultPaymentMethod: "CASH",
      },
    }),
    prisma.customer.create({
      data: {
        type: "COMPANY",
        name: 'ООО "МегаФундамент"',
        inn: "7767890123",
        kpp: "776701001",
        address: "г. Москва, Калужское ш., д. 21",
        contactName: "Громова Анна",
        phone: "+79066778899",
        email: "anna@megafund.local",
        defaultPaymentMethod: "CASHLESS_NO_VAT",
      },
    }),
  ]);

  await prisma.smsTemplate.createMany({
    data: [
      {
        key: "ORDER_ASSIGNED_CUSTOMER",
        name: "Заказчику: техника назначена",
        text: "Рэдианс-СпецТех: по заявке {number} назначена техника {equipment}, водитель {driver}, {datetime}. Объект: {address}",
      },
      {
        key: "ORDER_ASSIGNED_DRIVER",
        name: "Водителю: новая заявка",
        text: "Рэдианс-СпецТех: новая заявка {number} на {datetime}. Объект: {address}. Откройте кабинет: {url}",
      },
      {
        key: "ORDER_DOCS_READY",
        name: "Заказчику: счёт и акт",
        text: "Рэдианс-СпецТех: работы по заявке {number} выполнены. Счёт {invoice} и акт {act}: {url}",
      },
      {
        key: "ORDER_CANCELLED_CUSTOMER",
        name: "Заказчику: отмена",
        text: "Рэдианс-СпецТех: заявка {number} отменена. {reason}",
      },
      {
        key: "PUBLIC_ORDER_CUSTOMER",
        name: "Заказчику: заявка с сайта",
        text: "Рэдианс-СпецТех: заявка {number} принята. Диспетчер перезвонит и подтвердит подачу.",
      },
    ],
  });

  const sites = [
    { address: "г. Москва, Каширское ш., д. 31, котлован", contact: "прораб Михаил", phone: "+79019998877" },
    { address: "МО, г. Подольск, ЖК «Южный», корпус 4", contact: "прораб Олег", phone: "+79018887766" },
    { address: "г. Москва, ул. Академика Янгеля, д. 6, разгрузка", contact: "кладовщик Ирина", phone: "+79017776655" },
    { address: "МО, Ленинский р-н, д. Дрожжино, фундамент", contact: "мастер Алексей", phone: "+79016665544" },
    { address: "г. Москва, Варшавское ш., д. 125, снос павильона", contact: "прораб Денис", phone: "+79015554433" },
    { address: "МО, г. Видное, складской комплекс «Южные врата»", contact: "инженер Наталья", phone: "+79014443322" },
    { address: "г. Москва, Калужское ш., 21-й км, коттеджный посёлок", contact: "заказчик на объекте", phone: "+79013332211" },
    { address: "г. Москва, Рязанский пр-т, д. 42, монтаж перекрытий", contact: "бригадир Роман", phone: "+79012221100" },
    { address: "МО, г. Домодедово, промзона, выемка грунта", contact: "прораб Виктор", phone: "+79011110099" },
    { address: "г. Москва, Нагатинская наб., д. 10, благоустройство", contact: "мастер Елена", phone: "+79010009988" },
  ];
  const comments = [
    "Подача к 8:00, въезд со стороны двора",
    "Нужны опорные плиты, грунт слабый",
    "Работа в две смены возможна",
    "Согласовать проезд с охраной КПП",
    "Не заезжать на газон",
    null,
    "Счётчик моточасов сфотографировать",
    null,
  ];
  const types = [excavator, dump, manip, gazelle, mini];
  const staffCreators = [admin.id, manager.id];

  const today = new Date(2026, 7, 21, 12, 0, 0, 0);
  const start = new Date(2026, 1, 21);
  const end = new Date(2026, 7, 28);

  type Planned = {
    day: Date;
    live?: string;
  };
  const planned: Planned[] = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const daysAhead = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (isWeekend) {
      if (rand() < 0.22) planned.push({ day: new Date(d) });
      continue;
    }
    const count = daysAhead > 7 ? 0 : rand() < 0.15 ? 3 : rand() < 0.55 ? 2 : 1;
    const n = Math.max(1, count);
    for (let i = 0; i < n; i++) planned.push({ day: new Date(d) });
  }

  const liveSlots: { status: string; offset: number }[] = [
    { status: "NEW", offset: 0 },
    { status: "DECLINED", offset: 0 },
    { status: "ASSIGNED", offset: 0 },
    { status: "ASSIGNED", offset: 1 },
    { status: "ACCEPTED", offset: 0 },
    { status: "EN_ROUTE", offset: 0 },
    { status: "ON_SITE", offset: 0 },
    { status: "REPORT_SUBMITTED", offset: -1 },
    { status: "VERIFIED", offset: -1 },
    { status: "AWAITING_PAYMENT", offset: -3 },
    { status: "AWAITING_PAYMENT", offset: -8 },
    { status: "AWAITING_PAYMENT", offset: -14 },
  ];
  for (const slot of liveSlots) {
    const day = addDays(today, slot.offset);
    const hit = planned.find((p) => !p.live && p.day.toDateString() === day.toDateString());
    if (hit) hit.live = slot.status;
    else planned.push({ day, live: slot.status });
  }

  planned.sort((a, b) => a.day.getTime() - b.day.getTime());

  const counters = { CASH: 0, CASHLESS_NO_VAT: 0, CASHLESS_VAT: 0 };
  let orderNo = 0;
  const busyIds = new Set<string>();
  const smsLogs: {
    to: string;
    text: string;
    purpose: string;
    status: string;
    orderId: string;
    createdAt: Date;
  }[] = [];
  const notifications: {
    userId: string;
    type: string;
    title: string;
    body: string;
    orderId: string;
    read: boolean;
    createdAt: Date;
  }[] = [];

  let paidCount = 0;
  let unpaidCount = 0;
  let cancelledCount = 0;
  let liveCount = 0;

  planned.length = 0;

  for (const item of planned) {
    orderNo += 1;
    const number = formatOrderNumber(orderNo, item.day);
    const customer = pick(rand, customers);
    const type = pick(rand, types);
    const payment = customer.defaultPaymentMethod as keyof typeof orgByPay;
    const org = orgByPay[payment];
    const equipment = pick(rand, unitsByType[type.id] || workUnits);
    const driver = driverByType[type.id];
    const site = pick(rand, sites);
    const hour = pick(rand, [7, 8, 8, 9, 10]);
    const scheduledAt = atHour(item.day, hour, pick(rand, [0, 0, 30]));
    const createdAt = addDays(scheduledAt, -pick(rand, [1, 1, 2, 3]));
    const weekend = scheduledAt.getDay() === 0 || scheduledAt.getDay() === 6;
    const daysAhead = (item.day.getTime() - today.getTime()) / 86400000;

    let status = item.live;
    if (!status) {
      if (daysAhead > 1) status = "ASSIGNED";
      else if (rand() < 0.06) status = "CANCELLED";
      else if (rand() < 0.1) status = "AWAITING_PAYMENT";
      else status = "PAID";
    }

    const assigned = status !== "NEW";
    const driverIdFinal = status === "NEW" || status === "DECLINED" ? null : driver.id;
    const equipmentIdFinal = status === "NEW" ? null : equipment.id;

    if (["ASSIGNED", "ACCEPTED", "EN_ROUTE", "ON_SITE"].includes(status) && equipmentIdFinal) {
      busyIds.add(equipmentIdFinal);
    }

    const reportNeeded = ["REPORT_SUBMITTED", "VERIFIED", "AWAITING_PAYMENT", "PAID"].includes(status);
    const docsNeeded = ["AWAITING_PAYMENT", "PAID"].includes(status);
    const hours = pick(rand, [6, 7, 8, 8, 8, 9, 10, 12]);
    const idle = rand() < 0.35 ? pick(rand, [0.5, 1, 1.5, 2]) : 0;
    const km = pick(rand, [12, 18, 25, 32, 40, 55]);
    const report = {
      deliveryQty: 1,
      hours,
      idleHours: idle,
      km,
      isWeekend: weekend,
    };
    const vatRate = payment === "CASHLESS_VAT" ? org.vatRate : 0;
    const moneyCalc = calc(prices, type.id, report, vatRate);

    const order = await prisma.order.create({
      data: {
        number,
        customerId: customer.id,
        organizationId: org.id,
        paymentMethod: payment,
        equipmentTypeId: type.id,
        equipmentId: equipmentIdFinal,
        driverId: driverIdFinal,
        address: site.address,
        siteContact: site.contact,
        sitePhone: site.phone,
        scheduledAt,
        comment:
          status === "CANCELLED"
            ? "Заказчик перенёс работы"
            : status === "DECLINED"
              ? `Отказ водителя: ${pick(rand, ["болезнь", "техника на ТО", "не успеваю с предыдущего объекта"])}`
              : pick(rand, comments),
        status,
        cancelReason: status === "CANCELLED" ? pick(rand, ["Заказчик отменил", "Нет заезда на объект", "Перенос на следующий месяц"]) : null,
        assignedAt: assigned ? addDays(createdAt, 0) : null,
        acceptedAt: ["ACCEPTED", "EN_ROUTE", "ON_SITE", "REPORT_SUBMITTED", "VERIFIED", "AWAITING_PAYMENT", "PAID"].includes(status)
          ? addDays(scheduledAt, 0)
          : null,
        createdById: pick(rand, staffCreators),
        createdAt,
        updatedAt: scheduledAt,
      },
    });

    if (assigned && driverIdFinal) {
      const dt = scheduledAt.toLocaleString("ru-RU");
      const eqName = `${equipment.name} ${equipment.plateNumber}`;
      const drvName = driverUser[driver.id].name;
      smsLogs.push(
        {
          to: customer.phone,
          text: `Рэдианс-СпецТех: по заявке ${number} назначена техника ${eqName}, водитель ${drvName}, ${dt}. Объект: ${site.address}`,
          purpose: "ORDER_ASSIGNED_CUSTOMER",
          status: "MOCK",
          orderId: order.id,
          createdAt: order.assignedAt || createdAt,
        },
        {
          to: driverUser[driver.id].phone || "",
          text: `Рэдианс-СпецТех: новая заявка ${number} на ${dt}. Объект: ${site.address}. Откройте кабинет: http://localhost:3000`,
          purpose: "ORDER_ASSIGNED_DRIVER",
          status: "MOCK",
          orderId: order.id,
          createdAt: order.assignedAt || createdAt,
        },
      );
    }
    if (status === "CANCELLED") {
      smsLogs.push({
        to: customer.phone,
        text: `Рэдианс-СпецТех: заявка ${number} отменена. ${order.cancelReason || ""}`,
        purpose: "ORDER_CANCELLED_CUSTOMER",
        status: "MOCK",
        orderId: order.id,
        createdAt: scheduledAt,
      });
      cancelledCount += 1;
    }

    if (reportNeeded) {
      await prisma.workReport.create({
        data: {
          orderId: order.id,
          ...report,
          comment: weekend ? "Работа в выходной" : idle ? "Был простой из-за поставки бетона" : null,
          submittedAt: atHour(scheduledAt, 18, 30),
          verifiedAt: status === "REPORT_SUBMITTED" ? null : atHour(addDays(scheduledAt, 0), 19, 10),
          verifiedById: status === "REPORT_SUBMITTED" ? null : manager.id,
        },
      });
    }

    if (docsNeeded) {
      counters[payment] += 1;
      const n = counters[payment];
      const year = 2026;
      const invoiceNumber = `${org.invoicePrefix}-${year}-${String(n).padStart(4, "0")}`;
      const actNumber = `${org.actPrefix}-${year}-${String(n).padStart(4, "0")}`;
      const issuedAt = atHour(addDays(scheduledAt, 1), 10, 0);
      const invToken = token();
      const invoice = await prisma.invoice.create({
        data: {
          number: invoiceNumber,
          orderId: order.id,
          organizationId: org.id,
          issuedAt,
          amount: moneyCalc.total,
          vatAmount: moneyCalc.vatAmount,
          status: status === "PAID" ? "PAID" : "UNPAID",
          publicToken: invToken,
          linesJson: JSON.stringify(moneyCalc.lines),
        },
      });
      await prisma.act.create({
        data: {
          number: actNumber,
          orderId: order.id,
          organizationId: org.id,
          issuedAt,
          amount: moneyCalc.total,
          vatAmount: moneyCalc.vatAmount,
          publicToken: token(),
          linesJson: JSON.stringify(moneyCalc.lines),
        },
      });
      smsLogs.push({
        to: customer.phone,
        text: `Рэдианс-СпецТех: работы по заявке ${number} выполнены. Счёт ${invoiceNumber} и акт ${actNumber}: http://localhost:3000/d/${invToken}`,
        purpose: "ORDER_DOCS_READY",
        status: "MOCK",
        orderId: order.id,
        createdAt: issuedAt,
      });

      if (status === "PAID") {
        const paidAt = addDays(issuedAt, pick(rand, [2, 3, 5, 7, 10]));
        await prisma.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: moneyCalc.total,
            paidAt,
            comment: payment === "CASH" ? "Наличные в кассу" : `п/п №${1000 + orderNo}`,
            recordedById: pick(rand, [accountant.id, manager.id]),
          },
        });
        paidCount += 1;
      } else {
        unpaidCount += 1;
        for (const uid of [admin.id, manager.id, accountant.id]) {
          notifications.push({
            userId: uid,
            type: "PAYMENT",
            title: "Счёт ожидает оплаты",
            body: `По счёту ${invoiceNumber} (${customer.name}) не поступила оплата: ${moneyCalc.total.toLocaleString("ru-RU")} ₽`,
            orderId: order.id,
            read: daysAhead < -10,
            createdAt: addDays(issuedAt, 5),
          });
        }
      }
    }

    if (status === "DECLINED") {
      liveCount += 1;
      for (const uid of [admin.id, manager.id]) {
        notifications.push({
          userId: uid,
          type: "DRIVER_DECLINED",
          title: "Отказ водителя",
          body: `${driverUser[driver.id].name} отказался от заявки ${number}`,
          orderId: order.id,
          read: false,
          createdAt: today,
        });
      }
    }
    if (status === "REPORT_SUBMITTED") {
      liveCount += 1;
      for (const uid of [admin.id, manager.id]) {
        notifications.push({
          userId: uid,
          type: "REPORT_SUBMITTED",
          title: "Отчёт сдан",
          body: `${driverUser[driver.id].name} сдал отчёт по заявке ${number}`,
          orderId: order.id,
          read: false,
          createdAt: atHour(addDays(today, -1), 18, 40),
        });
      }
    }
    if (["NEW", "ASSIGNED", "ACCEPTED", "EN_ROUTE", "ON_SITE", "VERIFIED"].includes(status)) liveCount += 1;
  }

  await prisma.organization.update({ where: { id: orgCash.id }, data: { lastInvoiceNo: counters.CASH, lastActNo: counters.CASH } });
  await prisma.organization.update({
    where: { id: orgNoVat.id },
    data: { lastInvoiceNo: counters.CASHLESS_NO_VAT, lastActNo: counters.CASHLESS_NO_VAT },
  });
  await prisma.organization.update({
    where: { id: orgVat.id },
    data: { lastInvoiceNo: counters.CASHLESS_VAT, lastActNo: counters.CASHLESS_VAT },
  });
  await prisma.appSequence.create({ data: { key: "order", value: orderNo } });

  for (const u of workUnits) {
    await prisma.equipment.update({
      where: { id: u.id },
      data: { status: busyIds.has(u.id) ? "BUSY" : "AVAILABLE" },
    });
  }

  if (smsLogs.length) {
    const chunk = 80;
    for (let i = 0; i < smsLogs.length; i += chunk) {
      await prisma.smsLog.createMany({ data: smsLogs.slice(i, i + chunk) });
    }
  }
  if (notifications.length) {
    await prisma.notification.createMany({ data: notifications });
  }

  console.log("Seed OK — демо за полгода (21.02.2026 — 28.08.2026)");
  console.log(`Заявок: ${orderNo}, оплачено: ${paidCount}, ждут оплату: ${unpaidCount}, отменено: ${cancelledCount}, в работе: ${liveCount}`);
  console.log("Главный менеджер: Литке Татьяна Сергеевна — tlitke/admin123 (также admin/admin123)");
  console.log("Водители: ivanov, petrov, sidorov, kuznetsov, ezaruchatsky, vplotnikov, fgimalov / driver123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
