import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StaffDirectory } from "@/components/staff-directory";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; error?: string }>;
}) {
  const session = await requireStaff();
  const { id, error } = await searchParams;
  const users = await prisma.user.findMany({
    where: { role: { not: "DRIVER" } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Сотрудники"
        subtitle="Учётные записи диспетчерской: роль, доступ и пароль меняются в карточке сотрудника."
      />
      <StaffDirectory
        currentUserId={session.id}
        initialId={id}
        loginError={error === "login"}
        removeError={error === "self" ? "self" : error === "last" ? "last" : undefined}
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          login: user.login,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
        }))}
      />
    </div>
  );
}
