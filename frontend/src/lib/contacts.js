const utf8 = new TextDecoder("utf-8");

function decodeQP(s) {
  const bytes = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "=" && /^[0-9A-F]{2}$/i.test(s.slice(i + 1, i + 3))) {
      bytes.push(parseInt(s.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(...new TextEncoder().encode(s[i]));
    }
  }
  return utf8.decode(new Uint8Array(bytes));
}

const value = (line) => {
  const v = line.slice(line.indexOf(":") + 1).trim();
  return /ENCODING=QUOTED-PRINTABLE/i.test(line.slice(0, line.indexOf(":"))) ? decodeQP(v) : v;
};

export function parseVCF(text) {
  const unfolded = text.replace(/\r\n/g, "\n").replace(/=\n/g, "").replace(/\n[ \t]/g, "");
  return unfolded.split(/BEGIN:VCARD/i).slice(1).map((card) => {
    const lines = card.split("\n");
    const fn = lines.find((l) => /^FN[;:]/i.test(l));
    const n = lines.find((l) => /^N[;:]/i.test(l));
    const tel = lines.find((l) => /^(item\d+\.)?TEL[;:]/i.test(l));
    let name = fn ? value(fn) : "";
    if (!name && n) name = value(n).split(";").filter(Boolean).reverse().join(" ");
    return { name: name.replace(/\\,/g, ",").trim(), phone: tel ? value(tel).replace(/^tel:/i, "") : "" };
  }).filter((c) => c.phone);
}

function parseCSVRows(text) {
  const rows = [];
  let row = [];
  let f = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
    } else if (c === '"') q = true;
    else if (c === "," || c === ";") { row.push(f); f = ""; }
    else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; }
    else if (c !== "\r") f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}

export function parseCSV(text) {
  const [header = [], ...rows] = parseCSVRows(text.replace(/^\uFEFF/, ""));
  const find = (re) => header.findIndex((h) => re.test(h.trim()));
  const iName = find(/^(name|nome)$/i);
  const iFirst = find(/^(first name|given name|primeiro nome|nome)$/i);
  const iMid = find(/^(middle name|additional name|nome do meio)$/i);
  const iLast = find(/^(last name|family name|sobrenome)$/i);
  let iPhone = find(/(phone|telefone).*(value|valor)/i);
  if (iPhone < 0) iPhone = find(/phone|telefone|celular|whatsapp/i);
  if (iPhone < 0) return [];
  return rows.map((r) => {
    const name = iName >= 0 && r[iName] ? r[iName] : [iFirst, iMid, iLast].filter((i) => i >= 0).map((i) => r[i]).filter(Boolean).join(" ");
    const phone = (r[iPhone] || "").split(":::")[0].trim();
    return { name: (name || "").trim(), phone };
  }).filter((c) => c.phone);
}

export async function parseContactsFile(file) {
  const text = await file.text();
  return /BEGIN:VCARD/i.test(text) ? parseVCF(text) : parseCSV(text);
}

export const pickerSupported = () => typeof navigator !== "undefined" && "contacts" in navigator && "select" in navigator.contacts;

export async function pickFromPhone() {
  const res = await navigator.contacts.select(["name", "tel"], { multiple: true });
  return (res || []).map((r) => ({ name: r.name?.[0] || "", phone: r.tel?.[0] || "" })).filter((c) => c.phone);
}
