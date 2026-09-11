"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import fs from "fs/promises";
import { prisma } from "@/lib/db";
import { hashPassword, requireStaff } from "@/lib/auth";
import { ROLES, STAFF_ROLES, type Role } from "@/lib/constants";
import { sendSms } from "@/lib/sms";
import {
  FACSIMILE_MAX_BYTES,
  FACSIMILE_TYPES,
  orgAssetPath,
  orgAssetsDir,
} from "@/lib/org-assets";

export async function saveCustomer(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") || "");
  const force = formData.get("forceDuplicate") === "1";
  const data = {
    type: String(formData.get("type") || "COMPANY"),
    name: String(formData.get("name") || "").trim(),
    inn: String(formData.get("inn") || "") || null,
    kpp: String(formData.get("kpp") || "") || null,
    address: String(formData.get("address") || "") || null,
    contactName: String(formData.get("contactName") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    email: String(formData.get("email") || "") || null,
    defaultPaymentMethod: String(formData.get("defaultPaymentMethod") || "CASHLESS_VAT"),
    notes: String(formData.get("notes") || "") || null,
  };
  if (!data.name || !data.contactName || !data.phone) return;

  if (!force) {
    const phoneKey = data.phone.replace(/\D/g, "").slice(-10);
    const or: { inn?: string; phone?: { contains: string } }[] = [];
    if (data.inn) or.push({ inn: data.inn });
    if (phoneKey.length >= 10) or.push({ phone: { contains: phoneKey } });
    if (or.length) {
      const candidates = await prisma.customer.findMany({
        where: {
          ...(id ? { id: { not: id } } : {}),
          OR: or,
        },
        select: { id: true, name: true, phone: true, inn: true },
        take: 10,
      });
      const dupes = candidates.filter((row) => {
        const sameInn = Boolean(data.inn && row.inn === data.inn);
        const samePhone = Boolean(phoneKey && row.phone.replace(/\D/g, "").slice(-10) === phoneKey);
        return sameInn || samePhone;
      });
      if (dupes.length) {
        const tip = dupes.map((d) => d.name).join(", ");
        redirect(
          `/customers${id ? `/${id}` : "/new"}?error=` +
            encodeURIComponent(`Похожий заказчик уже есть: ${tip}. Отметьте «Сохранить несмотря на дубль» или объедините карточки.`),
        );
      }
    }
  }

  if (id) {
    await prisma.customer.update({ where: { id }, data });
  } else {
    await prisma.customer.create({ data });
  }
  revalidatePath("/customers");
  revalidatePath("/orders/new");
  revalidatePath("/settings/prices");
  if (id) {
    revalidatePath(`/customers/${id}`);
    return;
  }
  redirect("/customers");
}

export async function mergeCustomers(keepId: string, absorbId: string) {
  await requireStaff();
  if (!keepId || !absorbId || keepId === absorbId) return { ok: false as const, error: "Выберите две разные карточки" };
  const [keep, absorb] = await Promise.all([
    prisma.customer.findUnique({ where: { id: keepId } }),
    prisma.customer.findUnique({ where: { id: absorbId } }),
  ]);
  if (!keep || !absorb) return { ok: false as const, error: "Заказчик не найден" };

  await prisma.$transaction([
    prisma.order.updateMany({ where: { customerId: absorbId }, data: { customerId: keepId } }),
    prisma.priceItem.updateMany({ where: { customerId: absorbId }, data: { customerId: keepId } }),
    prisma.customer.delete({ where: { id: absorbId } }),
  ]);
  if (!keep.maxUserId && absorb.maxUserId) {
    await prisma.customer.update({ where: { id: keepId }, data: { maxUserId: absorb.maxUserId } });
  }
  revalidatePath("/customers");
  revalidatePath(`/customers/${keepId}`);
  revalidatePath("/orders");
  return { ok: true as const };
}

export async function deleteCustomer(id: string) {
  await requireStaff();
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { _count: { select: { orders: true } } },
  });
  if (!customer) redirect("/customers");
  if (customer._count.orders > 0) {
    redirect("/customers?error=orders");
  }
  await prisma.customer.delete({ where: { id } });
  revalidatePath("/customers");
  revalidatePath("/orders/new");
  revalidatePath("/settings/prices");
  redirect("/customers");
}

