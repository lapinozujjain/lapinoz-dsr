import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, ENTRIES_COLLECTION } from '../firebase';

// Live-subscribes to all DSR entries, newest first.
// Note: the Firestore query already orders by date desc — the old code
// then re-sorted the same array again in JS on every snapshot, which was
// redundant work with no effect on the result.
export function useEntries(user) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEntries([]);
      return;
    }

    const q = query(collection(db, ENTRIES_COLLECTION), orderBy('date', 'desc'));

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
