import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";
import { moneyPlain, formatDate } from "./utils";
import { rublesInWords } from "./money-words";

const fontDir = path.join(process.cwd(), "src", "fonts");
const logoPath = path.join(process.cwd(), "public", "logo.png");

Font.register({
  family: "Roboto",
  fonts: [
    { src: path.join(fontDir, "Roboto-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontDir, "Roboto-Bold.ttf"), fontWeight: 700 },
  ],
});

const s = StyleSheet.create({
  page: { paddingTop: 28, paddingHorizontal: 36, paddingBottom: 32, fontFamily: "Roboto", fontSize: 9, color: "#111" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  logo: { width: 48, height: 48, borderRadius: 24 },
  brand: { fontSize: 11, fontWeight: 700 },
  brandSub: { fontSize: 8, color: "#64748b", marginTop: 2 },
  title: { fontSize: 13, fontWeight: 700, marginTop: 12, marginBottom: 8 },
  box: { borderWidth: 1, borderColor: "#111" },
  boxRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#111" },
  boxRowLast: { flexDirection: "row" },
  cell: { padding: 4, justifyContent: "center" },
  cellBorderR: { borderRightWidth: 1, borderRightColor: "#111" },
  tiny: { fontSize: 7, color: "#444" },
  partyLabel: { width: 78, color: "#444", paddingTop: 1 },
  partyValue: { flex: 1, fontWeight: 700, lineHeight: 1.35 },
  partyBlock: { marginBottom: 6 },
  tableHead: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#111",
    backgroundColor: "#f1f5f9",
    fontWeight: 700,
  },
  tableRow: { flexDirection: "row", borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#111" },
  th: { paddingVertical: 4, paddingHorizontal: 3, borderRightWidth: 1, borderRightColor: "#111" },
  td: { paddingVertical: 4, paddingHorizontal: 3, borderRightWidth: 1, borderRightColor: "#111" },
  c1: { width: "7%" },
  c2: { width: "41%" },
  c3: { width: "12%" },
  c4: { width: "10%" },
  c5: { width: "15%" },
  c6: { width: "15%" },
  lastCol: { borderRightWidth: 0 },
  right: { textAlign: "right" },
  totals: { marginTop: 8, alignItems: "flex-end" },
  totalLine: { flexDirection: "row", width: 260, justifyContent: "space-between", marginBottom: 2 },
  words: { marginTop: 10, lineHeight: 1.4 },
  note: { marginTop: 8, fontSize: 8, color: "#334155", lineHeight: 1.35 },
  footer: { marginTop: 22, flexDirection: "row", justifyContent: "space-between" },
  sign: { width: "48%" },
  signLine: { marginTop: 16, borderBottomWidth: 0.6, borderBottomColor: "#111", paddingBottom: 2 },
  signWrap: { position: "relative", marginTop: 8, minHeight: 34 },
  signatureImg: { position: "absolute", left: 28, bottom: -2, width: 118, height: 42, objectFit: "contain" },
  stampImg: { position: "absolute", left: 4, bottom: -10, width: 78, height: 78, objectFit: "contain", opacity: 0.94 },
  muted: { color: "#64748b", marginTop: 3, fontSize: 8 },
});

export type PdfOrg = {
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
  signatureSrc?: string | null;
  stampSrc?: string | null;
};

export type PdfParty = {
  name: string;
  inn?: string | null;
  kpp?: string | null;
  address?: string | null;
};

export type PdfDoc = {
  title: string;
  number: string;
  issuedAt: Date;
  org: PdfOrg;
  customer: PdfParty;
  basis: string;
  paymentPurpose?: string | null;
  workAddress?: string | null;
  lines: { name: string; qty: number; unit: string; price: number; sum: number }[];
  vatRate: number;
  vatAmount: number;
  total: number;
};

function orgLine(org: PdfOrg) {
  const bits = [
    org.name,
    `ИНН ${org.inn}`,
    org.kpp ? `КПП ${org.kpp}` : null,
    org.ogrn ? `ОГРН ${org.ogrn}` : null,
    org.legalAddress,
    org.phone ? `тел. ${org.phone}` : null,
    org.email,
  ].filter(Boolean);
  return bits.join(", ");
}

function customerLine(party: PdfParty) {
  const bits = [
    party.name,
    party.inn ? `ИНН ${party.inn}` : null,
    party.kpp ? `КПП ${party.kpp}` : null,
    party.address,
  ].filter(Boolean);
  return bits.join(", ");
}

function logoSrc() {
  const normalized = logoPath.replace(/\\/g, "/");
  return normalized.startsWith("/") ? `file://${normalized}` : `file:///${normalized}`;
}

function Logo() {
  if (!fs.existsSync(logoPath)) return null;
  return <Image src={logoSrc()} style={s.logo} />;
}

function Header() {
  return (
    <View style={s.header}>
      <Logo />
    </View>
  );
}

function BankBox({ org }: { org: PdfOrg }) {
  return (
    <View style={s.box}>
      <View style={s.boxRow}>
        <View style={[s.cell, s.cellBorderR, { width: "62%", minHeight: 36 }]}>
          <Text>{org.bankName || "—"}</Text>
          <Text style={s.tiny}>Банк получателя</Text>
        </View>
        <View style={{ width: "38%" }}>
          <View style={[s.boxRow, { minHeight: 18 }]}>
            <View style={[s.cell, s.cellBorderR, { width: "28%" }]}>
              <Text style={s.tiny}>БИК</Text>
            </View>
            <View style={[s.cell, { width: "72%" }]}>
              <Text>{org.bik || "—"}</Text>
            </View>
          </View>
          <View style={[s.boxRowLast, { minHeight: 18 }]}>
            <View style={[s.cell, s.cellBorderR, { width: "28%" }]}>
              <Text style={s.tiny}>Сч. №</Text>
            </View>
            <View style={[s.cell, { width: "72%" }]}>
              <Text>{org.corrAccount || "—"}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={s.boxRowLast}>
        <View style={{ width: "62%" }}>
          <View style={[s.boxRow, { minHeight: 18 }]}>
            <View style={[s.cell, s.cellBorderR, { width: "18%" }]}>
              <Text style={s.tiny}>ИНН</Text>
            </View>
            <View style={[s.cell, s.cellBorderR, { width: "32%" }]}>
              <Text>{org.inn}</Text>
            </View>
            <View style={[s.cell, s.cellBorderR, { width: "18%" }]}>
              <Text style={s.tiny}>КПП</Text>
            </View>
            <View style={[s.cell, { width: "32%" }]}>
              <Text>{org.kpp || "—"}</Text>
            </View>
          </View>
          <View style={[s.boxRowLast, { minHeight: 28 }]}>
            <View style={[s.cell, { width: "100%" }]}>
              <Text>{org.name}</Text>
              <Text style={s.tiny}>Получатель</Text>
            </View>
          </View>
        </View>
        <View style={[s.cell, { width: "38%", borderLeftWidth: 1, borderLeftColor: "#111" }]}>
          <Text style={s.tiny}>Сч. №</Text>
          <Text>{org.account || "—"}</Text>
        </View>
      </View>
    </View>
  );
}

function Parties({ doc, supplierLabel }: { doc: PdfDoc; supplierLabel: string }) {
  return (
    <View>
      <View style={s.partyBlock}>
        <View style={{ flexDirection: "row" }}>
          <Text style={s.partyLabel}>{supplierLabel}:</Text>
          <Text style={s.partyValue}>{orgLine(doc.org)}</Text>
        </View>
      </View>
      <View style={s.partyBlock}>
        <View style={{ flexDirection: "row" }}>
          <Text style={s.partyLabel}>Заказчик:</Text>
          <Text style={s.partyValue}>{customerLine(doc.customer)}</Text>
        </View>
      </View>
      <View style={s.partyBlock}>
        <View style={{ flexDirection: "row" }}>
          <Text style={s.partyLabel}>Основание:</Text>
          <Text style={s.partyValue}>{doc.basis}</Text>
        </View>
      </View>
      {doc.workAddress ? (
        <View style={s.partyBlock}>
          <View style={{ flexDirection: "row" }}>
            <Text style={s.partyLabel}>Объект:</Text>
            <Text style={s.partyValue}>{doc.workAddress}</Text>
          </View>
        </View>
      ) : null}
      {doc.paymentPurpose ? (
        <View style={s.partyBlock}>
          <View style={{ flexDirection: "row" }}>
            <Text style={s.partyLabel}>Назначение платежа:</Text>
            <Text style={s.partyValue}>{doc.paymentPurpose}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Lines({ doc }: { doc: PdfDoc }) {
  const subtotal = Math.max(doc.total - doc.vatAmount, 0);
  return (
    <>
      <View style={s.tableHead}>
        <Text style={[s.th, s.c1]}>№</Text>
        <Text style={[s.th, s.c2]}>Наименование работ, услуг</Text>
        <Text style={[s.th, s.c3, s.right]}>Кол-во</Text>
        <Text style={[s.th, s.c4, s.right]}>Ед.</Text>
        <Text style={[s.th, s.c5, s.right]}>Цена</Text>
        <Text style={[s.th, s.c6, s.right, s.lastCol]}>Сумма</Text>
      </View>
      {doc.lines.map((line, i) => (
        <View key={i} style={s.tableRow}>
          <Text style={[s.td, s.c1]}>{i + 1}</Text>
          <Text style={[s.td, s.c2]}>{line.name}</Text>
          <Text style={[s.td, s.c3, s.right]}>{line.qty}</Text>
          <Text style={[s.td, s.c4, s.right]}>{line.unit}</Text>
          <Text style={[s.td, s.c5, s.right]}>{moneyPlain(line.price)}</Text>
          <Text style={[s.td, s.c6, s.right, s.lastCol]}>{moneyPlain(line.sum)}</Text>
        </View>
      ))}
      <View style={s.totals}>
        <View style={s.totalLine}>
          <Text>Итого</Text>
          <Text>{moneyPlain(doc.vatRate > 0 ? subtotal : doc.total)}</Text>
        </View>
        {doc.vatRate > 0 ? (
          <View style={s.totalLine}>
            <Text>В том числе НДС {doc.vatRate}%</Text>
            <Text>{moneyPlain(doc.vatAmount)}</Text>
          </View>
        ) : (
          <View style={s.totalLine}>
            <Text>НДС</Text>
            <Text>не облагается</Text>
          </View>
        )}
        <View style={s.totalLine}>
          <Text style={{ fontWeight: 700 }}>Всего к оплате</Text>
          <Text style={{ fontWeight: 700 }}>{moneyPlain(doc.total)}</Text>
        </View>
      </View>
      <Text style={s.words}>
        Всего наименований {doc.lines.length}, на сумму {moneyPlain(doc.total)} руб.
        {"\n"}
        {rublesInWords(doc.total)}.
      </Text>
    </>
  );
}

function DirectorSign({ org }: { org: PdfOrg }) {
  return (
    <View style={s.sign}>
      <Text>{org.directorTitle}</Text>
      <View style={s.signWrap}>
        {!org.signatureSrc ? <Text style={s.signLine}> </Text> : null}
        {org.signatureSrc ? <Image src={org.signatureSrc} style={s.signatureImg} /> : null}
      </View>
      <Text style={s.muted}>/ {org.directorName} /</Text>
    </View>
  );
}

function StampSign({ org }: { org: PdfOrg }) {
  return (
    <View style={s.sign}>
      <Text>М.П.</Text>
      <View style={[s.signWrap, { minHeight: 44 }]}>
        {!org.stampSrc ? <Text style={s.signLine}> </Text> : null}
        {org.stampSrc ? <Image src={org.stampSrc} style={s.stampImg} /> : null}
      </View>
    </View>
  );
}

function ExecutorSign({ org, title }: { org: PdfOrg; title: string }) {
  return (
    <View style={s.sign}>
      <Text style={{ fontWeight: 700 }}>{title}</Text>
      <Text style={{ marginTop: 4 }}>{org.directorTitle}</Text>
      <View style={s.signWrap}>
        {!org.signatureSrc ? <Text style={s.signLine}> </Text> : null}
        {org.signatureSrc ? <Image src={org.signatureSrc} style={s.signatureImg} /> : null}
      </View>
      <Text style={s.muted}>/ {org.directorName} /</Text>
      <Text style={[s.muted, { marginTop: 6 }]}>М.П.</Text>
      <View style={[s.signWrap, { minHeight: 44, marginTop: 2 }]}>
        {!org.stampSrc ? <Text style={s.signLine}> </Text> : null}
        {org.stampSrc ? <Image src={org.stampSrc} style={s.stampImg} /> : null}
      </View>
    </View>
  );
}

export function InvoicePdf({ doc }: { doc: PdfDoc }) {
  return (
    <Document title={`Счёт ${doc.number}`}>
      <Page size="A4" style={s.page}>
        <Header />
        <BankBox org={doc.org} />
        <Text style={s.title}>
          Счёт на оплату № {doc.number} от {formatDate(doc.issuedAt)}
        </Text>
        <Parties doc={doc} supplierLabel="Поставщик" />
        <Lines doc={doc} />
        <Text style={s.note}>
          Оплата данного счёта означает согласие с объёмом и стоимостью работ. Счёт действителен в течение 5 банковских
          дней.
        </Text>
        <View style={s.footer}>
          <DirectorSign org={doc.org} />
          <StampSign org={doc.org} />
        </View>
      </Page>
    </Document>
  );
}

export function ActPdf({ doc }: { doc: PdfDoc }) {
  return (
    <Document title={`Акт ${doc.number}`}>
      <Page size="A4" style={s.page}>
        <Header />
        <Text style={s.title}>
          Акт выполненных работ № {doc.number} от {formatDate(doc.issuedAt)}
        </Text>
        <Parties doc={doc} supplierLabel="Исполнитель" />
        <Lines doc={doc} />
        <Text style={s.note}>
          Вышеперечисленные работы (услуги) выполнены полностью и в срок. Заказчик претензий по объёму, качеству и
          срокам оказания услуг не имеет.
        </Text>
        <View style={s.footer}>
          <ExecutorSign org={doc.org} title="Исполнитель" />
          <View style={s.sign}>
            <Text style={{ fontWeight: 700 }}>Заказчик</Text>
            <Text style={{ marginTop: 4 }}>{doc.customer.name}</Text>
            <Text style={s.signLine}> </Text>
            <Text style={s.muted}>/ ________________ /</Text>
            <Text style={s.muted}>М.П.</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