export async function saveOrganization(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") || "");
  const data = {
    name: String(formData.get("name") || "").trim(),
    shortName: String(formData.get("shortName") || "").trim(),
    inn: String(formData.get("inn") || "").trim(),
    kpp: String(formData.get("kpp") || "") || null,
    ogrn: String(formData.get("ogrn") || "") || null,
    legalAddress: String(formData.get("legalAddress") || "").trim(),
    phone: String(formData.get("phone") || "") || null,
    email: String(formData.get("email") || "") || null,
    bankName: String(formData.get("bankName") || "").trim(),
    bik: String(formData.get("bik") || "").trim(),
    account: String(formData.get("account") || "").trim(),
    corrAccount: String(formData.get("corrAccount") || "").trim(),
    directorName: String(formData.get("directorName") || "").trim(),
    directorTitle: String(formData.get("directorTitle") || "Директор"),
    vatRate: Number(formData.get("vatRate") || 0),
    paymentMethod: String(formData.get("paymentMethod") || ""),
    invoicePrefix: String(formData.get("invoicePrefix") || "СЧ"),
    actPrefix: String(formData.get("actPrefix") || "АКТ"),
    isActive: formData.get("isActive") !== "off",
  };
  if (!data.name || !data.inn || !data.paymentMethod) return;
  if (id) await prisma.organization.update({ where: { id }, data });
  else await prisma.organization.create({ data });
  revalidatePath("/settings/organizations");
  return;
}

export async function uploadOrganizationFacsimile(formData: FormData) {
  await requireStaff();
  const orgId = String(formData.get("orgId") || "");
  const kind = String(formData.get("kind") || "");
  if (!orgId || (kind !== "signature" && kind !== "stamp")) {
    return { ok: false as const, error: "Некорректные параметры" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false as const, error: "Выберите файл" };
  }
  if (file.size > FACSIMILE_MAX_BYTES) {
    return { ok: false as const, error: "Файл больше 2 МБ" };
  }
  if (!FACSIMILE_TYPES.has(file.type)) {
    return { ok: false as const, error: "Нужен PNG или WebP с прозрачным фоном" };
  }

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } });
  if (!org) return { ok: false as const, error: "Организация не найдена" };

  const ext = file.type === "image/webp" ? "webp" : "png";
  const filename = `${kind}.${ext}`;
  const field = kind === "signature" ? "signatureFile" : "stampFile";
  const existing = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { signatureFile: true, stampFile: true },
  });

  await fs.mkdir(orgAssetsDir(orgId), { recursive: true });
  await fs.writeFile(orgAssetPath(orgId, filename), Buffer.from(await file.arrayBuffer()));

  const prev = existing?.[field];
  if (prev && prev !== filename) {
    await fs.unlink(orgAssetPath(orgId, prev)).catch(() => undefined);
  }

  await prisma.organization.update({ where: { id: orgId }, data: { [field]: filename } });
  revalidatePath("/settings/organizations");
  return { ok: true as const };
}

export async function removeOrganizationFacsimile(orgId: string, kind: "signature" | "stamp") {
  await requireStaff();
  if (!orgId || (kind !== "signature" && kind !== "stamp")) {
    return { ok: false as const, error: "Некорректные параметры" };
  }
  const field = kind === "signature" ? "signatureFile" : "stampFile";
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { signatureFile: true, stampFile: true },
  });
  if (!org) return { ok: false as const, error: "Организация не найдена" };

  const filename = org[field];
  if (filename) {
    await fs.unlink(orgAssetPath(orgId, filename)).catch(() => undefined);
  }
  await prisma.organization.update({ where: { id: orgId }, data: { [field]: null } });
  revalidatePath("/settings/organizations");
  return { ok: true as const };
}

function isUniqueConstraint(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002";
}

function refreshFleet() {
  revalidatePath("/fleet");
  revalidatePath("/dispatch");
  revalidatePath("/calendar");
  revalidatePath("/drivers");
}

