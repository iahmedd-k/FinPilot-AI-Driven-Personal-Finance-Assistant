/**
 * Parses CSV string into transaction objects.
 * Expected CSV columns: amount, type, merchant, date, notes
 * Example row: 45.00,expense,Starbucks,2024-01-15,Morning coffee
 */
const parseCSV = (csvString) => {
  const lines = csvString.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];          // Need header + at least 1 row

  const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim());
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ""; });

    // Validate required fields
    const amount = parseFloat(row.amount);
    if (isNaN(amount) || amount <= 0) continue;
    if (!["income", "expense"].includes(row.type?.toLowerCase())) continue;

    rows.push({
      amount,
      type: row.type.toLowerCase(),
      merchant: row.merchant || "",
      date: row.date ? new Date(row.date) : new Date(),
      notes: row.notes || "",
    });
  }

  return rows;
};

module.exports = { parseCSV };