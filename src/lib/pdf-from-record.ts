import type { PdfDoc, PdfOrg, PdfParty } from "./pdf-docs";
import { storedDocVatRate } from "./pricing-shared";
import { resolvePaymentPurpose, defaultPaymentPurpose } from "./invoice-purpose";
import { resolveOrgFacsimile } from "./org-assets";

type OrgFields = {
  id: string;
  name: string;
  inn: string;
  kpp: string | null;
  ogrn?: string | null;
  legalAddress: string;
  phone?: string | null;
  email?: string | null;
  bankName: string;
  bik: string;
  account: string;
  corrAccount: string;
  directorName: string;
  directorTitle: string;
  vatRate: number;
  signatureFile?: string | null;
  stampFile?: string | null;
};

export function orgToPdf(org: OrgFields): PdfOrg {
  const facsimile = resolveOrgFacsimile(org);
  return {
    name: org.name,
    inn: org.inn,
    kpp: org.kpp,
    ogrn: org.ogrn,
    legalAddress: org.legalAddress,
    phone: org.phone,
    email: org.email,
    bankName: org.bankName,
    bik: org.bik,
    account: org.account,
    corrAccount: org.corrAccount,
    directorName: org.directorName,
    directorTitle: org.directorTitle,
    signatureSrc: facsimile.signatureSrc,
    stampSrc: facsimile.stampSrc,
  };
}

export function customerToPdf(customer: {
  name: string;
  inn?: string | null;
  kpp?: string | null;
  address?: string | null;
}): PdfParty {
  return {
    name: customer.name,
    inn: customer.inn,
    kpp: customer.kpp,
    address: customer.address,
  };
}

export function linesFromJson(raw: string): PdfDoc["lines"] {
  try {
    const parsed = JSON.parse(raw) as PdfDoc["lines"];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function buildPdfDoc(input: {
  title: string;
  number: string;
  issuedAt: Date;
  organization: OrgFields;
  customer: { name: string; inn?: string | null; kpp?: string | null; address?: string | null };
  basis: string;
  workAddress?: string | null;
  lines: PdfDoc["lines"];
  vatAmount: number;
  amount: number;
  vatRate?: number | null;
  paymentMethod: string;
  paymentPurpose?: string | null;
}): PdfDoc {
  const vatRate = storedDocVatRate({
    vatRate: input.vatRate,
    vatAmount: input.vatAmount,
    amount: input.amount,
    paymentMethod: input.paymentMethod,
    orgVatRate: input.organization.vatRate,
  });
  const fallbackPurpose = defaultPaymentPurpose({
    invoiceNumber: input.number,
    issuedAt: input.issuedAt,
    orderNumber: input.basis.replace(/^Заявка\s+/i, ""),
    total: input.amount,
    vatRate,
  });
  return {
    title: input.title,
    number: input.number,
    issuedAt: input.issuedAt,
    org: orgToPdf(input.organization),
    customer: customerToPdf(input.customer),
    basis: input.basis,
    paymentPurpose: resolvePaymentPurpose(input.paymentPurpose, fallbackPurpose),
    workAddress: input.workAddress,
    lines: input.lines,
    vatRate,
    vatAmount: input.vatAmount,
    total: input.amount,
  };
}

export function sampleDocLines(vatRate: number): { lines: PdfDoc["lines"]; vatAmount: number; total: number } {
  const lines: PdfDoc["lines"] = [
    { name: "Подача техники, город", qty: 1, unit: "подача", price: 3500, sum: 3500 },
    { name: "Работа спецтехники (моточас)", qty: 8, unit: "час", price: 2800, sum: 22400 },
  ];
  const subtotal = lines.reduce((sum, line) => sum + line.sum, 0);
  const vatAmount = vatRate > 0 ? Math.round((subtotal * vatRate) / 100 * 100) / 100 : 0;
  return { lines, vatAmount, total: subtotal + vatAmount };
}
