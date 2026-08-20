export const OPENING_CASH_BALANCE = 5100;
export const CASH_DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];
export const DEFAULT_DENOMINATION_STATE = Object.fromEntries(
  CASH_DENOMINATIONS.map(d => [d, ''])
);

export const EXPENSE_CATEGORIES = [
  'Groceries & Dairy', 'Staff-Expense', 'Petrol', 'Maintenance',
  'Advertisement', 'Salary', 'Stationary', 'Freight', 'Other'
];

export const OUTLETS = ['FREEGANJ', 'NANAKHEDA'];

// Entries saved before outlet tagging existed have no `outlet` field.
// Per the decision made when this feature was added, all of that
// historical data is attributed to NANAKHEDA — this constant is the
// single place that assumption lives, so it's easy to find later if it
// ever needs to change (e.g. after a manual data cleanup).
export const DEFAULT_LEGACY_OUTLET = 'NANAKHEDA';

export const OUTLET_STORAGE_KEY = 'dsr_selected_outlet';
