import { useMemo, useState } from 'react';
import { getFirstDayOfMonth, getToday } from '../utils/date';

// Previously this exact block (state + filter) was copy-pasted into both
// Dashboard and HistoryView. Centralizing it means a fix or a feature
// (e.g. "last 7 days" presets) only needs to happen once.
export function useDateRangeFilter(entries) {
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getToday());

  const filteredEntries = useMemo(
    () => entries.filter(e => e.date >= startDate && e.date <= endDate),
    [entries, startDate, endDate]
  );

  return { startDate, setStartDate, endDate, setEndDate, filteredEntries };
}
