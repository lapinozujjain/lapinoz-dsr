export const OPENING_CASH_BALANCE = 5100;
export const CASH_DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];
export const DEFAULT_DENOMINATION_STATE = Object.fromEntries(
  CASH_DENOMINATIONS.map(d => [d, ''])
);

export const EXPENSE_CATEGORIES = [
  'Groceries & Dairy', 'Staff-Expense', 'Petrol', 'Maintenance',
  'Advertisement', 'Salary', 'Stationary', 'Freight', 'Other'
];
