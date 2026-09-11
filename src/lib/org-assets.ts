import fs from "fs";
import path from "path";

export function orgDataRoot() {
  const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
  const match = dbUrl.match(/^file:(.+)$/);
  const dbPath = match ? match[1] : "./prisma/dev.db";
  return path.dirname(path.resolve(dbPath));
}

export function orgAssetsDir(orgId: string) {
  return path.join(orgDataRoot(), "org-assets", orgId);
}

export function orgAssetPath(orgId: string, filename: string) {
  return path.join(orgAssetsDir(orgId), filename);
}

export function fileUrlForPdf(absPath: string) {
  const normalized = absPath.replace(/\\/g, "/");
  return normalized.startsWith("/") ? `file://${normalized}` : `file:///${normalized}`;
}

export function resolveOrgFacsimile(org: {
  id: string;
  signatureFile?: string | null;
  stampFile?: string | null;
}) {
  const signaturePath = org.signatureFile ? orgAssetPath(org.id, org.signatureFile) : null;
  const stampPath = org.stampFile ? orgAssetPath(org.id, org.stampFile) : null;
  return {
    signatureSrc:
      signaturePath && fs.existsSync(signaturePath) ? fileUrlForPdf(signaturePath) : null,
    stampSrc: stampPath && fs.existsSync(stampPath) ? fileUrlForPdf(stampPath) : null,
  };
}

export const FACSIMILE_MAX_BYTES = 2 * 1024 * 1024;
export const FACSIMILE_TYPES = new Set(["image/png", "image/webp"]);
