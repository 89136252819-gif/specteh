import fs from "fs";
import path from "path";
import { orgDataRoot } from "@/lib/org-assets";

export const VAT_INVOICE_MAX_BYTES = 10 * 1024 * 1024;

export function vatInvoiceDir(orderId: string) {
  return path.join(orgDataRoot(), "vat-invoices", orderId);
}

export function vatInvoicePath(orderId: string, storedName: string) {
  const safe = path.basename(storedName);
  if (!safe || safe !== storedName || safe === "." || safe === "..") return null;
  return path.join(vatInvoiceDir(orderId), safe);
}

export function saveVatInvoiceFile(orderId: string, storedName: string, bytes: Buffer) {
  const dir = vatInvoiceDir(orderId);
  fs.mkdirSync(dir, { recursive: true });
  const file = vatInvoicePath(orderId, storedName);
  if (!file) throw new Error("Некорректное имя файла");
  fs.writeFileSync(file, bytes);
  return file;
}

export function isPdf(bytes: Buffer, fileName: string) {
  const namedPdf = fileName.toLowerCase().endsWith(".pdf");
  const header = bytes.subarray(0, 5).toString("utf8") === "%PDF-";
  return namedPdf && header;
}
