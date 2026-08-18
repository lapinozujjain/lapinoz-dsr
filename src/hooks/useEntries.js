import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db, ENTRIES_COLLECTION } from '../firebase';
import { getOneYearAgo } from '../utils/date';

// Live-subscribes to DSR entries from the last 1 year, newest first.
// Bounding the query keeps the realtime listener (and the amount of data
// synced to every open tab) from growing without limit as the restaurant
// accumulates years of history. Reports further back than a year aren't
// reachable from the UI right now — if that's ever needed, this query
// (and the date-range picker's min date) is the place to change it.
export function useEntries(user) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEntries([]);
      return;
    }

    const q = query(
      collection(db, ENTRIES_COLLECTION),
      where('date', '>=', getOneYearAgo()),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching data:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { entries, loading };
}
