import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/constants";
import { orgAssetPath } from "@/lib/org-assets";

const TYPES: Record<string, string> = {
  png: "image/png",
  webp: "image/webp",
};

export async function GET(req: Request, ctx: { params: Promise<{ orgId: string }> }) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role)) {
    return new NextResponse("Нет доступа", { status: 401 });
  }

  const { orgId } = await ctx.params;
  const kind = new URL(req.url).searchParams.get("kind");
  if (kind !== "signature" && kind !== "stamp") {
    return new NextResponse("Не найдено", { status: 404 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { signatureFile: true, stampFile: true },
  });
  if (!org) return new NextResponse("Не найдено", { status: 404 });

  const filename = kind === "signature" ? org.signatureFile : org.stampFile;
  if (!filename) return new NextResponse("Не найдено", { status: 404 });

  const file = orgAssetPath(orgId, filename);
  if (!existsSync(file)) return new NextResponse("Не найдено", { status: 404 });

  const ext = filename.split(".").pop()?.toLowerCase() || "png";
  const data = await readFile(file);
  return new NextResponse(Uint8Array.from(data), {
    headers: {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "Cache-Control": "private, max-age=60",
    },
  });
}
