// Minimal quote-aware CSV line parser. Handles quoted fields that contain
// commas and "" escaped quotes -- matching how entryToCsvRow() below
// escapes the comment field. A naive `line.split(',')` (the old approach)
// breaks the moment a comment contains a comma.
export function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export const CSV_HEADERS = [
  "Date", "Total Sale", "POS (UPI/CC)", "Swiggy",
  "Zomato Online", "Zomato Cash", "Uengage Online", "Uengage Cash",
  "Counter Cash Sale", "Expenses", "Physical Cash (W/O Deposit)",
  "Short/Excess", "Comments"
];

export function entryToCsvRow(entry, openingBalance) {
  const physicalWithoutDeposit = (entry.physicalCash || 0) - openingBalance;
  return [
    entry.date,
    entry.totalSale || 0,
    entry.sales?.pos || 0,
    entry.sales?.swiggy || 0,
    entry.sales?.zomatoOnline || 0,
    entry.sales?.zomatoCash || 0,
    entry.sales?.uengageOnline || 0,
    entry.sales?.uengageCash || 0,
    entry.sales?.cash || 0,
    entry.totalExpense || 0,
    physicalWithoutDeposit,
    entry.difference || 0,
    `"${(entry.comment || '').replace(/"/g, '""')}"`
  ].join(',');
}

// Parses a CSV produced by exportToCSV. Using the app's own format (instead
// of guessing at a different "legacy" 15+ column layout) means an exported
// file can always be re-imported cleanly.
export function parseDsrCsv(text, openingBalance) {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const entries = [];

  // Row 0 is the header — skip it.
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (row.length < 13) continue;

    const date = row[0].trim();
    if (!dateRegex.test(date)) continue;

    const num = (v) => parseFloat(v) || 0;
    const pos = num(row[2]);
    const swiggy = num(row[3]);
    const zomatoOnline = num(row[4]);
    const zomatoCash = num(row[5]);
    const uengageOnline = num(row[6]);
    const uengageCash = num(row[7]);
    const cash = num(row[8]);
    const totalExpense = num(row[9]);
    const physicalWithoutDeposit = num(row[10]);
    const comment = (row[12] || '').trim();

    entries.push({
      date,
      totalSale: num(row[1]),
      comment,
      sales: { pos, swiggy, zomatoOnline, zomatoCash, uengageOnline, uengageCash, cash },
      expenses: totalExpense > 0 ? [{ description: 'Imported (from CSV)', amount: totalExpense }] : [],
      denominations: {},
      totalExpense,
      openingBalance,
      cashInHand: cash + uengageCash + zomatoCash - totalExpense + openingBalance,
      physicalCash: physicalWithoutDeposit + openingBalance,
      difference: num(row[11]),
    });
  }
  return entries;
}
