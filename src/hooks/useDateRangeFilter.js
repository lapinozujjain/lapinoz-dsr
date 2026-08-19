import { useMemo, useState } from 'react';
import { getFirstDayOfMonth, getOneYearAgo, getToday } from '../utils/date';

// Two layers of date state:
//  - draftStart/draftEnd: bound directly to the date <input>s, update as
//    the user picks dates.
//  - startDate/endDate: the "applied" range that filteredEntries is
//    actually computed from. Only changes when fetchReports() runs.
// This means typing/selecting a date doesn't immediately re-filter the
// (possibly large) entries list on every change — filtering only happens
// once, when the Fetch button is clicked.
export function useDateRangeFilter(entries) {
  const defaultStart = getFirstDayOfMonth();
  const defaultEnd = getToday();

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [draftStart, setDraftStart] = useState(defaultStart);
  const [draftEnd, setDraftEnd] = useState(defaultEnd);

  const filteredEntries = useMemo(
    () => entries.filter(e => e.date >= startDate && e.date <= endDate),
    [entries, startDate, endDate]
  );

  const fetchReports = () => {
    setStartDate(draftStart);
    setEndDate(draftEnd);
  };

  return {
    startDate, endDate,
    draftStart, draftEnd, setDraftStart, setDraftEnd,
    filteredEntries, fetchReports,
    minDate: getOneYearAgo(),
    // Reports can't be pulled for a date that hasn't happened yet.
    maxDate: getToday(),
  };
}
