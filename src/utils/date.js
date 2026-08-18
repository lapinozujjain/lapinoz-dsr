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

// Rounds and formats a rupee amount consistently everywhere in the app,
// so we never render floating point noise like ₹1234.500000000002.
export const formatCurrency = (value) => `₹${Math.round(value || 0).toLocaleString('en-IN')}`;
