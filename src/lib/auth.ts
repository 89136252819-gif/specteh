import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { AUDIT_VIEWER_NAME, ROLES, STAFF_ROLES, type Role } from "./constants";

const COOKIE = "spetsteh_session";

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-in-production-spetsteh-2026");
}

export type SessionUser = {
  id: string;
  login: string;
  name: string;
  role: Role;
  phone: string | null;
  driverId?: string;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: (process.env.APP_URL || "").startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  const dbUser =
    (await prisma.user.findUnique({ where: { id: session.id }, include: { driver: true } })) ||
    (await prisma.user.findUnique({ where: { login: session.login }, include: { driver: true } }));
  if (!dbUser || !dbUser.isActive) {
    await clearSession();
    redirect("/login");
  }
  return {
    id: dbUser.id,
    login: dbUser.login,
    name: dbUser.name,
    role: dbUser.role as Role,
    phone: dbUser.phone,
    driverId: dbUser.driver?.id,
  } satisfies SessionUser;
}

export async function requireStaff() {
  const session = await requireUser();
  if (!STAFF_ROLES.includes(session.role)) redirect("/driver");
  return session;
}

export function canViewAuditLog(user: Pick<SessionUser, "name">) {
  return user.name.trim() === AUDIT_VIEWER_NAME;
}

export async function requireAuditViewer() {
  const session = await requireStaff();
  if (!canViewAuditLog(session)) redirect("/");
  return session;
}

export async function requireRoles(roles: Role[]) {
  const session = await requireUser();
  if (!roles.includes(session.role)) {
    if (session.role === ROLES.DRIVER) redirect("/driver");
    redirect("/");
  }
  return session;
}

export async function requireDriver() {
  const session = await requireUser();
  if (session.role !== ROLES.DRIVER) redirect("/");
  const driver = await prisma.driver.findUnique({ where: { userId: session.id } });
  if (!driver) redirect("/login");
  return { ...session, driverId: driver.id };
}

export async function login(login: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { login: login.trim().toLowerCase() },
    include: { driver: true },
  });
  if (!user || !user.isActive) return { error: "Неверный логин или пароль" };
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { error: "Неверный логин или пароль" };

  await createSession({
    id: user.id,
    login: user.login,
    name: user.name,
    role: user.role as Role,
    phone: user.phone,
    driverId: user.driver?.id,
  });

  return { ok: true, role: user.role as Role };
}
