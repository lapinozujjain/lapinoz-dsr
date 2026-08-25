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
//
// Outlet filtering happens client-side in App.jsx (see outletEntries),
// not here — this hook always returns every outlet's entries within the
// date window, which is what lets switching outlets be instant with no
// refetch.
//
// `enabled` should be false until the signed-in user's role has been
// confirmed active — otherwise this subscribes immediately on sign-in,
// before App.jsx even knows whether the account is approved, and a
// deactivated/not-yet-approved account hits a Firestore permission
// error in the console for a screen it was never going to see anyway.
export function useEntries(user, enabled = true) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !enabled) {
      setEntries([]);
      setLoading(!!user && !enabled);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, ENTRIES_COLLECTION),
      where('date', '>=', getOneYearAgo()),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Error fetching DSR entries:', err);
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, enabled]);

  return { entries, loading, error };
}
