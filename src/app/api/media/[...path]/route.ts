import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

function uploadsRoot() {
  return path.resolve(process.cwd(), "public", "uploads");
}

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const parts = (await ctx.params).path || [];
  if (!parts.length || parts.some((part) => !part || part === "." || part === ".." || part.includes("/") || part.includes("\\"))) {
    return new NextResponse("Не найдено", { status: 404 });
  }
  const root = uploadsRoot();
  const file = path.resolve(root, ...parts);
  const rel = path.relative(root, file);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel) || !existsSync(file)) {
    return new NextResponse("Не найдено", { status: 404 });
  }
  const ext = path.extname(file).slice(1).toLowerCase();
  const data = await readFile(file);
  return new NextResponse(Uint8Array.from(data), {
    headers: {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
