const pad = (n) => String(n).padStart(2, '0');

// Formats a Date using its LOCAL calendar fields (Y-M-D), never touching
// UTC. This is the fix for the "first day of month shows as last day of
// last month" bug: the old code did
//   new Date(year, month, 1).toISOString().split('T')[0]
// — toISOString() always converts to UTC first. For any timezone ahead of
// UTC (e.g. India, UTC+5:30), local midnight on the 1st is still the
// previous day in UTC, so the date silently rolled back by one. Building
// the string from local getFullYear/getMonth/getDate avoids that
// conversion entirely.
export const formatLocalDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const getFirstDayOfMonth = () => {
  const date = new Date();
  return formatLocalDate(new Date(date.getFullYear(), date.getMonth(), 1));
};

export const getToday = () => formatLocalDate(new Date());

// One year back from today — used to bound both the Firestore query
// (useEntries) and the date-range picker's earliest selectable date, so
// they stay in sync.
export const getOneYearAgo = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return formatLocalDate(date);
};

export const getYesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return formatLocalDate(date);
};

// Both the DSR and the stock closing are normally filled in for
// "today", but in practice they're usually finalized the NEXT
// morning once the day's numbers are settled — so on the 1st of a
// new month, yesterday (the last day of the previous month) still
// needs to be enterable, even though it falls outside the current
// calendar month. Everything before that stays out of bounds, so
// this only ever opens up one extra day, not unrestricted backdating.
// Returns whichever is earlier: the first of the current month, or
// yesterday's date (a plain string comparison works since both are
// zero-padded ISO 'YYYY-MM-DD').
export const getEntryMinDate = () => {
  const monthStart = getFirstDayOfMonth();
  const yesterday = getYesterday();
  return yesterday < monthStart ? yesterday : monthStart;
};

// Rounds and formats a rupee amount consistently everywhere in the app,
// so we never render floating point noise like ₹1234.500000000002.
export const formatCurrency = (value) => `₹${Math.round(value || 0).toLocaleString('en-IN')}`;
