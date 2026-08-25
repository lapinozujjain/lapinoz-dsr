import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, INVENTORY_MASTER_COLLECTION, INVENTORY_DAILY_COLLECTION } from '../firebase';

const toRecord = (docSnap) => ({ ...docSnap.data(), id: docSnap.id });

export function useInventoryMaster(user, outlet, enabled = true) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !enabled) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, INVENTORY_MASTER_COLLECTION),
      where('outlet', '==', outlet)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(toRecord));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching inventory master:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, outlet, enabled]);

  return { items, loading };
}

export function useInventoryDailyRecords(user, outlet, enabled = true) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !enabled) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, INVENTORY_DAILY_COLLECTION),
      where('outlet', '==', outlet)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map(toRecord));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching daily inventory records:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, outlet, enabled]);

  return { records, loading };
}