import { prisma } from "@/lib/db";

/** Регистронезависимый поиск по заявкам (SQLite lower + LIKE). */
export async function orderIdsMatchingSearch(term: string): Promise<string[] | null> {
  const q = term.trim();
  if (!q) return null;

  const pattern = `%${q.toLowerCase()}%`;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT DISTINCT o.id
    FROM "Order" o
    LEFT JOIN "Customer" c ON c.id = o.customerId
    LEFT JOIN "Driver" d ON d.id = o.driverId
    LEFT JOIN "User" u ON u.id = d.userId
    LEFT JOIN "Equipment" e ON e.id = o.equipmentId
    LEFT JOIN "EquipmentType" et ON et.id = o.equipmentTypeId
    LEFT JOIN "Invoice" inv ON inv.orderId = o.id
    LEFT JOIN "Act" a ON a.orderId = o.id
    WHERE lower(o.number) LIKE ${pattern}
       OR lower(o.address) LIKE ${pattern}
       OR lower(COALESCE(o.siteContact, '')) LIKE ${pattern}
       OR lower(COALESCE(o.sitePhone, '')) LIKE ${pattern}
       OR lower(COALESCE(o.comment, '')) LIKE ${pattern}
       OR lower(c.name) LIKE ${pattern}
       OR lower(COALESCE(c.phone, '')) LIKE ${pattern}
       OR lower(COALESCE(c.inn, '')) LIKE ${pattern}
       OR lower(COALESCE(u.name, '')) LIKE ${pattern}
       OR lower(COALESCE(u.phone, '')) LIKE ${pattern}
       OR lower(COALESCE(e.name, '')) LIKE ${pattern}
       OR lower(COALESCE(e.plateNumber, '')) LIKE ${pattern}
       OR lower(et.name) LIKE ${pattern}
       OR lower(COALESCE(inv.number, '')) LIKE ${pattern}
       OR lower(COALESCE(a.number, '')) LIKE ${pattern}
  `;

  return rows.map((row) => row.id);
}
