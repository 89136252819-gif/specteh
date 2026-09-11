const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ipKlochkov = {
  name: "ИП Клочков Максим Игоревич",
  shortName: "ИП Клочков М.И.",
  inn: "550336005658",
  kpp: null,
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

const orgs = [
  {
    ...ipKlochkov,
    paymentMethod: "CASH",
    invoicePrefix: "СЧ-Н",
    actPrefix: "АКТ-Н",
  },
  {
    ...ipKlochkov,
    paymentMethod: "CASHLESS_NO_VAT",
    invoicePrefix: "СЧ-Б",
    actPrefix: "АКТ-Б",
  },
  {
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
];

const fleet = [
  { typeName: "Экскаватор-погрузчик", name: "Hidromek 102B", plateNumber: "55МУ5519" },
  { typeName: "Самосвал 8х4", name: "Shacman SX33186T366 SX33", plateNumber: "В866НМ155" },
  { typeName: "Автоманипулятор", name: "Shacman KGSG04-14", plateNumber: "А165ВХ155" },
  { typeName: "Газель", name: "2824DH", plateNumber: "А937АС155" },
  { typeName: "Мини-трактор", name: "R10-5Eco", plateNumber: "БЕЗ НОМЕРА" },
];

async function typeByName(name) {
  return (
    (await prisma.equipmentType.findUnique({ where: { name } })) ||
    (await prisma.equipmentType.create({ data: { name } }))
  );
}

async function main() {
  for (const org of orgs) {
    const existing = await prisma.organization.findUnique({ where: { paymentMethod: org.paymentMethod } });
    if (existing) {
      await prisma.organization.update({ where: { id: existing.id }, data: org });
      console.log(`Орг обновлена: ${org.shortName} / ${org.paymentMethod}`);
    } else {
      await prisma.organization.create({ data: org });
      console.log(`Орг создана: ${org.shortName} / ${org.paymentMethod}`);
    }
  }

  const keepPlates = new Set(fleet.map((u) => u.plateNumber));
  for (const unit of fleet) {
    const type = await typeByName(unit.typeName);
    const byPlate = await prisma.equipment.findUnique({ where: { plateNumber: unit.plateNumber } });
    if (byPlate) {
      await prisma.equipment.update({
        where: { id: byPlate.id },
        data: { name: unit.name, typeId: type.id, status: "AVAILABLE" },
      });
      console.log(`Техника обновлена: ${unit.name}`);
      continue;
    }
    const leftover = await prisma.equipment.findFirst({
      where: { typeId: type.id, plateNumber: { notIn: [...keepPlates] } },
    });
    if (leftover) {
      await prisma.equipment.update({
        where: { id: leftover.id },
        data: { name: unit.name, plateNumber: unit.plateNumber, typeId: type.id, status: "AVAILABLE" },
      });
      console.log(`Техника заменена: ${leftover.name} → ${unit.name}`);
    } else {
      await prisma.equipment.create({
        data: { typeId: type.id, name: unit.name, plateNumber: unit.plateNumber, status: "AVAILABLE" },
      });
      console.log(`Техника добавлена: ${unit.name}`);
    }
  }

  const extras = await prisma.equipment.findMany({
    where: { plateNumber: { notIn: [...keepPlates] } },
    include: { _count: { select: { orders: true } } },
  });
  for (const extra of extras) {
    if (extra._count.orders > 0) {
      console.log(`Оставлена с заявками: ${extra.name} ${extra.plateNumber}`);
      continue;
    }
    await prisma.driver.updateMany({ where: { defaultEquipmentId: extra.id }, data: { defaultEquipmentId: null } });
    await prisma.equipment.delete({ where: { id: extra.id } });
    console.log(`Удалена учебная: ${extra.name} ${extra.plateNumber}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
