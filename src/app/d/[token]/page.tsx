import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PdfLink } from "@/components/pdf-link";
import { formatDate, money } from "@/lib/utils";

export default async function PublicDocumentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: { order: { include: { customer: true, act: true } }, organization: true },
  });
  const actByToken = await prisma.act.findUnique({
    where: { publicToken: token },
    include: { order: { include: { customer: true, invoice: true } }, organization: true },
  });

  const invoiceDoc = invoice ?? actByToken?.order.invoice ?? null;
  const actDoc = invoice?.order.act ?? actByToken ?? null;
  if (!invoiceDoc && !actDoc) notFound();

  const customerName = invoice?.order.customer.name || actByToken?.order.customer.name || "";
  const orgName = invoice?.organization.shortName || actByToken?.organization.shortName || "";

  return (
    <div className="page-enter mx-auto min-h-screen max-w-lg px-4 py-10">
      <div className="mb-6 text-center">
        <img alt="Рэдианс" className="mx-auto mb-3 h-16 w-16 rounded-full object-cover" height={64} src="/logo.png?v=3" width={64} />
        <h1 className="text-xl font-semibold">Документы Рэдианс-СпецТех</h1>
        <p className="mt-1 text-sm text-slate-500">
          {orgName} · {customerName}
        </p>
      </div>
      <div className="space-y-3 rounded-2xl border bg-white p-5">
        {invoiceDoc ? (
          <PdfLink
            className="block rounded-xl bg-slate-50 px-4 py-4 font-medium text-slate-800"
            href={`/api/pdf/invoice/${invoiceDoc.publicToken}`}
          >
            Открыть счёт {invoiceDoc.number}
            <div className="text-sm font-normal text-slate-600">
              {formatDate(invoiceDoc.issuedAt)} · {money(invoiceDoc.amount)}
            </div>
          </PdfLink>
        ) : null}
        {actDoc ? (
          <PdfLink
            className="block rounded-xl bg-slate-50 px-4 py-4 font-medium text-slate-800"
            href={`/api/pdf/act/${actDoc.publicToken}`}
          >
            Открыть акт {actDoc.number}
            <div className="text-sm font-normal text-slate-600">{formatDate(actDoc.issuedAt)}</div>
          </PdfLink>
        ) : null}
      </div>
    </div>
  );
}
