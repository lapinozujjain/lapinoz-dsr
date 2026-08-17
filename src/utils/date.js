export const getFirstDayOfMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
};

export const getToday = () => new Date().toISOString().split('T')[0];

// Rounds and formats a rupee amount consistently everywhere in the app,
// so we never render floating point noise like ₹1234.500000000002.
export const formatCurrency = (value) => `₹${Math.round(value || 0).toLocaleString('en-IN')}`;
