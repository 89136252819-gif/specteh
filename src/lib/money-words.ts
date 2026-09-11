function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

const ONES_M = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const ONES_F = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const TEENS = [
  "десять",
  "одиннадцать",
  "двенадцать",
  "тринадцать",
  "четырнадцать",
  "пятнадцать",
  "шестнадцать",
  "семнадцать",
  "восемнадцать",
  "девятнадцать",
];
const TENS = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
const HUNDREDS = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

function triad(value: number, feminine: boolean) {
  const ones = feminine ? ONES_F : ONES_M;
  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  const parts: string[] = [];
  if (HUNDREDS[hundred]) parts.push(HUNDREDS[hundred]);
  if (rest >= 10 && rest <= 19) {
    parts.push(TEENS[rest - 10]);
  } else {
    const ten = Math.floor(rest / 10);
    const one = rest % 10;
    if (TENS[ten]) parts.push(TENS[ten]);
    if (ones[one]) parts.push(ones[one]);
  }
  return parts.join(" ");
}

function intToWords(value: number) {
  if (value === 0) return "ноль";
  const groups = [
    { divide: 1_000_000_000, feminine: false, one: "миллиард", few: "миллиарда", many: "миллиардов" },
    { divide: 1_000_000, feminine: false, one: "миллион", few: "миллиона", many: "миллионов" },
    { divide: 1_000, feminine: true, one: "тысяча", few: "тысячи", many: "тысяч" },
  ];
  const parts: string[] = [];
  let rest = value;
  for (const group of groups) {
    const count = Math.floor(rest / group.divide);
    rest %= group.divide;
    if (!count) continue;
    parts.push(`${triad(count, group.feminine)} ${plural(count, group.one, group.few, group.many)}`);
  }
  if (rest) parts.push(triad(rest, false));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function capitalize(text: string) {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

/** 12345.67 → «Двенадцать тысяч триста сорок пять рублей 67 копеек» */
export function rublesInWords(value: number) {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  const rounded = Math.round(safe * 100);
  const rub = Math.floor(rounded / 100);
  const kop = rounded % 100;
  const rubText = `${capitalize(intToWords(rub))} ${plural(rub, "рубль", "рубля", "рублей")}`;
  const kopText = `${String(kop).padStart(2, "0")} ${plural(kop, "копейка", "копейки", "копеек")}`;
  return `${rubText} ${kopText}`;
}
