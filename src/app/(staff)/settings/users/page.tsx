import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StaffDirectory } from "@/components/staff-directory";
import { canManageStaffUsers } from "@/lib/constants";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; error?: string }>;
}) {
  const session = await requireStaff();
  const canManage = canManageStaffUsers(session.role);
  const { id, error } = await searchParams;
  const users = await prisma.user.findMany({
    where: { role: { not: "DRIVER" } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Сотрудники"
        subtitle={
          canManage
            ? "Учётные записи диспетчерской: роль, доступ и пароль меняются в карточке сотрудника."
            : "Список сотрудников. Добавлять, удалять и менять пароли может только системный администратор."
        }
      />
      <StaffDirectory
        canManage={canManage}
        currentUserId={session.id}
        initialId={canManage ? id : undefined}
        loginError={canManage && error === "login"}
        removeError={
          error === "self"
            ? "self"
            : error === "last"
              ? "last"
              : error === "forbidden"
                ? "forbidden"
                : error === "lastAdmin"
                  ? "lastAdmin"
                  : undefined
        }
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
