const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  if (users > 0) {
    console.log("База уже заполнена, bootstrap пропущен.");
    return;
  }

  const hash = (password) => bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      login: "admin",
      passwordHash: await hash("admin123"),
      name: "Литке Татьяна Сергеевна",
      phone: "+79010101011",
      role: "ADMIN",
    },
  });
  await prisma.user.create({
    data: {
      login: "manager",
      passwordHash: await hash("manager123"),
      name: "Соколов Дмитрий",
      phone: "+79002223344",
      role: "MANAGER",
    },
  });
  await prisma.user.create({
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
      login: "tlitke",
      passwordHash: await hash("admin123"),
      name: "Литке Татьяна Сергеевна",
      phone: "+79010101011",
      role: "ADMIN",
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
      login: "mklochkov",
      passwordHash: await hash("admin123"),
      name: "Клочков Максим Игоревич",
      phone: "+79010101012",
      role: "ADMIN",
    },
  });

  const driverUsers = [];
  for (const [login, name, phone] of [
    ["ivanov", "Иванов Сергей", "+79001112201"],
    ["petrov", "Петров Алексей", "+79001112202"],
    ["sidorov", "Сидоров Павел", "+79001112203"],
    ["kuznetsov", "Кузнецов Игорь", "+79001112204"],
  ]) {
    driverUsers.push(
      await prisma.user.create({
        data: { login, passwordHash: await hash("driver123"), name, phone, role: "DRIVER" },
      }),
    );
  }

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
  };

  await prisma.organization.create({
    data: {
      ...ipKlochkov,
      paymentMethod: "CASH",
      invoicePrefix: "СЧ-Н",
      actPrefix: "АКТ-Н",
    },
  });
  await prisma.organization.create({
    data: {
      ...ipKlochkov,
      paymentMethod: "CASHLESS_NO_VAT",
      invoicePrefix: "СЧ-Б",
      actPrefix: "АКТ-Б",
    },
  });
  await prisma.organization.create({
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

  await prisma.driver.create({
    data: { userId: driverUsers[0].id, licenseNumber: "77 АА 123456", defaultEquipmentId: units[0].id },
  });
  await prisma.driver.create({
    data: { userId: driverUsers[1].id, licenseNumber: "77 ВВ 654321", defaultEquipmentId: units[1].id },
  });
  await prisma.driver.create({
    data: { userId: driverUsers[2].id, licenseNumber: "77 СС 111222", defaultEquipmentId: units[2].id },
  });
  await prisma.driver.create({
    data: { userId: driverUsers[3].id, licenseNumber: "77 ЕЕ 333444", defaultEquipmentId: units[3].id },
  });

  await prisma.priceItem.createMany({
    data: [
      { equipmentTypeId: dump.id, kind: "HOUR", amount: 2500, label: "Моточас самосвала 8х4" },
      { equipmentTypeId: dump.id, kind: "DELIVERY", amount: 2000, label: "Подача самосвала 8х4" },
      { equipmentTypeId: dump.id, kind: "MIN_HOURS", amount: 3, label: "Минимум часов" },
      { equipmentTypeId: manip.id, kind: "HOUR", amount: 3000, label: "Моточас автоманипулятора" },
      { equipmentTypeId: manip.id, kind: "DELIVERY", amount: 2000, label: "Подача автоманипулятора" },
      { equipmentTypeId: manip.id, kind: "MIN_HOURS", amount: 3, label: "Минимум часов" },
      { equipmentTypeId: excavator.id, kind: "HOUR", amount: 2500, label: "Моточас экскаватора-погрузчика" },
      { equipmentTypeId: excavator.id, kind: "DELIVERY", amount: 3000, label: "Подача экскаватора-погрузчика" },
      { equipmentTypeId: excavator.id, kind: "MIN_HOURS", amount: 3, label: "Минимум часов" },
      { equipmentTypeId: mini.id, kind: "HOUR", amount: 2500, label: "Моточас мини-трактора" },
      { equipmentTypeId: mini.id, kind: "DELIVERY", amount: 3000, label: "Подача мини-трактора, город" },
      { equipmentTypeId: mini.id, kind: "DELIVERY_REGION", amount: 5000, label: "Подача мини-трактора, область" },
      { equipmentTypeId: mini.id, kind: "MIN_HOURS", amount: 3, label: "Минимум часов" },
      { equipmentTypeId: crane.id, kind: "DELIVERY", amount: 12000, label: "Подача автокрана" },
      { equipmentTypeId: crane.id, kind: "HOUR", amount: 6500, label: "Моточас автокрана" },
      { equipmentTypeId: gazelle.id, kind: "HOUR", amount: 2000, label: "Моточас газели" },
      { equipmentTypeId: gazelle.id, kind: "DELIVERY", amount: 1500, label: "Подача газели" },
      { equipmentTypeId: gazelle.id, kind: "MIN_HOURS", amount: 3, label: "Минимум часов" },
    ],
  });

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

  console.log("Стартовые данные записаны. Вход: admin / admin123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
