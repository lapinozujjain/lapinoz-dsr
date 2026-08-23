import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, INVENTORY_MASTER_COLLECTION, INVENTORY_DAILY_COLLECTION } from '../firebase';
import { getOneYearAgo } from '../utils/date';

export function useInventoryMaster(user, outlet) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, INVENTORY_MASTER_COLLECTION),
      where('outlet', '==', outlet)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(docs);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching inventory master:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, outlet]);

  return { items, loading };
}

export function useInventoryDailyRecords(user, outlet) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRecords([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, INVENTORY_DAILY_COLLECTION),
      where('outlet', '==', outlet),
      where('date', '>=', getOneYearAgo())
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecords(docs);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching daily inventory records:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, outlet]);

  return { records, loading };
}