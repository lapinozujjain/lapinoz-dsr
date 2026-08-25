import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db, ENTRIES_COLLECTION } from '../firebase';
import { getOneYearAgo } from '../utils/date';

export function useEntries(user, enabled = true) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !enabled) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, ENTRIES_COLLECTION),
      where('date', '>=', getOneYearAgo()),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching DSR entries:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, enabled]);

  return { entries, loading };
}