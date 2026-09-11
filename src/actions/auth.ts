"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  clearSession,
  createSession,
  hashPassword,
  login,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { ROLES, type Role } from "@/lib/constants";

export type ProfileActionState = { error?: string; ok?: boolean } | null;

export async function loginAction(_prev: unknown, formData: FormData) {
  const loginValue = String(formData.get("login") || "");
  const password = String(formData.get("password") || "");
  if (!loginValue || !password) {
    return { error: "Введите логин и пароль" };
  }
  const result = await login(loginValue, password);
  if ("error" in result && result.error) return { error: result.error };
  if (result.role === ROLES.DRIVER) redirect("/driver");
  redirect("/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export async function updateProfileAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const session = await requireUser();
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");

  if (!name) return { error: "Укажите ФИО" };

  const dbUser = await prisma.user.findUnique({
    where: { id: session.id },
    include: { driver: true },
  });
  if (!dbUser) return { error: "Пользователь не найден" };

  if (newPassword) {
    if (newPassword.length < 6) return { error: "Пароль не короче 6 символов" };
    if (!currentPassword) return { error: "Введите текущий пароль" };
    const ok = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!ok) return { error: "Неверный текущий пароль" };
  }

  const updated = await prisma.user.update({
    where: { id: session.id },
    data: {
      name,
      phone,
      ...(newPassword ? { passwordHash: await hashPassword(newPassword) } : {}),
    },
    include: { driver: true },
  });

  await createSession({
    id: updated.id,
    login: updated.login,
    name: updated.name,
    role: updated.role as Role,
    phone: updated.phone,
    driverId: updated.driver?.id,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