export async function saveEquipmentType(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  try {
    if (id) await prisma.equipmentType.update({ where: { id }, data: { name } });
    else await prisma.equipmentType.create({ data: { name } });
  } catch (error) {
    if (isUniqueConstraint(error)) return { error: "Тип с таким названием уже есть." };
    throw error;
  }
  refreshFleet();
  return { error: null };
}

export async function deleteEquipmentType(id: string) {
  await requireStaff();
  const type = await prisma.equipmentType.findUnique({
    where: { id },
    include: { _count: { select: { units: true, orders: true, priceItems: true } } },
  });
  if (!type) return { error: "Тип не найден" };
  if (type._count.units || type._count.orders || type._count.priceItems) {
    return { error: "Нельзя удалить: к типу привязаны техника, заявки или цены." };
  }
  await prisma.equipmentType.delete({ where: { id } });
  refreshFleet();
  return { error: null };
}

export async function saveEquipment(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") || "");
  const data = {
    typeId: String(formData.get("typeId") || ""),
    name: String(formData.get("name") || "").trim(),
    plateNumber: String(formData.get("plateNumber") || "").trim().toUpperCase(),
    status: String(formData.get("status") || "AVAILABLE"),
    notes: String(formData.get("notes") || "") || null,
  };
  if (!data.typeId || !data.name || !data.plateNumber) return;
  try {
    if (id) await prisma.equipment.update({ where: { id }, data });
    else await prisma.equipment.create({ data });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      redirect(id ? `/fleet?id=${id}&error=plate` : "/fleet?error=plate");
    }
    throw error;
  }
  refreshFleet();
  redirect("/fleet");
}

export async function deleteEquipment(id: string) {
  await requireStaff();
  const unit = await prisma.equipment.findUnique({
    where: { id },
    include: { _count: { select: { orders: true } } },
  });
  if (!unit) redirect("/fleet");
  if (unit._count.orders > 0) {
    redirect(`/fleet?id=${id}&error=orders`);
  }
  await prisma.$transaction([
    prisma.driver.updateMany({ where: { defaultEquipmentId: id }, data: { defaultEquipmentId: null } }),
    prisma.equipment.delete({ where: { id } }),
  ]);
  refreshFleet();
  redirect("/fleet");
}

export async function saveDriver(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const login = String(formData.get("login") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const licenseNumber = String(formData.get("licenseNumber") || "") || null;
  const defaultEquipmentId = String(formData.get("defaultEquipmentId") || "") || null;
  const password = String(formData.get("password") || "");

  if (!name || !login || !phone) return;
  if (!id && !password) return;

  try {
    if (id) {
      const driver = await prisma.driver.findUnique({ where: { id } });
      if (!driver) return;
      await prisma.user.update({
        where: { id: driver.userId },
        data: {
          name,
          login,
          phone,
          ...(password ? { passwordHash: await hashPassword(password) } : {}),
        },
      });
      await prisma.driver.update({
        where: { id },
        data: { licenseNumber, defaultEquipmentId: defaultEquipmentId || null },
      });
    } else {
      const user = await prisma.user.create({
        data: {
          name,
          login,
          phone,
          role: ROLES.DRIVER,
          passwordHash: await hashPassword(password),
        },
      });
      await prisma.driver.create({
        data: { userId: user.id, licenseNumber, defaultEquipmentId: defaultEquipmentId || null },
      });
    }
  } catch (error) {
    if (isUniqueConstraint(error)) {
      redirect(id ? `/drivers?id=${id}&error=login` : "/drivers?error=login");
    }
    throw error;
  }
  revalidatePath("/drivers");
  revalidatePath("/dispatch");
  redirect("/drivers");
}

export async function deleteDriver(id: string) {
  await requireStaff();
  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) redirect("/drivers");

  const staff = await prisma.user.findFirst({
    where: { role: { in: [ROLES.ADMIN, ROLES.MANAGER] }, id: { not: driver.userId } },
    orderBy: { createdAt: "asc" },
  });

  await prisma.$transaction(async (tx) => {
    await tx.order.updateMany({ where: { driverId: id }, data: { driverId: null } });
    if (staff) {
      await tx.order.updateMany({ where: { createdById: driver.userId }, data: { createdById: staff.id } });
    }
    await tx.notification.deleteMany({ where: { userId: driver.userId } });
    await tx.user.delete({ where: { id: driver.userId } });
  });

  revalidatePath("/drivers");
  revalidatePath("/drivers/timesheet");
  revalidatePath("/dispatch");
  revalidatePath("/calendar");
  revalidatePath("/");
  redirect("/drivers");
}

