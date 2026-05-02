const CSV_HEADER_ALIASES = {
  date: ["date", "transaction date", "posted date"],
  merchant: ["merchant", "payee", "name", "vendor"],
  amount: ["amount", "total", "value"],
  type: ["type", "transaction type"],
  category: ["category"],
  notes: ["notes", "note", "memo"],
};

const splitCSVLine = (line) => {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const normalizeHeader = (header) => {
  const clean = String(header || "").replace(/^\uFEFF/, "").trim().toLowerCase();

  for (const [canonical, aliases] of Object.entries(CSV_HEADER_ALIASES)) {
    if (aliases.includes(clean)) return canonical;
  }

  return clean;
};

const parseAmount = (rawAmount) => {
  const normalized = String(rawAmount || "").replace(/[^0-9.-]/g, "");
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? Math.abs(amount) : NaN;
};

const parseCSV = (csvString) => {
  const normalizedCsv = String(csvString || "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalizedCsv.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map(normalizeHeader);
  const requiredHeaders = ["date", "merchant", "amount", "type"];
  const hasRequiredHeaders = requiredHeaders.every((header) => headers.includes(header));
  if (!hasRequiredHeaders) return [];

  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || "";
    });

    const amount = parseAmount(row.amount);
    const type = String(row.type || "").trim().toLowerCase();
    const date = row.date ? new Date(row.date) : new Date();

    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (!["income", "expense"].includes(type)) continue;
    if (Number.isNaN(date.getTime())) continue;

    rows.push({
      amount,
      type,
      merchant: String(row.merchant || "").trim(),
      category: String(row.category || "").trim(),
      date,
      notes: String(row.notes || "").trim(),
    });
  }

  return rows;
};

module.exports = { parseCSV };
