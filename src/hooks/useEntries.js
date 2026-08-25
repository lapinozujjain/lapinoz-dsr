import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function useEntries(selectedOutlet, dateRange) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    try {
      let q = collection(db, 'daily_entries');
      
      // Apply outlet filter if a specific outlet is selected
      if (selectedOutlet && selectedOutlet !== 'ALL') {
        q = query(q, where('outlet', '==', selectedOutlet));
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          let data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Strict client-side filter fallback in case of mixed documents
          if (selectedOutlet && selectedOutlet !== 'ALL') {
            data = data.filter((item) => item.outlet === selectedOutlet || item.outletId === selectedOutlet);
          }

          // Filter by date range if provided
          if (dateRange?.startDate && dateRange?.endDate) {
            data = data.filter((item) => {
              const entryDate = item.date;
              return entryDate >= dateRange.startDate && entryDate <= dateRange.endDate;
            });
          }

          // Sort by date descending
          data.sort((a, b) => new Date(b.date) - new Date(a.date));

          setEntries(data);
          setLoading(false);
        },
        (err) => {
          console.error("Error fetching entries:", err);
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error(err);
      setError(err);
      setLoading(false);
    }
  }, [selectedOutlet, dateRange?.startDate, dateRange?.endDate]);

  return { entries, loading, error };
}