export async function savePrice(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") || "");
  const data = {
    equipmentTypeId: String(formData.get("equipmentTypeId") || ""),
    customerId: String(formData.get("customerId") || "") || null,
    kind: String(formData.get("kind") || ""),
    amount: Number(formData.get("amount") || 0),
    label: String(formData.get("label") || "").trim(),
  };
  if (!data.equipmentTypeId || !data.kind || !data.label) return;
  if (id) await prisma.priceItem.update({ where: { id }, data });
  else await prisma.priceItem.create({ data });
  revalidatePath("/settings/prices");
  return;
}

export async function deletePrice(id: string) {
  await requireStaff();
  await prisma.priceItem.delete({ where: { id } });
  revalidatePath("/settings/prices");
}

export async function saveSmsTemplate(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") || "");
  await prisma.smsTemplate.update({
    where: { id },
    data: {
      name: String(formData.get("name") || ""),
      text: String(formData.get("text") || ""),
    },
  });
  revalidatePath("/settings/sms");
  return;
}

export async function sendTestSms(formData: FormData) {
  await requireStaff();
  const phone = String(formData.get("phone") || "").trim();
  const text = String(formData.get("text") || "").trim() || "Тестовое уведомление Рэдианс-СпецТех";
  if (!phone) return;
  await sendSms({ to: phone, purpose: "TEST", text });
  revalidatePath("/settings/sms");
}

export async function saveStaffUser(formData: FormData) {
  const session = await requireStaff();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const login = String(formData.get("login") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "") || null;
  const role = String(formData.get("role") || "MANAGER");
  const password = String(formData.get("password") || "");
  const isActive = formData.getAll("isActive").includes("on");
  if (!name || !login) return;
  if (!id && !password) return;
  if (role === ROLES.DRIVER || !STAFF_ROLES.includes(role as Role)) return;

  try {
    if (id) {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user || user.role === ROLES.DRIVER) return;
      await prisma.user.update({
        where: { id },
        data: {
          name,
          login,
          phone,
          role,
          isActive: id === session.id ? true : isActive,
          ...(password ? { passwordHash: await hashPassword(password) } : {}),
        },
      });
    } else {
      await prisma.user.create({
        data: {
          name,
          login,
          phone,
          role,
          passwordHash: await hashPassword(password),
        },
      });
    }
  } catch (error) {
    if (isUniqueConstraint(error)) {
      redirect(id ? `/settings/users?id=${id}&error=login` : "/settings/users?error=login");
    }
    throw error;
  }
  revalidatePath("/settings/users");
  redirect("/settings/users");
}

export async function deleteStaffUser(id: string) {
  const session = await requireStaff();
  if (id === session.id) {
    redirect("/settings/users?error=self");
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role === ROLES.DRIVER) {
    redirect("/settings/users");
  }

  const remaining = await prisma.user.count({
    where: { role: { in: STAFF_ROLES }, id: { not: id } },
  });
  if (remaining === 0) {
    redirect("/settings/users?error=last");
  }

  const replacement = await prisma.user.findFirst({
    where: { role: { in: STAFF_ROLES }, id: { not: id } },
    orderBy: { createdAt: "asc" },
  });

  await prisma.$transaction(async (tx) => {
    if (replacement) {
      await tx.order.updateMany({ where: { createdById: id }, data: { createdById: replacement.id } });
    }
    await tx.notification.deleteMany({ where: { userId: id } });
    await tx.user.delete({ where: { id } });
  });

  revalidatePath("/settings/users");
  revalidatePath("/");
  redirect("/settings/users");
}
